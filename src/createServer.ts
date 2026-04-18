import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tools from "./tools.js";

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "rentvine",
    version: "0.1.3",
  });

  server.registerTool(
    "list_properties",
    {
      description:
        "List all properties from Rentvine (live data). Returns property name, address, type, and active status.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listProperties())
  );

  server.registerTool(
    "list_leases",
    {
      description:
        "List all leases from Rentvine (live data). Returns tenant name, unit address, rent, deposit, bed/bath count, dates, and status. Use this to answer questions about lease expirations, rent amounts, or active tenants.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listLeases())
  );

  server.registerTool(
    "list_units",
    {
      description:
        "List units for a property from Rentvine (live data). Returns unit address, vacancy status, rent amount, and deposit.",
      inputSchema: {
        property_name: z
          .string()
          .describe("The property name or address fragment as it appears in your Rentvine portfolio."),
      },
    },
    async ({ property_name }) => jsonResult(await tools.listUnits(property_name))
  );

  server.registerTool(
    "list_work_orders",
    {
      description:
        "List all maintenance work orders from Rentvine (live data). Returns description, property, status, priority, estimated cost, and scheduling details.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listWorkOrders())
  );

  server.registerTool(
    "list_applications",
    {
      description:
        "List rental applications from Rentvine (live data). Returns applicant name, property, unit, status, and application date.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listApplications())
  );

  server.registerTool(
    "list_inspections",
    {
      description:
        "List maintenance inspections from Rentvine (live data). Returns title, property, unit, scheduled date, status, and inspector.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listInspections())
  );

  server.registerTool(
    "get_tenant_balance",
    {
      description:
        "Get the current ledger balance for a tenant from Rentvine (live data). Returns balance and ledger data.",
      inputSchema: {
        tenant_name: z
          .string()
          .describe("The tenant's full name as it appears in your Rentvine roster."),
      },
    },
    async ({ tenant_name }) => jsonResult(await tools.getTenantBalance(tenant_name))
  );

  return server;
}
