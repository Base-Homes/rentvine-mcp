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
