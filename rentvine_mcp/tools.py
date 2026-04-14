"""Formatted Rentvine tool functions — shared by the MCP server and any other client (bots, scripts)."""
import re

from rentvine_mcp import client

_LEASE_STATUS = {"1": "future", "2": "active", "3": "expired", "4": "cancelled"}
_WO_STATUS = {"1": "open", "2": "in_progress", "3": "completed", "4": "cancelled"}
_WO_PRIORITY = {"1": "low", "2": "medium", "3": "high", "4": "emergency"}


def _strip_html(text: str | None) -> str:
    return re.sub(r"<[^>]+>", "", text or "").strip()


async def list_properties() -> list[dict]:
    properties = await client.fetch_properties()
    return [
        {
            "property_id": p.get("propertyID"),
            "name": p.get("name"),
            "address": p.get("address"),
            "city": p.get("city"),
            "postal_code": p.get("postalCode"),
            "type": "multi_family" if str(p.get("isMultiUnit", "0")) == "1" else "single_family",
            "is_active": str(p.get("isActive", "0")) == "1",
            "portfolio_id": p.get("portfolioID"),
        }
        for p in properties
    ]


async def list_leases() -> list[dict]:
    leases = await client.fetch_leases()
    result = []
    for row in leases:
        lse = row.get("lease") or row
        unit = lse.get("unit") or row.get("unit") or {}
        tenants = lse.get("tenants") or []
        tenant_name = ", ".join(tenants) if isinstance(tenants, list) else str(tenants)
        status = _LEASE_STATUS.get(str(lse.get("primaryLeaseStatusID") or ""), "unknown")
        result.append(
            {
                "lease_id": lse.get("leaseID"),
                "tenant_name": tenant_name,
                "unit_address": unit.get("address"),
                "rent_amount": unit.get("rent"),
                "deposit": unit.get("deposit"),
                "beds": unit.get("beds"),
                "baths": unit.get("baths"),
                "sqft": unit.get("sqFt"),
                "start_date": lse.get("startDate"),
                "end_date": lse.get("endDate"),
                "move_in_date": lse.get("moveInDate"),
                "status": status,
                "notice_date": lse.get("noticeDate"),
                "expected_move_out": lse.get("expectedMoveOutDate"),
                "is_marked_to_vacate": lse.get("isMarkedToVacate"),
            }
        )
    return result


async def list_units(property_name: str) -> list[dict]:
    properties = await client.fetch_properties()
    prop = next(
        (
            p
            for p in properties
            if property_name.lower() in (p.get("name") or p.get("address") or "").lower()
        ),
        None,
    )
    if not prop:
        names = [p.get("name") or p.get("address") for p in properties]
        return [{"error": f"Property '{property_name}' not found. Available: {names}"}]

    rv_prop_id = prop.get("propertyID")
    if not rv_prop_id:
        return [{"error": f"Property '{property_name}' has no Rentvine ID."}]

    units = await client.fetch_units(str(rv_prop_id))
    return [
        {
            "unit_number": u.get("number") or u.get("unitNumber"),
            "address": u.get("address"),
            "status": u.get("status") or ("vacant" if u.get("isVacant") else "occupied"),
            "rent": u.get("rent") or u.get("marketRent"),
            "deposit": u.get("deposit"),
            "beds": u.get("beds"),
            "baths": u.get("baths"),
        }
        for u in units
    ]


async def list_work_orders() -> list[dict]:
    work_orders = await client.fetch_work_orders()
    result = []
    for row in work_orders:
        wo = row.get("workOrder") or row
        vendor_contact = row.get("contact") or wo.get("contact") or {}
        vendor_name = vendor_contact.get("name") if isinstance(vendor_contact, dict) else None
        result.append(
            {
                "work_order_id": wo.get("workOrderID"),
                "work_order_number": wo.get("workOrderNumber"),
                "description": _strip_html(wo.get("description")),
                "property_id": wo.get("propertyID"),
                "unit_id": wo.get("unitID"),
                "status": _WO_STATUS.get(str(wo.get("primaryWorkOrderStatusID") or ""), "unknown"),
                "priority": _WO_PRIORITY.get(str(wo.get("priorityID") or ""), "unknown"),
                "estimated_amount": wo.get("estimatedAmount"),
                "scheduled_start": wo.get("scheduledStartDate"),
                "scheduled_end": wo.get("scheduledEndDate"),
                "actual_start": wo.get("actualStartDate"),
                "actual_end": wo.get("actualEndDate"),
                "vendor": vendor_name,
                "is_owner_approved": wo.get("isOwnerApproved"),
                "date_closed": wo.get("dateClosed"),
            }
        )
    return result


async def list_applications() -> list[dict]:
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


async def list_inspections() -> list[dict]:
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


async def get_tenant_balance(tenant_name: str) -> dict:
    tenants = await client.fetch_tenants()
    tenant = next(
        (
            t
            for t in tenants
            if tenant_name.lower() in (t.get("name") or t.get("tenantName") or "").lower()
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
