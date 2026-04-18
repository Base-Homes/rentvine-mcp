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

async function get(path: string, params?: Record<string, string>): Promise<unknown> {
  const { baseUrl, headers } = getClientArgs();
  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const resp = await fetch(url, { headers, signal: controller.signal });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Rentvine ${resp.status} ${resp.statusText}: ${body.slice(0, 200)}`);
    }
    return await resp.json();
  } finally {
    clearTimeout(timeout);
  }
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
