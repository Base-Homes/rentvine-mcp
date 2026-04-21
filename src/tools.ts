import * as client from "./client.js";

const LEASE_STATUS: Record<string, string> = {
  "1": "future",
  "2": "active",
  "3": "expired",
  "4": "cancelled",
};
const WO_STATUS: Record<string, string> = {
  "1": "open",
  "2": "in_progress",
  "3": "completed",
  "4": "cancelled",
};
const WO_PRIORITY: Record<string, string> = {
  "1": "low",
  "2": "medium",
  "3": "high",
  "4": "emergency",
};

const WO_STATUS_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(WO_STATUS).map(([id, name]) => [name, id])
);
const WO_PRIORITY_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(WO_PRIORITY).map(([id, name]) => [name, id])
);

type Row = Record<string, unknown>;

function stripHtml(text: unknown): string {
  return String(text ?? "").replace(/<[^>]+>/g, "").trim();
}

function asObj(v: unknown): Row {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Row) : {};
}

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

export async function listProperties() {
  const rows = await client.fetchProperties();
  return rows.map((row) => {
    const p = asObj(row.property ?? row);
    return {
      property_id: p.propertyID,
      name: p.name,
      address: p.address,
      city: p.city,
      postal_code: p.postalCode,
      type: s(p.isMultiUnit) === "1" ? "multi_family" : "single_family",
      is_active: s(p.isActive) === "1",
      portfolio_id: p.portfolioID,
    };
  });
}

export async function listLeases() {
  const rows = await client.fetchLeases();
  return rows.map((row) => {
    const lse = asObj(row.lease ?? row);
    const unit = asObj(lse.unit ?? row.unit);
    const tenants = lse.tenants;
    const tenantName = Array.isArray(tenants) ? tenants.join(", ") : s(tenants);
    const status = LEASE_STATUS[s(lse.primaryLeaseStatusID)] ?? "unknown";
    return {
      lease_id: lse.leaseID,
      tenant_name: tenantName,
      unit_address: unit.address,
      rent_amount: unit.rent,
      deposit: unit.deposit,
      beds: unit.beds,
      baths: unit.fullBaths,
      sqft: unit.size,
      start_date: lse.startDate,
      end_date: lse.endDate,
      move_in_date: lse.moveInDate,
      status,
      notice_date: lse.noticeDate,
      expected_move_out: lse.expectedMoveOutDate,
      is_marked_to_vacate: lse.isMarkedToVacate,
    };
  });
}

export async function listUnits(propertyName: string) {
  const properties = await client.fetchProperties();
  const needle = propertyName.toLowerCase();
  const match = properties.find((row) => {
    const p = asObj(row.property ?? row);
    const hay = `${s(p.name)} ${s(p.address)}`.toLowerCase();
    return hay.includes(needle);
  });
  if (!match) {
    const names = properties.map((row) => {
      const p = asObj(row.property ?? row);
      return p.name ?? p.address;
    });
    return [{ error: `Property '${propertyName}' not found. Available: ${JSON.stringify(names)}` }];
  }
  const prop = asObj(match.property ?? match);
  const rvId = prop.propertyID;
  if (!rvId) return [{ error: `Property '${propertyName}' has no Rentvine ID.` }];

  const units = await client.fetchUnits(String(rvId));
  return units.map((row) => {
    const u = asObj(row.unit ?? row);
    return {
      unit_id: u.unitID,
      property_id: rvId,
      unit_number: u.number ?? u.unitNumber ?? u.name,
      address: u.address,
      is_active: u.isActive,
      status: u.status ?? (u.isVacant ? "vacant" : "occupied"),
      rent: u.rent ?? u.marketRent,
      deposit: u.deposit,
      beds: u.beds,
      baths: u.fullBaths,
      sqft: u.size,
    };
  });
}

