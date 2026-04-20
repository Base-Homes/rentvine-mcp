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
      unit_number: u.number ?? u.unitNumber ?? u.name,
      address: u.address,
      status: u.status ?? (u.isVacant ? "vacant" : "occupied"),
      rent: u.rent ?? u.marketRent,
      deposit: u.deposit,
      beds: u.beds,
      baths: u.fullBaths,
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
