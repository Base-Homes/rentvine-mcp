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
    "create_work_order",
    {
      description:
        "Create a new maintenance work order in Rentvine (live data, write). Requires description, property_id, and priority. Rentvine auto-fills unitID for single-unit properties and defaults status to 'open'. Returns the new work_order_id and work_order_number.",
      inputSchema: {
        description: z.string().describe("Description of the issue, e.g. 'Dishwasher leaking'."),
        property_id: z.string().describe("Rentvine property ID (from list_properties)."),
        priority: z
          .enum(["low", "medium", "high", "emergency"])
          .describe("Priority level."),
        unit_id: z
          .string()
          .optional()
          .describe("Rentvine unit ID. Optional for single-unit properties (Rentvine auto-fills); required to disambiguate on multi-unit properties."),
        status: z
          .enum(["open", "in_progress", "completed", "cancelled"])
          .optional()
          .describe("Initial status. Defaults to 'open' if omitted."),
        estimated_amount: z
          .union([z.number(), z.string()])
          .optional()
          .describe("Estimated cost in dollars, e.g. 1999."),
        vendor_contact_id: z.string().optional().describe("Rentvine contact ID of the assigned vendor. Omit to leave unassigned."),
        is_owner_approved: z.boolean().optional().describe("Whether the owner has pre-approved the work order."),
        scheduled_start: z.string().optional().describe("Scheduled start date/time."),
        scheduled_end: z.string().optional().describe("Scheduled end date/time."),
      },
    },
    async (args) => jsonResult(await tools.createWorkOrder(args))
  );

  server.registerTool(
    "update_work_order",
    {
      description:
        "Update a maintenance work order in Rentvine (live data, write). Use this to change status (e.g. mark completed/cancelled to close a WO), priority, scheduling dates, estimated cost, description, or owner-approval flag. Setting status to 'completed' or 'cancelled' auto-stamps dateClosed to today unless date_closed is supplied. Find work_order_id via list_work_orders.",
      inputSchema: {
        work_order_id: z
          .string()
          .describe("Rentvine work order ID (the `work_order_id` field from list_work_orders, not the human-facing work order number)."),
        status: z
          .enum(["open", "in_progress", "completed", "cancelled"])
          .optional()
          .describe("New status. Use 'completed' or 'cancelled' to close the work order."),
        priority: z
          .enum(["low", "medium", "high", "emergency"])
          .optional()
          .describe("New priority level."),
        description: z.string().optional().describe("New description text."),
        estimated_amount: z
          .union([z.number(), z.string()])
          .optional()
          .describe("Estimated cost in dollars, e.g. 259.00."),
        scheduled_start: z.string().optional().describe("Scheduled start date/time (ISO 8601 or Rentvine-accepted format)."),
        scheduled_end: z.string().optional().describe("Scheduled end date/time."),
        actual_start: z.string().optional().describe("Actual start date/time."),
        actual_end: z.string().optional().describe("Actual end date/time."),
        date_closed: z.string().optional().describe("Date the work order was closed (YYYY-MM-DD). Auto-set to today when status becomes completed/cancelled if omitted."),
        is_owner_approved: z.boolean().optional().describe("Whether the owner has approved the work order."),
      },
    },
    async (args) => jsonResult(await tools.updateWorkOrder(args.work_order_id, args))
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