export async function listWorkOrders() {
  const rows = await client.fetchWorkOrders();
  return rows.map((row) => {
    const wo = asObj(row.workOrder ?? row);
    const vendorContact = asObj(row.contact ?? wo.contact);
    return {
      work_order_id: wo.workOrderID,
      work_order_number: wo.workOrderNumber,
      description: stripHtml(wo.description),
      property_id: wo.propertyID,
      unit_id: wo.unitID,
      status: WO_STATUS[s(wo.primaryWorkOrderStatusID)] ?? "unknown",
      priority: WO_PRIORITY[s(wo.priorityID)] ?? "unknown",
      estimated_amount: wo.estimatedAmount,
      scheduled_start: wo.scheduledStartDate,
      scheduled_end: wo.scheduledEndDate,
      actual_start: wo.actualStartDate,
      actual_end: wo.actualEndDate,
      vendor: vendorContact.name ?? null,
      is_owner_approved: wo.isOwnerApproved,
      date_closed: wo.dateClosed,
    };
  });
}

export interface WorkOrderCreateInput {
  description: string;
  property_id: string;
  priority: string;
  unit_id?: string;
  status?: string;
  estimated_amount?: number | string;
  vendor_contact_id?: string;
  is_owner_approved?: boolean;
  scheduled_start?: string;
  scheduled_end?: string;
}

export async function createWorkOrder(input: WorkOrderCreateInput) {
  if (!input.description) return { error: "description is required." };
  if (!input.property_id) return { error: "property_id is required." };
  if (!input.priority) return { error: "priority is required." };

  const priorityID = WO_PRIORITY_TO_ID[input.priority];
  if (!priorityID) {
    return {
      error: `Invalid priority '${input.priority}'. Expected one of: ${Object.keys(WO_PRIORITY_TO_ID).join(", ")}.`,
    };
  }

  const payload: Record<string, unknown> = {
    description: input.description,
    propertyID: input.property_id,
    priorityID,
  };

  if (input.unit_id !== undefined) payload.unitID = input.unit_id;

  if (input.status !== undefined) {
    const statusID = WO_STATUS_TO_ID[input.status];
    if (!statusID) {
      return {
        error: `Invalid status '${input.status}'. Expected one of: ${Object.keys(WO_STATUS_TO_ID).join(", ")}.`,
      };
    }
    payload.primaryWorkOrderStatusID = statusID;
  }

  if (input.estimated_amount !== undefined) payload.estimatedAmount = String(input.estimated_amount);
  if (input.vendor_contact_id !== undefined) payload.vendorContactID = input.vendor_contact_id;
  if (input.is_owner_approved !== undefined) {
    payload.isOwnerApproved = input.is_owner_approved ? "1" : "0";
  }
  if (input.scheduled_start !== undefined) payload.scheduledStartDate = input.scheduled_start;
  if (input.scheduled_end !== undefined) payload.scheduledEndDate = input.scheduled_end;

  const response = await client.createWorkOrder(payload);
  const created = asObj((response as Row)?.workOrder ?? response);
  return {
    work_order_id: created.workOrderID,
    work_order_number: created.workOrderNumber,
    property_id: created.propertyID,
    unit_id: created.unitID,
    status: WO_STATUS[s(created.primaryWorkOrderStatusID)] ?? "unknown",
    priority: WO_PRIORITY[s(created.priorityID)] ?? "unknown",
    estimated_amount: created.estimatedAmount,
    description: stripHtml(created.description),
    sent_payload: payload,
  };
}

export interface WorkOrderUpdateInput {
  status?: string;
  priority?: string;
  description?: string;
  estimated_amount?: number | string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  date_closed?: string;
  is_owner_approved?: boolean;
}

