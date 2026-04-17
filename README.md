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

## Prerequisites

- Python 3.11+
- Rentvine API credentials (Settings → Users, Roles & API)

```bash
git clone https://github.com/hchittanuru3/rentvine-mcp
cd rentvine-mcp
pip install -e .
```

This installs a `rentvine-mcp` command on your PATH.

### Environment Variables

| Variable | Description |
|---|---|
| `RENTVINE_API_KEY` | Your Rentvine API key |
| `RENTVINE_API_SECRET` | Your Rentvine API secret |
| `RENTVINE_COMPANY` | Your subdomain (e.g. `acme` for `acme.rentvine.com`) |

---

## Integrations

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

Restart Claude Desktop. A hammer icon appears when the server connects — ask Claude anything about your portfolio.

---

### Claude Code (CLI)

Add to `~/.claude/claude_desktop_config.json` for global access, or create `.mcp.json` in your project root for project-scoped access:

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

Then in your terminal:

```bash
claude "Which leases expire this month?"
```

---

### Cursor

Open Cursor Settings → MCP → Add new server:

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

Restart Cursor. In the AI chat panel you can now ask things like "Show me all open work orders."

---

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

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

---

### VS Code (GitHub Copilot / Continue)

For **Continue** extension, edit `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "rentvine",
      "command": "rentvine-mcp",
      "env": {
        "RENTVINE_API_KEY": "your_api_key",
        "RENTVINE_API_SECRET": "your_api_secret",
        "RENTVINE_COMPANY": "your_subdomain"
      }
    }
  ]
}
```

For **GitHub Copilot** (VS Code MCP support), add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "rentvine": {
      "type": "stdio",
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

---

### Custom Python Script

Use the `mcp` SDK to call tools directly from any Python application:

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

server_params = StdioServerParameters(
    command="rentvine-mcp",
    env={
        "RENTVINE_API_KEY": "your_api_key",
        "RENTVINE_API_SECRET": "your_api_secret",
        "RENTVINE_COMPANY": "your_subdomain",
    },
)

async def main():
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            leases = await session.call_tool("list_leases", {})
            print(leases)

            balance = await session.call_tool(
                "get_tenant_balance", {"tenant_name": "Jane Smith"}
            )
            print(balance)

asyncio.run(main())
```

Install the dependency: `pip install mcp`

---

### Telegram Bot

The `examples/telegram/` directory contains a ready-to-run bot that pairs Claude with Rentvine data.

```bash
cd examples/telegram
pip install -r requirements.txt
```

Create a `.env` file:

```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
ANTHROPIC_API_KEY=your_anthropic_api_key
RENTVINE_API_KEY=your_api_key
RENTVINE_API_SECRET=your_api_secret
RENTVINE_COMPANY=your_subdomain
ALLOWED_TELEGRAM_USER_IDS=123456789
```

`ALLOWED_TELEGRAM_USER_IDS` is a comma-separated list of Telegram user IDs that are allowed to use the bot. Anyone not on the list gets an "Unauthorized." response. To find your Telegram user ID, message [@userinfobot](https://t.me/userinfobot).

Run it:

```bash
python bot.py
```

Users can message the bot things like "How many vacant units do I have?" and Claude will call the appropriate tools and reply.

To get a Telegram bot token: message [@BotFather](https://t.me/BotFather) on Telegram and use `/newbot`.

---

### Any MCP-Compatible Client (stdio)

Run the server as a subprocess and communicate over stdio — the standard MCP transport:

```bash
RENTVINE_API_KEY=... RENTVINE_API_SECRET=... RENTVINE_COMPANY=... rentvine-mcp
```

Any client that speaks the [MCP protocol](https://modelcontextprotocol.io) over stdio can connect to it.

---

## Testing with Claude Desktop

**1. Edit the config file:**

```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Add the `rentvine` server (create the file if it doesn't exist):

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

**2. Restart Claude Desktop** — quit fully (Cmd+Q) and reopen.

**3. Confirm the server loaded** — look for the hammer icon (🔨) in the bottom-left of the chat input. Click it to see `rentvine` listed with all 7 tools.

**4. Run a smoke test** — type in the chat:

```
List all my properties.
```

Claude will call `list_properties` and return your live portfolio data.

**5. Try the full tool suite:**

```
How many units are vacant across all properties?
Which leases expire in the next 60 days?
Show me all open work orders sorted by priority.
What is the balance for tenant [name]?
```

---

## Troubleshooting

**Hammer icon not showing** — the server failed to start. Open Claude Desktop → Settings → Developer to see the error log. Most common cause: `rentvine-mcp` not on PATH. Fix with `pip install -e .` from the repo root, then confirm with `which rentvine-mcp`.

**401 Unauthorized** — wrong API key, secret, or company subdomain. Verify in Rentvine → Settings → Users, Roles & API.

**Empty results** — your Rentvine account may have no data in that category, or the API returned an unexpected envelope format.
