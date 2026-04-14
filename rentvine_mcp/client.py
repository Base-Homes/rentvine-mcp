"""Rentvine API client — reads credentials from environment variables."""
import base64
import os

import httpx


def _get_client_args() -> tuple[str, dict]:
    """Returns (base_url, headers) from environment variables."""
    api_key = os.environ.get("RENTVINE_API_KEY", "")
    api_secret = os.environ.get("RENTVINE_API_SECRET", "")
    company = os.environ.get("RENTVINE_COMPANY", "")
    if not (api_key and api_secret and company):
        raise ValueError(
            "Rentvine credentials incomplete. "
            "Set RENTVINE_API_KEY, RENTVINE_API_SECRET, and RENTVINE_COMPANY."
        )
    base_url = f"https://{company}.rentvine.com/api/manager"
    token = base64.b64encode(f"{api_key}:{api_secret}".encode()).decode()
    headers = {"Authorization": f"Basic {token}", "Accept": "application/json"}
    return base_url, headers


def _unwrap(data) -> list[dict]:
    """Rentvine may return a bare list or a {data: [...]} / {results: [...]} envelope."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return data.get("data") or data.get("results") or []
    return []


async def fetch_properties() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/properties")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_tenants() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/tenants")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_work_orders() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/maintenance/work-orders")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_leases() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/leases")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_units(property_rentvine_id: str) -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/properties/{property_rentvine_id}/units")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_applications() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/applications")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_inspections() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/maintenance/inspections")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_owners() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/owners")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_portfolios() -> list[dict]:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(f"{base_url}/portfolios")
        resp.raise_for_status()
        return _unwrap(resp.json())


async def fetch_tenant_balance(tenant_rentvine_id: str) -> dict:
    base_url, headers = _get_client_args()
    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(
            f"{base_url}/accounting/ledgers/search",
            params={"tenantId": tenant_rentvine_id},
        )
        resp.raise_for_status()
        return resp.json()