export async function updateWorkOrder(
  workOrderId: string,
  input: WorkOrderUpdateInput
) {
  if (!workOrderId) {
    return { error: "work_order_id is required." };
  }

  const payload: Record<string, unknown> = {};

  if (input.status !== undefined) {
    const id = WO_STATUS_TO_ID[input.status];
    if (!id) {
      return {
        error: `Invalid status '${input.status}'. Expected one of: ${Object.keys(WO_STATUS_TO_ID).join(", ")}.`,
      };
    }
    payload.primaryWorkOrderStatusID = id;
    // Auto-stamp dateClosed when caller marks completed/cancelled and didn't
    // supply one explicitly — matches how Rentvine's UI behaves.
    if (
      (input.status === "completed" || input.status === "cancelled") &&
      input.date_closed === undefined
    ) {
      payload.dateClosed = new Date().toISOString().slice(0, 10);
    }
  }

  if (input.priority !== undefined) {
    const id = WO_PRIORITY_TO_ID[input.priority];
    if (!id) {
      return {
        error: `Invalid priority '${input.priority}'. Expected one of: ${Object.keys(WO_PRIORITY_TO_ID).join(", ")}.`,
      };
    }
    payload.priorityID = id;
  }

  if (input.description !== undefined) payload.description = input.description;
  if (input.estimated_amount !== undefined) payload.estimatedAmount = String(input.estimated_amount);
  if (input.scheduled_start !== undefined) payload.scheduledStartDate = input.scheduled_start;
  if (input.scheduled_end !== undefined) payload.scheduledEndDate = input.scheduled_end;
  if (input.actual_start !== undefined) payload.actualStartDate = input.actual_start;
  if (input.actual_end !== undefined) payload.actualEndDate = input.actual_end;
  if (input.date_closed !== undefined) payload.dateClosed = input.date_closed;
  if (input.is_owner_approved !== undefined) {
    payload.isOwnerApproved = input.is_owner_approved ? "1" : "0";
  }

  if (Object.keys(payload).length === 0) {
    return { error: "No fields provided to update." };
  }

  const response = await client.updateWorkOrder(workOrderId, payload);
  return {
    work_order_id: workOrderId,
    updated_fields: payload,
    response,
  };
}

export async function listApplications() {
  const rows = await client.fetchApplications();
  return rows.map((a) => {
    const property = asObj(a.property);
    const unit = asObj(a.unit);
    return {
      applicant_name: a.applicantName ?? a.name,
      property_name: a.propertyName ?? property.name,
      unit_number: a.unitNumber ?? unit.number,
      status: a.status,
      applied_at: a.applicationDate ?? a.createdAt,
    };
  });
}

export async function listInspections() {
  const rows = await client.fetchInspections();
  return rows.map((i) => {
    const property = asObj(i.property);
    const unit = asObj(i.unit);
    const inspector = asObj(i.inspector);
    return {
      title: i.title ?? i.type,
      property_name: i.propertyName ?? property.name,
      unit_number: i.unitNumber ?? unit.number,
      scheduled_date: i.scheduledDate ?? i.date,
      status: i.status,
      inspector: i.inspectorName ?? inspector.name,
    };
  });
}

export async function getTenantBalance(tenantName: string) {
  const tenants = await client.fetchTenants();
  const needle = tenantName.toLowerCase();
  const match = tenants.find((row) => {
    const t = asObj(row.contact ?? row);
    return s(t.name).toLowerCase().includes(needle);
  });
  if (!match) return { error: `Tenant '${tenantName}' not found in Rentvine.` };

  const contact = asObj(match.contact ?? match);
  const rvId = contact.contactID ?? contact.tenantID ?? contact.id;
  if (!rvId) return { error: `Tenant '${tenantName}' has no Rentvine ID.` };

  const data = await client.fetchTenantBalance(String(rvId));
  return { tenant_name: tenantName, ledger: data };
}

export async function listOwners() {
  const rows = await client.fetchOwners();
  return rows.map((row) => {
    const c = asObj(row.contact ?? row);
    return {
      contact_id: c.contactID,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      postal_code: c.postalCode,
    };
  });
}

export async function listVendors() {
  const rows = await client.fetchVendors();
  return rows.map((row) => {
    const c = asObj(row.contact ?? row);
    return {
      contact_id: c.contactID,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      postal_code: c.postalCode,
      insurance_expiration: c.insuranceExpiration ?? c.insuranceExpirationDate,
    };
  });
}

export async function listPortfolios() {
  const rows = await client.fetchPortfolios();
  return rows.map((row) => {
    const p = asObj(row.portfolio ?? row);
    const owners = Array.isArray(p.owners)
      ? (p.owners as unknown[]).map((o) => {
          const oc = asObj((o as Record<string, unknown>).contact ?? o);
          return { contact_id: oc.contactID, name: oc.name };
        })
      : [];
    return {
      portfolio_id: p.portfolioID,
      name: p.name,
      is_active: p.isActive,
      reserve_amount: p.reserveAmount,
      owners,
    };
  });
}

