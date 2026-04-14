"""Rentvine MCP server — exposes Rentvine data as MCP tools for Claude and other AI clients."""
from mcp.server.fastmcp import FastMCP

from rentvine_mcp import client

mcp = FastMCP("rentvine")


@mcp.tool()
async def list_leases() -> list[dict]:
    """List all leases directly from Rentvine (live data).
    Returns lease details including tenant, unit, property, rent amount, and dates.
    Use this to answer questions about lease expirations, rent amounts, or active tenants.
    """
    leases = await client.fetch_leases()
    result = []
    for row in leases:
        lse = row.get("lease") or row
        unit = row.get("unit") or {}
        status_id = str(lse.get("leaseStatusID") or "")
        status = {"1": "future", "2": "active", "3": "expired", "4": "cancelled"}.get(
            status_id, status_id
        )
        tenants = lse.get("tenants") or []
        tenant_name = ", ".join(tenants) if isinstance(tenants, list) else str(tenants)
        result.append(
            {
                "lease_id": lse.get("leaseID"),
                "tenant_name": tenant_name,
                "property_name": unit.get("name") or unit.get("address"),
                "unit_address": unit.get("address"),
                "rent_amount": unit.get("rent"),
                "beds": unit.get("beds"),
                "baths": unit.get("fullBaths"),
                "start_date": lse.get("startDate"),
                "end_date": lse.get("endDate"),
                "status": status,
                "move_in_date": lse.get("moveInDate"),
                "notice_date": lse.get("noticeDate"),
                "expected_move_out": lse.get("expectedMoveOutDate"),
            }
        )
    return result


@mcp.tool()
async def list_units(property_name: str) -> list[dict]:
    """List units for a property directly from Rentvine (live data).
    property_name: the property name as it appears in your Rentvine portfolio.
    Returns unit number, vacancy status, rent amount, and current tenant if occupied.
    """
    properties = await client.fetch_properties()
    prop = next(
        (
            p
            for p in properties
            if (p.get("name") or p.get("propertyName") or "").lower()
            == property_name.lower()
        ),
        None,
    )
    if not prop:
        names = [p.get("name") or p.get("propertyName") for p in properties]
        return [{"error": f"Property '{property_name}' not found. Available: {names}"}]

    rv_prop_id = prop.get("propertyID") or prop.get("id")
    if not rv_prop_id:
        return [{"error": f"Property '{property_name}' has no Rentvine ID."}]

    units = await client.fetch_units(str(rv_prop_id))
    return [
        {
            "unit_number": u.get("number") or u.get("unitNumber"),
            "status": u.get("status"),
            "rent": u.get("rent") or u.get("marketRent"),
            "tenant_name": u.get("tenantName") or u.get("tenant", {}).get("name"),
        }
        for u in units
    ]


@mcp.tool()
async def list_applications() -> list[dict]:
    """List rental applications directly from Rentvine (live data).
    Returns applicant name, property, unit, status, and application date.
    """
    apps = await client.fetch_applications()
    return [
        {
            "applicant_name": a.get("applicantName") or a.get("name"),
            "property_name": a.get("propertyName") or a.get("property", {}).get("name"),
            "unit_number": a.get("unitNumber") or a.get("unit", {}).get("number"),
            "status": a.get("status"),
            "applied_at": a.get("applicationDate") or a.get("createdAt"),
        }
        for a in apps
    ]


@mcp.tool()
async def list_inspections() -> list[dict]:
    """List maintenance inspections directly from Rentvine (live data).
    Returns inspection title, property, unit, scheduled date, status, and inspector.
    """
    inspections = await client.fetch_inspections()
    return [
        {
            "title": i.get("title") or i.get("type"),
            "property_name": i.get("propertyName") or i.get("property", {}).get("name"),
            "unit_number": i.get("unitNumber") or i.get("unit", {}).get("number"),
            "scheduled_date": i.get("scheduledDate") or i.get("date"),
            "status": i.get("status"),
            "inspector": i.get("inspectorName") or i.get("inspector", {}).get("name"),
        }
        for i in inspections
    ]


@mcp.tool()
async def get_tenant_balance(tenant_name: str) -> dict:
    """Get the current ledger balance for a tenant from Rentvine (live data).
    tenant_name: the tenant's full name as it appears in your Rentvine roster.
    Returns balance and ledger data.
    """
    tenants = await client.fetch_tenants()
    tenant = next(
        (
            t
            for t in tenants
            if (t.get("name") or t.get("tenantName") or "").lower()
            == tenant_name.lower()
        ),
        None,
    )
    if not tenant:
        return {"error": f"Tenant '{tenant_name}' not found in Rentvine."}

    rv_tenant_id = tenant.get("tenantID") or tenant.get("id")
    if not rv_tenant_id:
        return {"error": f"Tenant '{tenant_name}' has no Rentvine ID."}

    data = await client.fetch_tenant_balance(str(rv_tenant_id))
    return {"tenant_name": tenant_name, "ledger": data}


@mcp.tool()
async def list_work_orders() -> list[dict]:
    """List all maintenance work orders directly from Rentvine (live data).
    Returns title, property, unit, status, priority, and category.
    """
    work_orders = await client.fetch_work_orders()
    status_map = {"1": "open", "2": "in_progress", "3": "completed", "4": "cancelled"}
    priority_map = {"1": "low", "2": "medium", "3": "high", "4": "emergency"}
    return [
        {
            "title": wo.get("title") or wo.get("description"),
            "property_name": wo.get("propertyName") or wo.get("property", {}).get("name"),
            "unit_number": wo.get("unitNumber") or wo.get("unit", {}).get("number"),
            "status": status_map.get(str(wo.get("statusID") or ""), wo.get("status")),
            "priority": priority_map.get(
                str(wo.get("priorityID") or ""), wo.get("priority")
            ),
            "category": wo.get("category") or wo.get("type"),
            "created_at": wo.get("createdDate") or wo.get("createdAt"),
        }
        for wo in work_orders
    ]


@mcp.tool()
async def list_properties() -> list[dict]:
    """List all properties directly from Rentvine (live data).
    Returns property name, address, type, and unit count.
    """
    properties = await client.fetch_properties()
    return [
        {
            "property_id": p.get("propertyID") or p.get("id"),
            "name": p.get("name") or p.get("propertyName"),
            "address": p.get("address"),
            "city": p.get("city"),
            "state": p.get("state"),
            "type": p.get("type") or p.get("propertyType"),
            "total_units": p.get("totalUnits") or p.get("unitCount"),
        }
        for p in properties
    ]


def main():
    mcp.run()


if __name__ == "__main__":
    main()
