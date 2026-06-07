# Contributing to attest-mcp

Thanks for your interest in improving the Attest MCP server.

This package is intentionally a **thin client**: it exposes Attest's tools over the Model Context Protocol and forwards requests to the hosted API at `https://attestagent.org`. The scoring engine, heuristics, and data are **not** part of this repository and live server-side. Please keep contributions focused on the client (transport, tool ergonomics, docs, compatibility).

## Development

```bash
npm install
npm run build      # compile TypeScript to dist/
npm start          # run the compiled server over stdio
```

To test against a non-production API while developing:

```bash
ATTEST_BASE_URL="https://your-staging-host" npm start
```

## Guidelines

- Keep dependencies minimal — only the official MCP SDK and a validation library.
- Never log to **stdout**; it is reserved for the MCP JSON-RPC stream. Use `stderr` (`console.error`) for diagnostics.
- Validate all tool inputs.
- Do not add any scoring/grading logic, secrets, or credentials to this repo.
- Run `npm run build` and confirm it compiles cleanly before opening a PR.

## Reporting issues

Open a GitHub issue with steps to reproduce, your client (Claude, Cursor, etc.), Node.js version, and any relevant `stderr` output.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
