# Attest MCP Server

[![npm version](https://img.shields.io/npm/v/attest-mcp.svg)](https://www.npmjs.com/package/attest-mcp)
[![npm downloads](https://img.shields.io/npm/dm/attest-mcp.svg)](https://www.npmjs.com/package/attest-mcp)
[![License: MIT](https://img.shields.io/npm/l/attest-mcp.svg)](./LICENSE)
[![Node.js](https://img.shields.io/node/v/attest-mcp.svg)](https://nodejs.org)

**Trust scanning for agent payments — right inside your AI agent.**

`attest-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that lets any MCP-compatible agent (Claude, Cursor, Windsurf, VS Code, and more) scan an agent payment endpoint and get back a letter grade **A–F** with a clear safety verdict **before authorizing a single cent**.

It covers the agentic payment protocols in use today: **x402, MPP, AP2, L402, and HTTP&nbsp;402**.

> Powered by [Attest](https://attestagent.org). The scoring engine runs entirely on Attest's servers — this package is a thin client that relays requests, so installing it never exposes any proprietary grading logic.

---

## Why

Autonomous agents are starting to pay for things on their own. A single malicious or misconfigured endpoint can drain funds through impersonation, a blocklisted payout wallet, bait-and-switch pricing, or a broken payment handshake. `attest-mcp` gives your agent a fast, deterministic safety check it can run as a step in its payment loop.

## Tools

| Tool | What it does |
|------|--------------|
| `attest_scan` | Runs a full scan on a payment endpoint URL and returns a grade (A–F), a composite score (0–100), a verdict, danger flags, price, and a link to the full report. Call this before paying an unfamiliar endpoint. |
| `attest_grade` | Fast lookup of the most recent grade for a host that has already been scanned. Good for a quick pre-check. |

## Requirements

- Node.js **18 or newer**
- Any MCP-compatible client

No API key required.

## Quick start

Run it directly with `npx` (no install needed):

```bash
npx attest-mcp
```

The server speaks MCP over stdio, so you normally don't run it by hand — you point your MCP client at it using one of the configs below.

## Client setup

### Claude Desktop

Edit `claude_desktop_config.json` (Settings → Developer → Edit Config):

```json
{
  "mcpServers": {
    "attest": {
      "command": "npx",
      "args": ["-y", "attest-mcp"]
    }
  }
}
```

### Cursor

Add to `~/.cursor/mcp.json` (or **Settings → MCP → Add new server**):

```json
{
  "mcpServers": {
    "attest": {
      "command": "npx",
      "args": ["-y", "attest-mcp"]
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "attest": {
      "command": "npx",
      "args": ["-y", "attest-mcp"]
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "attest": {
      "command": "npx",
      "args": ["-y", "attest-mcp"]
    }
  }
}
```

### Any other MCP client

Use the command `npx -y attest-mcp` with the **stdio** transport.

## Remote server (no install)

Prefer not to install anything? Attest also runs a hosted MCP server you can connect to over Streamable HTTP:

```
https://attestagent.org/api/mcp
```

Point any remote-MCP-capable client at that URL.

## Usage example

Once connected, just ask your agent in natural language:

> "Before you pay, scan `https://api.example.com/paid-resource` with Attest."

The agent calls `attest_scan` and gets back something like:

```json
{
  "host": "api.example.com",
  "grade": "A",
  "composite": 95,
  "danger": false,
  "verdict": "Valid endpoint, established host.",
  "priceHuman": "0.01 USDC",
  "reportUrl": "https://attestagent.org/r/abc-123"
}
```

## Configuration

| Environment variable | Default | Description |
|----------------------|---------|-------------|
| `ATTEST_BASE_URL` | `https://attestagent.org` | Override the Attest API base URL. Only needed for self-hosting or testing. |

## Security & privacy

- **No secrets, no accounts, no API keys.** The server holds no credentials.
- **No proprietary logic ships here.** Grading happens server-side; this package only relays requests and formats responses.
- **Inputs are validated** before any request is made.
- **Outbound only.** The server makes HTTPS requests to the Attest API and speaks MCP over stdio — it opens no inbound ports.
- Scanned URLs and results are logged to Attest's public directory. Do not scan endpoints whose URL or response contains private or sensitive information. See [attestagent.org/legal](https://attestagent.org/legal).

## Links

- Website: [attestagent.org](https://attestagent.org)
- Developer docs: [attestagent.org/developers](https://attestagent.org/developers)
- Methodology: [attestagent.org/methodology](https://attestagent.org/methodology)
- X / Twitter: [@Attestagent](https://x.com/Attestagent)

## Contributing

Issues and pull requests are welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Attest
