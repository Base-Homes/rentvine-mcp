# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An MCP server that exposes Rentvine property management data (properties, leases, units, work orders, applications, inspections, tenant balances) as tools for Claude Desktop, Claude Code, Cursor, Windsurf, VS Code, and any other MCP client. TypeScript, published as `rentvine-mcp` on npm and as a `.dxt` extension for Claude Desktop.

## Architecture

Layers under `src/`:

- `client.ts` — raw HTTP against the Rentvine `/api/manager` endpoints, Basic auth from `RENTVINE_API_KEY` / `RENTVINE_API_SECRET` / `RENTVINE_COMPANY` env vars
- `tools.ts` — domain-level formatting (envelope unwrapping, status-ID translation, HTML stripping for descriptions). One function per MCP tool.
- `createServer.ts` — builds the `McpServer` instance and registers all 7 tools. Shared by both entrypoints.
- `index.ts` — stdio entrypoint. This is what Claude Desktop / Claude Code / Cursor / etc. spawn as a subprocess.
- `http.ts` — Streamable HTTP entrypoint for ChatGPT Developer Mode and other remote MCP clients. Express server with bearer-token auth, session management via `mcp-session-id` header. Requires `MCP_AUTH_TOKEN` env var when exposed publicly.

Both entrypoints go through `createServer()` — if you add/change a tool, it shows up everywhere.

## Key pattern: Rentvine envelope unwrapping

Rentvine's API inconsistently wraps entities in envelope objects — e.g. a properties response can be `[{property: {...}}, ...]` or `[{...}, ...]`. Every tool handler uses a `row.property ?? row` pattern to handle both. Same applies for `unit`, `contact`, `lease`, `workOrder` envelopes. When adding a new tool, match this — don't assume the API returns bare objects.

## Common commands

```bash
npm install          # install deps
npm run build        # compile src/ → dist/
node dist/index.js   # run server on stdio (needs RENTVINE_* env vars)
```

### Test locally before publishing

1. **Drag-drop the local `.dxt`** into Claude Desktop → Settings → Extensions — tests the full end-user flow
2. **Point any MCP client at `dist/index.js`** — edit the client's config to `"command": "node", "args": ["/abs/path/to/dist/index.js"]`
3. **MCP Inspector** — `npx @modelcontextprotocol/inspector node dist/index.js` opens a browser UI for invoking tools individually

### Build a `.dxt` locally

```bash
npm run build
npm prune --omit=dev                              # strip devDeps so the .dxt isn't bloated
npx @anthropic-ai/dxt pack . rentvine-mcp.dxt
npm install                                       # restore devDeps
```

Without pruning first the `.dxt` balloons from ~2MB to ~25MB (bundles typescript).

## Release flow

Two ways, both land at the same place (npm + GitHub release with `.dxt` attached):

- **GitHub Actions UI** — Actions → Release workflow → Run workflow → pick patch/minor/major
- **Local** — `npm version patch && git push --follow-tags`

The `version` script in `package.json` auto-syncs `manifest.json` to match. The workflow (`.github/workflows/release.yml`) verifies tag matches `package.json` version, publishes to npm with provenance, packs the `.dxt`, and attaches it to a GitHub release.

Requires repo secret `NPM_TOKEN` (npm Automation token — bypasses 2FA by design). npm provenance also requires `repository.url` in `package.json` to match the GitHub repo URL.

