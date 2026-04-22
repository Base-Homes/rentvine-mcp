import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as tools from "./tools.js";

const RENTVINE_API_DOCS = `# Rentvine API Reference

## Base URL
\`https://{account}.rentvine.com/api/manager\`

## Authentication
HTTP Basic Auth — Access Key as username, Secret as password.

---

## Object Types
Used with \`objectID\` + \`objectTypeID\` to identify objects sharing a resource (e.g. file attachments).

| ID | Object Type |
|----|-------------|
| 1 | Account |
| 2 | User |
| 3 | Contact |
| 4 | Lease |
| 5 | Bill |
| 6 | Property |
| 7 | Unit |
| 8 | Deposit |
| 9 | Accounting Transaction |
| 10 | Accounting Transaction Entry |
| 11 | Portfolio |
| 12 | Payout |
| 13 | Bank Adjustment |
| 14 | Company |
| 15 | Statement |
| 16 | Work Order |
| 17 | Inspection |
| 18 | Inspection Area |
| 19 | Inspection Item |
| 20 | Application |
| 21 | Applicant |
| 22 | Bank Transfer |
| 23 | Listing |
| 24 | Appliance |
| 25 | Text Message |
| 26 | Email Message |
| 27 | Work Order Estimate |
| 28 | Settlement |
| 29 | Lease Tenant |
| 30 | Email Template |
| 31 | Note |
| 32 | File Attachment |
| 33 | Vendor Bill |
| 34 | Document Transaction |
| 35 | Document Envelope |
| 36 | Application Template |
| 37 | Recurring Bill |
| 38 | Chat Message |
| 39 | Reconciliation |
| 40 | Path |
| 41 | Payout Return |
| 42 | Management Fee Setting |
| 43 | Additional Management Fee Setting |
| 44 | Accounting Setting |
| 45 | Posting Setting |
| 46 | Late Fee Setting |
| 47 | Statement Setting |
| 48 | Payout Batch |
| 49 | Letter |
| 50 | Reminder |
| 51 | Review |

---

## Status & Enum Reference

### Lease Status (primaryLeaseStatusID)
- 1 = Pending
- 2 = Active
- 3 = Closed

### Work Order Status (primaryWorkOrderStatusID)
- 1 = Pending
- 2 = Open
- 3 = Closed
- 4 = On Hold

### Work Order Priority (priorityID)
- 1 = Low
- 2 = Medium
- 3 = High

### Work Order Source (sourceTypeID)
- 1 = Portal
- 2 = In Person
- 3 = Email
- 4 = Text Message
- 5 = Phone
- 6 = Recurring

### Contact Type (contactTypeID)
- 1 = Owner
- 2 = Tenant
- 3 = Vendor
- 4 = Manager
- 5 = Association
- 6 = Applicant

### Ledger Type (ledgerTypeID)
- 1 = Manager
- 2 = Portfolio
- 3 = Property
- 4 = Unit

### Payout Type (payoutTypeID)
- 1 = Check
- 2 = ACH

### Move-Out Status (moveOutStatusID)
- 1 = None
- 2 = Active
- 3 = Completed

---

## Endpoints

### Properties
- \`GET /properties\` — List all properties
- \`POST /properties\` — Create property
- \`GET /properties/{propertyID}\` — View property
- \`POST /properties/{propertyID}\` — Update property
- \`DELETE /properties/{propertyID}\` — Delete property
- \`POST /properties/{propertyID}/deactivate\`
- \`POST /properties/{propertyID}/activate\`
- \`GET /properties/{propertyID}/units\` — List units for a property
- \`GET /properties/{propertyID}/units/{unitID}\` — View unit

### Units (global export)
- \`GET /properties/units/export\` — Export all units (params: isActive, dateTimeModifiedMin/Max, page, pageSize)

### Leases
- \`GET /leases\` — List leases
- \`GET /leases/{leaseID}\` — View lease detail
- \`GET /leases/export\` — Export leases (params: leaseIDs[], primaryLeaseStatusIDs[], page, pageSize)

### Contacts
- \`GET /owners/search\` — List owners
- \`GET /tenants/search\` — List tenants
- \`GET /vendors/search\` — List vendors
- \`GET /associations/search\` — List associations

### Portfolios
- \`GET /portfolios\` — List portfolios

### Maintenance
- \`GET /maintenance/work-orders\` — List work orders (params: page, pageSize)
- \`POST /maintenance/work-orders\` — Create work order
- \`GET /maintenance/work-orders/{workOrderID}\` — View work order
- \`POST /maintenance/work-orders/{workOrderID}\` — Update work order
- \`GET /maintenance/work-order/statuses\` — List statuses
- \`POST /maintenance/work-order/statuses\` — Create status
- \`GET /maintenance/vendor-trades\` — List vendor trades
- \`POST /maintenance/vendor-trades\` — Create vendor trade
- \`GET /maintenance/inspections\` — List inspections
- \`POST /maintenance/inspections\` — Create inspection
- \`GET /maintenance/inspections/{inspectionID}\` — View inspection

### Accounting
- \`GET /accounting/accounts\` — Chart of accounts
- \`GET /accounting/bills\` — List bills
- \`POST /accounting/bills\` — Create bill
- \`GET /accounting/{billID}\` — View bill
- \`GET /accounting/ledgers\` — List ledgers (required param: search)
- \`GET /accounting/ledgers/search\` — Search ledgers
- \`GET /accounting/transactions/search\` — Search transactions (params: search, isVoided, amountMin/Max, datePostedMin/Max, transactionTypeIDs[], propertyIDs[], primaryLedgerIDs[], page, pageSize)
- \`GET /accounting/transactions/entries/search\` — Search transaction entries

### Accounting Diagnostics
- \`GET /accounting/diagnostics/unused-vendor-credits\`
- \`GET /accounting/diagnostics/negative-bank-accounts\`
- \`GET /accounting/diagnostics/reserve-not-met\`
- \`GET /accounting/diagnostics/escrow-mismatch\`
- \`GET /accounting/diagnostics/prepayment-mismatch\`
- \`GET /accounting/diagnostics/unused-prepayments\`
- \`GET /accounting/diagnostics/bank-account-reconciliation-lapse\`
- \`GET /accounting/diagnostics/vendor-insurance-lapse\`
- \`GET /accounting/diagnostics/credit-debit-mismatch\`
- \`GET /accounting/diagnostics/manager-ledger-balance\`
- \`GET /accounting/diagnostics/suppressed-fee-balance-mismatch\`

### Files
- \`POST /files\` — Upload file and attach to an object
  - Query params: objectID (integer), objectTypeID (integer), includes="attachment"
  - Body: multipart/form-data with file field
  - Response: file object + optional attachment object

### Screening
- \`GET /screening/applications/export\` — Export applications

---

## Work Order Create/Update Fields

### Required for create:
- propertyID, workOrderStatusID, priorityID (1/2/3), isOwnerApproved, isVacant, description, isSharedWithTenant, isSharedWithOwner, sourceTypeID

### Optional:
- unitID, leaseID, vendorContactID, assignedToUserID, requestedByContactID, estimatedAmount, scheduledStartDate, scheduledEndDate, vendorInstructions, vendorTradeID, workOrderProjectID

---

## Bill Create Fields

### Required:
- payeeContactID, billDate (YYYY-MM-DD), dateDue (YYYY-MM-DD), billTypeID, isVoided, isDiscount, isMarkup, managementFeeMode

### Optional:
- reference, paymentMemo, workOrderID, discountPercent, markupPercent, parentBillID, managementFeeBatchID
- charges[]: { ledgerID, chargeAccountID, amount, description }
- leaseCharges[], attachments[]

---

## Pagination
Most list endpoints accept \`page\` (default 1) and \`pageSize\` (default 15 or 25).
`;


