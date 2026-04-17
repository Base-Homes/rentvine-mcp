"""Rentvine MCP server — exposes Rentvine data as MCP tools for Claude and other AI clients."""
from mcp.server.fastmcp import FastMCP

from rentvine_mcp import client, tools

mcp = FastMCP("rentvine")


@mcp.tool()
async def list_properties() -> list[dict]:
    """List all properties from Rentvine (live data).
    Returns property name, address, type, and active status.
    """
    return await tools.list_properties()


@mcp.tool()
async def list_leases() -> list[dict]:
    """List all leases from Rentvine (live data).
    Returns tenant name, unit address, rent, deposit, bed/bath count, dates, and status.
    Use this to answer questions about lease expirations, rent amounts, or active tenants.
    """
    return await tools.list_leases()


@mcp.tool()
async def list_units(property_name: str) -> list[dict]:
    """List units for a property from Rentvine (live data).
    property_name: the property name or address fragment as it appears in your Rentvine portfolio.
    Returns unit address, vacancy status, rent amount, and deposit.
    """
    return await tools.list_units(property_name)


@mcp.tool()
async def list_work_orders() -> list[dict]:
    """List all maintenance work orders from Rentvine (live data).
    Returns description, property, status, priority, estimated cost, and scheduling details.
    """
    return await tools.list_work_orders()


@mcp.tool()
async def list_applications() -> list[dict]:
    """List rental applications from Rentvine (live data).
    Returns applicant name, property, unit, status, and application date.
    """
    return await tools.list_applications()


@mcp.tool()
async def list_inspections() -> list[dict]:
    """List maintenance inspections from Rentvine (live data).
    Returns title, property, unit, scheduled date, status, and inspector.
    """
    return await tools.list_inspections()


@mcp.tool()
async def get_tenant_balance(tenant_name: str) -> dict:
    """Get the current ledger balance for a tenant from Rentvine (live data).
    tenant_name: the tenant's full name as it appears in your Rentvine roster.
    Returns balance and ledger data.
    """
    return await tools.get_tenant_balance(tenant_name)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
