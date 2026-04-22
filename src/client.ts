function getClientArgs(): { baseUrl: string; headers: Record<string, string> } {
  const apiKey = process.env.RENTVINE_API_KEY ?? "";
  const apiSecret = process.env.RENTVINE_API_SECRET ?? "";
  const company = process.env.RENTVINE_COMPANY ?? "";
  if (!apiKey || !apiSecret || !company) {
    throw new Error(
      "Rentvine credentials incomplete. Set RENTVINE_API_KEY, RENTVINE_API_SECRET, and RENTVINE_COMPANY."
    );
  }
  const baseUrl = `https://${company}.rentvine.com/api/manager`;
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");
  const headers = {
    Authorization: `Basic ${token}`,
    Accept: "application/json",
  };
  return { baseUrl, headers };
}

function unwrap(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const inner = obj.data ?? obj.results;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

async function request(
  method: string,
  path: string,
  opts: { params?: Record<string, string>; body?: unknown } = {}
): Promise<unknown> {
  const { baseUrl, headers } = getClientArgs();
  const url = new URL(`${baseUrl}${path}`);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const init: RequestInit = {
    method,
    headers: {
      ...headers,
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    signal: controller.signal,
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);
  try {
    const resp = await fetch(url, init);
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Rentvine ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`);
    }
    const text = await resp.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } finally {
    clearTimeout(timeout);
  }
}

async function get(path: string, params?: Record<string, string>): Promise<unknown> {
  return request("GET", path, { params });
}

export async function fetchProperties() {
  return unwrap(await get("/properties"));
}

export async function fetchTenants() {
  return unwrap(await get("/tenants"));
}

export async function fetchWorkOrders() {
  return unwrap(await get("/maintenance/work-orders"));
}

export async function fetchLeases() {
  return unwrap(await get("/leases"));
}

export async function fetchUnits(propertyRentvineId: string) {
  return unwrap(await get(`/properties/${propertyRentvineId}/units`));
}

export async function fetchApplications() {
  return unwrap(await get("/applications"));
}

export async function fetchInspections() {
  return unwrap(await get("/maintenance/inspections"));
}

export async function fetchTenantBalance(tenantRentvineId: string): Promise<unknown> {
  return await get("/accounting/ledgers/search", { tenantId: tenantRentvineId });
}

export async function fetchOwners() {
  return unwrap(await get("/owners/search"));
}

export async function fetchVendors() {
  return unwrap(await get("/vendors/search"));
}

export async function fetchPortfolios() {
  return unwrap(await get("/portfolios"));
}

export async function fetchBills() {
  return unwrap(await get("/accounting/bills"));
}

export async function createBill(body: Record<string, unknown>): Promise<unknown> {
  return await request("POST", "/accounting/bills", { body });
}

export async function searchTransactions(params: Record<string, string>): Promise<unknown> {
  return await get("/accounting/transactions/search", params);
}

export async function fetchAccounts() {
  return unwrap(await get("/accounting/accounts"));
}

export async function fetchObjectTypes() {
  return unwrap(await get("/object-types"));
}

export async function fetchFiles(objectId?: number, objectTypeId?: number) {
  const params: Record<string, string> = { includes: "attachment" };
  if (objectId !== undefined) params.objectID = String(objectId);
  if (objectTypeId !== undefined) params.objectTypeID = String(objectTypeId);
  return unwrap(await get("/files", params));
}

export async function fetchFile(fileId: string | number): Promise<unknown> {
  return await get(`/files/${fileId}`, { includes: "attachment" });
}

export async function downloadFileBinary(
  fileId: string | number
): Promise<{ contentType: string; buffer: Buffer }> {
  const { baseUrl, headers } = getClientArgs();
  const url = new URL(`${baseUrl}/files/${fileId}/download`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: { Authorization: headers.Authorization },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Rentvine ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`);
    }
    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    const arrayBuffer = await resp.arrayBuffer();
    return { contentType, buffer: Buffer.from(arrayBuffer) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function uploadFile(
  fileContent: Buffer,
  fileName: string,
  objectId?: number,
  objectTypeId?: number
): Promise<unknown> {
  const { baseUrl, headers } = getClientArgs();
  const url = new URL(`${baseUrl}/files`);
  if (objectId !== undefined) url.searchParams.set("objectID", String(objectId));
  if (objectTypeId !== undefined) url.searchParams.set("objectTypeID", String(objectTypeId));
  url.searchParams.set("includes", "attachment");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(fileContent)]), fileName);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: headers.Authorization },
      body: form,
      signal: controller.signal,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Rentvine ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`);
    }
    const text = await resp.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
  } finally {
    clearTimeout(timeout);
  }
}

export async function createWorkOrder(
  body: Record<string, unknown>
): Promise<unknown> {
  // Create contract mirrors update: POST to the collection path, bare body
  // (no { workOrder: {...} } envelope). Minimal required fields are
  // description, propertyID, and priorityID — Rentvine auto-fills unitID
  // from the property and defaults primaryWorkOrderStatusID to 1 (open).
  return await request("POST", "/maintenance/work-orders", { body });
}

export async function updateWorkOrder(
  workOrderId: string,
  updates: Record<string, unknown>
): Promise<unknown> {
  // Rentvine's update contract is POST (not PUT/PATCH) to the singular
  // resource path, with a *bare* body — no { workOrder: {...} } envelope, even
  // though reads return one. Envelope POSTs return 200 but silently no-op.
  // Partial bodies are honored; only send the fields you want to change.
  return await request("POST", `/maintenance/work-orders/${workOrderId}`, {
    body: updates,
  });
}