function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "rentvine",
    version: "1.2.0",
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

  server.registerTool(
    "list_owners",
    {
      description:
        "List all property owners from Rentvine (live data). Returns owner name, contact ID, email, phone, and address. Use this to look up who owns a property or to get a contact ID for bill creation.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listOwners())
  );

  server.registerTool(
    "list_vendors",
    {
      description:
        "List all vendors from Rentvine (live data). Returns every field the /vendors/search endpoint exposes — contact details (name, email, phone, address, city, state, postal_code, country), billing/payout (tax_payer_name, payout_type_id, ach_account_number_truncated, hold_payments), full insurance coverage (liability and workers-comp policy numbers + expirations, days_until_insurance_expires), discount terms, identification documents, active status, and audit timestamps. Use to find vendors for work-order assignment, bill creation, or compliance review. Note: Rentvine does not expose trade categories or service areas via the public API.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listVendors())
  );

  server.registerTool(
    "get_vendor",
    {
      description:
        "Get a single vendor's full details from Rentvine (live data). Calls /vendors/{id} which returns ~20 fields not available via list_vendors — notably `code` (100-char free-text identifier used as a catch-all for metadata Rentvine's schema can't hold, such as trade/hourly-rate), `website_url`, name components (first/middle/last/suffix), discount tiers, QuickBooks linkage, and `contact_type`. Also parses the packed `code` field into a `code_metadata` object when it uses the pipe-delimited k=v convention.",
      inputSchema: {
        vendor_id: z.string().describe("Rentvine vendor contactID (from list_vendors or vendors_near)."),
      },
    },
    async ({ vendor_id }) => jsonResult(await tools.getVendor(vendor_id))
  );

  server.registerTool(
    "vendors_near",
    {
      description:
        "Find vendors within a radius of a property (live data). Uses the property's Rentvine-geocoded latitude/longitude as the center and approximates each vendor's location from their ZIP-code centroid (offline US lookup — Rentvine does not store per-vendor lat/lon). Returns vendors sorted by distance ascending, each annotated with distance_miles. Defaults: radius_mi=25, active_only=true. Coarse filter — not a precise distance.",
      inputSchema: {
        property_id: z.string().describe("Rentvine property ID (from list_properties). Must have a geocoded latitude/longitude in Rentvine."),
        radius_mi: z.number().optional().describe("Search radius in miles. Defaults to 25."),
        active_only: z.boolean().optional().describe("If true (default), only returns vendors with isActive=1."),
      },
    },
    async ({ property_id, radius_mi, active_only }) =>
      jsonResult(await tools.vendorsNear({ property_id, radius_mi, active_only }))
  );

  server.registerTool(
    "list_portfolios",
    {
      description:
        "List all portfolios from Rentvine (live data). Returns portfolio name, ID, active status, reserve amount, and associated owners.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listPortfolios())
  );

  server.registerTool(
    "list_bills",
    {
      description:
        "List all bills from Rentvine (live data). Returns bill ID, payee, dates, voided status, and linked work order. Use this to review outstanding vendor invoices.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listBills())
  );

  server.registerTool(
    "create_bill",
    {
      description:
        "Create a bill in Rentvine (live data, write). Requires a payee contact ID (from list_vendors or list_owners), bill date, due date, and bill type ID. Optionally link to a work order.",
      inputSchema: {
        payee_contact_id: z.number().describe("Rentvine contact ID of the payee (vendor or owner). Get from list_vendors or list_owners."),
        bill_date: z.string().describe("Date of the bill (YYYY-MM-DD)."),
        due_date: z.string().describe("Payment due date (YYYY-MM-DD)."),
        bill_type_id: z.number().describe("Rentvine bill type ID. Check your Rentvine settings for valid values."),
        reference: z.string().optional().describe("Invoice or reference number."),
        payment_memo: z.string().optional().describe("Memo to include on payment."),
        work_order_id: z.string().optional().describe("Link this bill to a work order ID."),
        charges: z.array(z.record(z.unknown())).optional().describe("Line item charges array. Each charge should include accountID, amount, and description."),
      },
    },
    async (args) => jsonResult(await tools.createBill(args))
  );

  server.registerTool(
    "search_transactions",
    {
      description:
        "Search accounting transactions in Rentvine (live data). Filter by keyword, date range, or amount range. Returns transaction type, amount, description, date, and associated property/ledger. Paginated — use page and page_size for large result sets.",
      inputSchema: {
        search: z.string().optional().describe("Filter by description, name, amount, or address."),
        date_min: z.string().optional().describe("Earliest posted date (YYYY-MM-DD)."),
        date_max: z.string().optional().describe("Latest posted date (YYYY-MM-DD)."),
        amount_min: z.string().optional().describe("Minimum transaction amount."),
        amount_max: z.string().optional().describe("Maximum transaction amount."),
        is_voided: z.boolean().optional().describe("Filter to voided (true) or active (false) transactions only."),
        page: z.number().optional().describe("Page number (default 1)."),
        page_size: z.number().optional().describe("Results per page (default 15)."),
      },
    },
    async (args) => jsonResult(await tools.searchTransactions(args))
  );

  server.registerTool(
    "list_accounts",
    {
      description:
        "List the chart of accounts from Rentvine (live data). Returns account ID, number, name, category, and active status. Useful for identifying accountIDs when creating bill charges.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listAccounts())
  );

  server.registerTool(
    "upload_file",
    {
      description:
        "Upload a file to Rentvine and optionally attach it to a work order, property, lease, or unit (live data, write). " +
        "ALWAYS use file_path when the file exists on disk — pass the absolute path and the server reads it directly. " +
        "NEVER use file_content_base64 for local files; it is extremely slow and fills the context window. " +
        "file_content_base64 exists only for remote/HTTP deployments with no shared filesystem. " +
        "Use list_object_types to get valid object_type_id values.",
      inputSchema: {
        file_path: z.string().optional().describe("Absolute path to the file on disk (e.g. '/Users/you/Downloads/invoice.pdf'). USE THIS for any file you can reference by path. The server reads it directly — no encoding needed."),
        object_type_id: z.number().optional().describe("Rentvine object type ID to attach the file to. Use list_object_types to find valid values (e.g. 7 = Unit)."),
        object_id: z.number().optional().describe("ID of the object to attach the file to (e.g. unitID, workOrderID)."),
        file_name: z.string().optional().describe("Override the file name. If omitted, inferred from file_path."),
        file_content_base64: z.string().optional().describe("LAST RESORT ONLY — base64-encoded file content for remote deployments with no filesystem access. Do not use this for local files; use file_path instead."),
      },
    },
    async (args) => jsonResult(await tools.uploadFile(args))
  );

  server.registerTool(
    "list_object_types",
    {
      description:
        "List Rentvine object types. Returns the full table of object_type_id values and names (e.g. 7 = Unit, 16 = Work Order, 4 = Lease). Use this to find the correct object_type_id when uploading files or attaching documents.",
      inputSchema: {},
    },
    async () => jsonResult(await tools.listObjectTypes())
  );

  server.registerTool(
    "list_attachments",
    {
      description:
        "List files attached to any Rentvine object (live data, read). Returns file metadata including file_id, file_name, mime_type, size, and upload date. Use list_object_types to find the correct object_type_id.",
      inputSchema: {
        object_id: z.number().describe("ID of the Rentvine object (e.g. workOrderID, propertyID, leaseID, unitID)."),
        object_type_id: z.number().describe("Rentvine object type ID (e.g. 16 = Work Order, 6 = Property, 4 = Lease, 7 = Unit). Use list_object_types for the full table."),
      },
    },
    async (args) => jsonResult(await tools.listAttachments(args))
  );

  server.registerTool(
    "list_work_order_attachments",
    {
      description:
        "List images and files attached to a specific work order (live data, read). Convenience wrapper around list_attachments with object_type_id fixed to 16.",
      inputSchema: {
        work_order_id: z.number().describe("Rentvine workOrderID."),
      },
    },
    async (args) => jsonResult(await tools.listWorkOrderAttachments(args))
  );

  server.registerTool(
    "get_file",
    {
      description:
        "Get metadata for a single Rentvine file by file_id (live data, read). Returns name, size, mime type, and attachment info — but not file contents. Use download_file to fetch the actual bytes.",
      inputSchema: {
        file_id: z.union([z.number(), z.string()]).describe("Rentvine fileID."),
      },
    },
    async (args) => jsonResult(await tools.getFile(args))
  );

  server.registerTool(
    "download_file",
    {
      description:
        "Download a Rentvine file as base64 (live data, read). Returns mime_type, size_bytes, is_image, and content_base64. Supports images and other binary attachments. Large files may blow up the context window — prefer list_attachments first to check file_size.",
      inputSchema: {
        file_id: z.union([z.number(), z.string()]).describe("Rentvine fileID."),
      },
    },
    async (args) => jsonResult(await tools.downloadFile(args))
  );

  server.registerResource(
    "rentvine-api-docs",
    "rentvine://api-docs",
    {
      description: "Complete Rentvine API reference: all endpoints, field definitions, status/enum ID tables, object type IDs, and pagination details.",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [{
        uri: "rentvine://api-docs",
        mimeType: "text/markdown",
        text: RENTVINE_API_DOCS,
      }],
    })
  );

  return server;
}