export async function listBills() {
  const rows = await client.fetchBills();
  return rows.map((row) => {
    const b = asObj(row.bill ?? row);
    return {
      bill_id: b.billID,
      bill_type_id: b.billTypeID,
      payee_contact_id: b.payeeContactID,
      bill_date: b.billDate,
      date_due: b.dateDue,
      is_voided: b.isVoided,
      reference: b.reference,
      payment_memo: b.paymentMemo,
      work_order_id: b.workOrderID,
    };
  });
}

export interface BillCreateInput {
  payee_contact_id: number;
  bill_date: string;
  due_date: string;
  bill_type_id: number;
  reference?: string;
  payment_memo?: string;
  work_order_id?: string;
  charges?: unknown[];
}

export async function createBill(input: BillCreateInput) {
  const payload: Record<string, unknown> = {
    payeeContactID: input.payee_contact_id,
    billDate: input.bill_date,
    dateDue: input.due_date,
    billTypeID: input.bill_type_id,
    isVoided: false,
    isDiscount: false,
    isMarkup: false,
    managementFeeMode: 0,
  };
  if (input.reference !== undefined) payload.reference = input.reference;
  if (input.payment_memo !== undefined) payload.paymentMemo = input.payment_memo;
  if (input.work_order_id !== undefined) payload.workOrderID = input.work_order_id;
  if (input.charges !== undefined) payload.charges = input.charges;

  const response = await client.createBill(payload);
  const b = asObj((response as Record<string, unknown>)?.bill ?? response);
  return {
    bill_id: b.billID,
    payee_contact_id: b.payeeContactID,
    bill_date: b.billDate,
    date_due: b.dateDue,
    reference: b.reference,
  };
}

export interface TransactionSearchInput {
  search?: string;
  date_min?: string;
  date_max?: string;
  amount_min?: string;
  amount_max?: string;
  is_voided?: boolean;
  page?: number;
  page_size?: number;
}

export async function searchTransactions(input: TransactionSearchInput) {
  const params: Record<string, string> = {};
  if (input.search) params.search = input.search;
  if (input.date_min) params.datePostedMin = input.date_min;
  if (input.date_max) params.datePostedMax = input.date_max;
  if (input.amount_min !== undefined) params.amountMin = input.amount_min;
  if (input.amount_max !== undefined) params.amountMax = input.amount_max;
  if (input.is_voided !== undefined) params.isVoided = String(input.is_voided);
  if (input.page !== undefined) params.page = String(input.page);
  if (input.page_size !== undefined) params.pageSize = String(input.page_size);

  const data = await client.searchTransactions(params);
  const rows = Array.isArray(data)
    ? data
    : ((data as Record<string, unknown>)?.data as unknown[] ?? []);
  return (rows as Record<string, unknown>[]).map((row) => {
    const t = asObj(row.transaction ?? row);
    const ledger = asObj(row.ledger ?? {});
    const property = asObj(row.property ?? {});
    return {
      transaction_id: t.transactionID,
      type: t.type,
      amount: t.amount,
      description: t.description,
      reference: t.reference,
      date_posted: t.datePosted,
      is_voided: t.isVoided,
      ledger_name: ledger.name,
      property_name: property.name,
    };
  });
}

export async function listAccounts() {
  const rows = await client.fetchAccounts();
  return rows.map((row) => {
    const a = asObj(row.account ?? row);
    const cat = asObj(row.accountCategory ?? {});
    return {
      account_id: a.accountID,
      number: a.number,
      name: a.name,
      is_active: a.isActive,
      category: cat.name,
      account_type_id: a.accountTypeID,
    };
  });
}

export interface FileUploadInput {
  file_path?: string;
  file_content_base64?: string;
  file_name?: string;
  object_type_id?: number;
  object_id?: number;
}

