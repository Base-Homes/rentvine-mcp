# rentvine-mcp

MCP server for [Rentvine](https://rentvine.com) — gives Claude (and any MCP client) live access to your property management data.

## Available Tools

| Tool | Description |
|---|---|
| `list_properties` | All properties with address, type, and active status |
| `list_leases` | All leases with tenant, rent, dates, and status |
| `list_units` | Units for a named property with vacancy and rent |
| `list_applications` | Rental applications with applicant and status |
| `list_inspections` | Maintenance inspections with date and inspector |
| `list_work_orders` | Work orders with status and priority |
| `get_tenant_balance` | Ledger balance for a named tenant |

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

Restart your client after editing. You should see `rentvine` show up with all 7 tools.

### Your own MCP host (e.g. a custom agent)

If you're embedding MCP servers in your own app (stdio transport), use the same command:

```js
{
  command: "npx",
  args: ["-y", "rentvine-mcp"],
  env: { RENTVINE_API_KEY: "...", RENTVINE_API_SECRET: "...", RENTVINE_COMPANY: "..." }
}
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `RENTVINE_API_KEY` | Your Rentvine API key |
| `RENTVINE_API_SECRET` | Your Rentvine API secret |
| `RENTVINE_COMPANY` | Your subdomain (e.g. `acme` for `acme.rentvine.com`) |

---

## Testing

After install, ask Claude things like:

```
List all my properties.
How many units are vacant across all properties?
Which leases expire in the next 60 days?
Show me all open work orders sorted by priority.
What is the balance for tenant [name]?
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

### Telegram Bot (example)

`examples/telegram/` contains a ready-to-run bot that pairs Claude with Rentvine data. See `examples/telegram/README.md`.

---

## Troubleshooting

**Extension won't install / hammer icon missing in Claude Desktop** — check **Settings → Extensions** for error details. Most common cause: Node 18+ not available. Claude Desktop bundles Node, so if this fails, restart the app fully (Cmd+Q).

**401 Unauthorized** — wrong API key, secret, or subdomain. Verify in Rentvine → Settings → Users, Roles & API.

**Empty results** — your Rentvine account may have no data in that category, or the API returned an unexpected envelope format.
