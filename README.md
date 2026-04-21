# rentvine-mcp

MCP server for [Rentvine](https://rentvine.com) — gives Claude (and any MCP client) live access to your property management data.

## Available Tools

| Tool | Description |
|---|---|
| `list_properties` | All properties with address, type, and active status |
| `list_units` | Units for a named property with vacancy and rent |
| `list_leases` | All leases with tenant, rent, dates, and status |
| `list_applications` | Rental applications with applicant and status |
| `list_inspections` | Maintenance inspections with date and inspector |
| `list_work_orders` | Work orders with status and priority |
| `create_work_order` | Create a new maintenance work order |
| `update_work_order` | Update status, priority, cost, or scheduling on a work order |
| `get_tenant_balance` | Ledger balance for a named tenant |
| `list_owners` | All property owners |
| `list_vendors` | All vendors |
| `list_portfolios` | All portfolios |
| `list_bills` | All bills |
| `create_bill` | Create a new bill |
| `search_transactions` | Search accounting transactions by date, amount, or keyword |
| `list_accounts` | Chart of accounts |
| `list_object_types` | Rentvine object type IDs (for file attachment) |
| `upload_file` | Upload a file and attach it to a property, unit, lease, or work order |

---

## Install

You'll need your Rentvine API credentials: **Settings → Users, Roles & API**.

### Claude Desktop (easiest — no terminal)

1. Download **[rentvine-mcp.dxt](https://github.com/hchittanuru3/rentvine-mcp/releases/latest)** from the latest release.
2. Open **Claude Desktop → Settings → Extensions**.
3. Drag the `.dxt` file onto the window.
4. Paste your Rentvine API key, secret, and subdomain when prompted. Done.

No Python, no Node, no terminal. Nothing to install.

### Claude Code, Cursor, Windsurf, VS Code, etc. (one-line config)

Add this to your MCP client's config. The `npx` command downloads and runs the server on demand:

```json
{
  "mcpServers": {
    "rentvine": {
      "command": "npx",
      "args": ["-y", "rentvine-mcp"],
      "env": {
        "RENTVINE_API_KEY": "your_api_key",
        "RENTVINE_API_SECRET": "your_api_secret",
        "RENTVINE_COMPANY": "your_subdomain"
      }
    }
  }
}
```

Requires Node.js 18+. Config file locations:

- **Claude Code** — `~/.claude/claude_desktop_config.json` (global) or `.mcp.json` (project-scoped)
- **Cursor** — Settings → MCP → Add new server
- **Windsurf** — `~/.codeium/windsurf/mcp_config.json`
- **VS Code (Copilot)** — `.vscode/mcp.json` in your workspace
- **Continue** — `~/.continue/config.json`

Restart your client after editing. You should see `rentvine` show up with all 18 tools.

### Your own MCP host (e.g. a custom agent)

If you're embedding MCP servers in your own app (stdio transport), use the same command:

```js
{
  command: "npx",
  args: ["-y", "rentvine-mcp"],
  env: { RENTVINE_API_KEY: "...", RENTVINE_API_SECRET: "...", RENTVINE_COMPANY: "..." }
}
```

### ChatGPT (Business / Enterprise / Edu — Developer Mode)

ChatGPT accepts remote MCP servers over HTTPS, so you need to deploy the HTTP variant somewhere the internet can reach. Each deployment is scoped to one Rentvine account (its credentials live in env vars on the server).

**1. Deploy the HTTP server.** Build from the included `Dockerfile` and deploy to any container host (Fly.io, Render, Railway, Google Cloud Run, AWS App Runner, Heroku, etc.). Set these env vars on the deployment:

| Variable | Value |
|---|---|
| `RENTVINE_API_KEY` | Your Rentvine API key |
| `RENTVINE_API_SECRET` | Your Rentvine API secret |
| `RENTVINE_COMPANY` | Your subdomain |
| `MCP_AUTH_TOKEN` | A long random string you generate (e.g. `openssl rand -hex 32`) — **required** when binding to any non-loopback interface (the server will refuse to start without it) |
| `PORT` | Whatever port your host expects (most default to 3000 or 8080) |

Local smoke test:

```bash
npm install && npm run build
MCP_AUTH_TOKEN=test RENTVINE_API_KEY=... RENTVINE_API_SECRET=... RENTVINE_COMPANY=... \
  node dist/http.js
```

**2. Add the server in ChatGPT.** An admin must enable Developer Mode in **Workspace Settings → Permissions & Roles → Developer Mode**, then any member can add the connector:

- ChatGPT → **Settings → Connectors → Advanced → Add custom MCP server**
- URL: `https://your-deployment.example.com/mcp`
- Auth: `Bearer` → paste the `MCP_AUTH_TOKEN` value

**3. Use it.** In a new chat, pick **Developer mode** from the Plus menu and select the `rentvine` connector. ChatGPT will show explicit confirmation modals before any tool call runs.

Not available on ChatGPT Plus or Free — custom MCP connectors are gated to Business / Enterprise / Edu workspaces as of April 2026.

---

## Environment Variables

| Variable | Description |
|---|---|
| `RENTVINE_API_KEY` | Your Rentvine API key |
| `RENTVINE_API_SECRET` | Your Rentvine API secret |
| `RENTVINE_COMPANY` | Your subdomain (e.g. `acme` for `acme.rentvine.com`) |
| `MCP_AUTH_TOKEN` | Bearer token for the HTTP transport. Required when `HOST` is not loopback. Generate with `openssl rand -hex 32`. |
| `PORT` | HTTP server port (default: `3000`) |
| `HOST` | HTTP server bind address (default: `0.0.0.0`). Use `127.0.0.1` for local-only without auth. |

---

## Testing

After install, ask Claude things like:

```
List all my properties.
How many units are vacant across all properties?
Which leases expire in the next 60 days?
Show me all open work orders sorted by priority.
What is the balance for tenant [name]?
Create a work order for the leaking roof at 123 Main St, high priority.
Upload this invoice and attach it to work order #1042.
Show me all unpaid bills.
```

---

## Development

```bash
git clone https://github.com/Base-Homes/rentvine-mcp
cd rentvine-mcp
npm install
npm run build
node dist/index.js    # runs the server on stdio
```

To build a fresh `.dxt`:

```bash
npm run build
npm prune --omit=dev
npx @anthropic-ai/dxt pack . rentvine-mcp.dxt
npm install           # restore dev deps
```

## Troubleshooting

**Extension won't install / hammer icon missing in Claude Desktop** — check **Settings → Extensions** for error details. Most common cause: Node 18+ not available. Claude Desktop bundles Node, so if this fails, restart the app fully (Cmd+Q).

**401 Unauthorized** — wrong API key, secret, or subdomain. Verify in Rentvine → Settings → Users, Roles & API.

**Empty results** — your Rentvine account may have no data in that category, or the API returned an unexpected envelope format.