export async function listObjectTypes() {
  return [
    { object_type_id: 1,  name: "Account" },
    { object_type_id: 2,  name: "User" },
    { object_type_id: 3,  name: "Contact" },
    { object_type_id: 4,  name: "Lease" },
    { object_type_id: 5,  name: "Bill" },
    { object_type_id: 6,  name: "Property" },
    { object_type_id: 7,  name: "Unit" },
    { object_type_id: 8,  name: "Deposit" },
    { object_type_id: 9,  name: "Accounting Transaction" },
    { object_type_id: 10, name: "Accounting Transaction Entry" },
    { object_type_id: 11, name: "Portfolio" },
    { object_type_id: 12, name: "Payout" },
    { object_type_id: 13, name: "Bank Adjustment" },
    { object_type_id: 14, name: "Company" },
    { object_type_id: 15, name: "Statement" },
    { object_type_id: 16, name: "Work Order" },
    { object_type_id: 17, name: "Inspection" },
    { object_type_id: 18, name: "Inspection Area" },
    { object_type_id: 19, name: "Inspection Item" },
    { object_type_id: 20, name: "Application" },
    { object_type_id: 21, name: "Applicant" },
    { object_type_id: 22, name: "Bank Transfer" },
    { object_type_id: 23, name: "Listing" },
    { object_type_id: 24, name: "Appliance" },
    { object_type_id: 25, name: "Text Message" },
    { object_type_id: 26, name: "Email Message" },
    { object_type_id: 27, name: "Work Order Estimate" },
    { object_type_id: 28, name: "Settlement" },
    { object_type_id: 29, name: "Lease Tenant" },
    { object_type_id: 30, name: "Email Template" },
    { object_type_id: 31, name: "Note" },
    { object_type_id: 32, name: "File Attachment" },
    { object_type_id: 33, name: "Vendor Bill" },
    { object_type_id: 34, name: "Document Transaction" },
    { object_type_id: 35, name: "Document Envelope" },
    { object_type_id: 36, name: "Application Template" },
    { object_type_id: 37, name: "Recurring Bill" },
    { object_type_id: 38, name: "Chat Message" },
    { object_type_id: 39, name: "Reconciliation" },
    { object_type_id: 40, name: "Path" },
    { object_type_id: 41, name: "Payout Return" },
    { object_type_id: 42, name: "Management Fee Setting" },
    { object_type_id: 43, name: "Additional Management Fee Setting" },
    { object_type_id: 44, name: "Accounting Setting" },
    { object_type_id: 45, name: "Posting Setting" },
    { object_type_id: 46, name: "Late Fee Setting" },
    { object_type_id: 47, name: "Statement Setting" },
    { object_type_id: 48, name: "Payout Batch" },
    { object_type_id: 49, name: "Letter" },
    { object_type_id: 50, name: "Reminder" },
    { object_type_id: 51, name: "Review" },
  ];
}

export async function uploadFile(input: FileUploadInput) {
  let buffer: Buffer;
  let fileName: string;

  if (input.file_path) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    buffer = Buffer.from(await fs.readFile(input.file_path));
    fileName = input.file_name ?? path.basename(input.file_path);
  } else if (input.file_content_base64 && input.file_name) {
    const BASE64_LIMIT = 500_000;
    if (input.file_content_base64.length > BASE64_LIMIT) {
      const rawKB = Math.round(input.file_content_base64.length * 0.75 / 1024);
      throw new Error(
        `File is ~${rawKB}KB — too large to pass as base64 (limit ~375KB raw). ` +
        `Use file_path instead: upload_file(file_path="/absolute/path/to/file", ...)`
      );
    }
    buffer = Buffer.from(input.file_content_base64, "base64");
    fileName = input.file_name;
  } else {
    throw new Error("Provide either file_path or both file_content_base64 and file_name.");
  }

  const response = await client.uploadFile(
    buffer,
    fileName,
    input.object_id,
    input.object_type_id
  );
  const r = asObj(response as Record<string, unknown>);
  const file = asObj(r.file ?? r);
  const attachment = asObj(r.attachment ?? {});
  return {
    file_id: file.fileID,
    file_name: file.fileName,
    file_size: file.fileSize,
    file_type: file.fileType,
    attachment_id: attachment.fileAttachmentID ?? null,
  };
}
