# rentvine-mcp

MCP server for [Rentvine](https://rentvine.com) — gives Claude (and any MCP client) live access to your property management data.

## Tools

| Tool | Description |
|---|---|
| `list_properties` | All properties with address and unit count |
| `list_leases` | All leases with tenant, rent, dates, and status |
| `list_units` | Units for a named property with vacancy and rent |
| `list_applications` | Rental applications with applicant and status |
| `list_inspections` | Maintenance inspections with date and inspector |
| `list_work_orders` | Work orders with status and priority |
| `get_tenant_balance` | Ledger balance for a named tenant |

## Setup

Get your API credentials from Rentvine → Settings → Users, Roles & API.

```bash
git clone https://github.com/hchittanuru3/rentvine-mcp
cd rentvine-mcp
pip install -e .
```

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "rentvine": {
      "command": "rentvine-mcp",
      "env": {
        "RENTVINE_API_KEY": "your_api_key",
        "RENTVINE_API_SECRET": "your_api_secret",
        "RENTVINE_COMPANY": "your_subdomain"
      }
    }
  }
}
```

Then restart Claude Desktop. You'll see a hammer icon — ask Claude anything about your portfolio.

## Claude Code

Add to `~/.claude/claude_desktop_config.json` (or your project's `.mcp.json`):

```json
{
  "mcpServers": {
    "rentvine": {
      "command": "rentvine-mcp",
      "env": {
        "RENTVINE_API_KEY": "your_api_key",
        "RENTVINE_API_SECRET": "your_api_secret",
        "RENTVINE_COMPANY": "your_subdomain"
      }
    }
  }
}
```

## Other clients (Telegram bot, custom scripts)

Run as a subprocess and communicate over stdio — same protocol any MCP client uses:

```bash
RENTVINE_API_KEY=... RENTVINE_API_SECRET=... RENTVINE_COMPANY=... rentvine-mcp
```

Or use the `mcp` Python SDK to connect to it programmatically:

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="rentvine-mcp",
    env={
        "RENTVINE_API_KEY": "...",
        "RENTVINE_API_SECRET": "...",
        "RENTVINE_COMPANY": "...",
    },
)

async with stdio_client(server_params) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()
        result = await session.call_tool("list_leases", {})
        print(result)
```
