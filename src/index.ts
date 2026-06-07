#!/usr/bin/env node
/**
 * attest-mcp — Model Context Protocol server for Attest.
 *
 * This is a thin client. It exposes Attest's trust tools over MCP (stdio) and
 * forwards every request to the hosted Attest API at https://attestagent.org.
 * No scoring logic, heuristics, or proprietary data live in this package — the
 * grading engine runs entirely server-side. This server only relays requests
 * and formats responses.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const VERSION = "1.0.0";
const DEFAULT_BASE_URL = "https://attestagent.org";
const REQUEST_TIMEOUT_MS = 30_000;
const USER_AGENT = `attest-mcp/${VERSION} (+https://attestagent.org)`;

/** Resolve the Attest API base URL, allowing an override for self-hosting/testing. */
function baseUrl(): string {
  const raw = process.env["ATTEST_BASE_URL"]?.trim();
  if (!raw) return DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

type FetchResult =
  | { ok: true; status: number; data: unknown }
  | { ok: false; status: number; data: unknown };

/** Fetch JSON from the Attest API with a timeout and a clear User-Agent. */
async function apiFetch(path: string, init: RequestInit = {}): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function networkMessage(err: unknown): string {
  if (err instanceof Error && err.name === "AbortError") {
    return "The request to Attest timed out. Please try again.";
  }
  return "Could not reach the Attest service. Check your network connection and try again.";
}

function textError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/** Best-effort extraction of a hostname from a host or full URL string. */
function toHost(input: string): string {
  const trimmed = input.trim();
  try {
    if (/^https?:\/\//i.test(trimmed)) return new URL(trimmed).hostname;
    return new URL(`https://${trimmed}`).hostname;
  } catch {
    return trimmed.replace(/^https?:\/\//i, "").split("/")[0] ?? trimmed;
  }
}

function buildServer(): McpServer {
  const server = new McpServer({ name: "attest", version: VERSION });

  server.registerTool(
    "attest_scan",
    {
      title: "Scan a payment endpoint",
      description:
        "Scan an agent payment endpoint (x402 / MPP / AP2 / L402 / HTTP 402) and return a letter grade A–F with a safety verdict. Call this BEFORE authorizing a payment to an unfamiliar endpoint to check for impersonation, blocklisted payout wallets, bait-and-switch pricing, and protocol problems.",
      inputSchema: {
        url: z
          .string()
          .url()
          .describe(
            "The full URL of the payment endpoint to scan, e.g. https://api.example.com/resource",
          ),
      },
      outputSchema: {
        url: z.string(),
        host: z.string(),
        grade: z.string(),
        composite: z.number(),
        danger: z.boolean(),
        verdict: z.string(),
        priceHuman: z.string().nullable().optional(),
        reportUrl: z.string(),
      },
    },
    async ({ url }) => {
      try {
        const res = await apiFetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const data = res.data as Record<string, unknown> | null;
        if (!res.ok || !data) {
          const msg =
            (data && typeof data["error"] === "string" && (data["error"] as string)) ||
            `The endpoint could not be scanned (HTTP ${res.status}).`;
          return textError(msg);
        }
        const slug = typeof data["slug"] === "string" ? (data["slug"] as string) : "";
        const summary = {
          url: String(data["url"] ?? url),
          host: String(data["host"] ?? toHost(url)),
          grade: String(data["grade"] ?? "F"),
          composite: Number(data["composite"] ?? 0),
          danger: Boolean(data["danger"]),
          verdict: String(data["verdict"] ?? ""),
          priceHuman:
            typeof data["priceHuman"] === "string" ? (data["priceHuman"] as string) : null,
          reportUrl: slug ? `${baseUrl()}/r/${slug}` : baseUrl(),
        };
        const headline = `${summary.host} graded ${summary.grade} (${summary.composite}/100). ${summary.verdict}`;
        return {
          content: [
            { type: "text" as const, text: headline },
            { type: "text" as const, text: JSON.stringify(summary, null, 2) },
          ],
          structuredContent: summary,
        };
      } catch (err) {
        return textError(networkMessage(err));
      }
    },
  );

  server.registerTool(
    "attest_grade",
    {
      title: "Look up a host's latest grade",
      description:
        "Quickly look up the most recent Attest grade for a host that has already been scanned. Useful for a fast pre-check. If the host has never been scanned, use attest_scan instead.",
      inputSchema: {
        host: z
          .string()
          .min(1)
          .describe("The hostname to look up, e.g. api.example.com (a full URL is also accepted)."),
      },
      outputSchema: {
        host: z.string(),
        grade: z.string(),
        composite: z.number(),
        danger: z.boolean(),
        slug: z.string().nullable().optional(),
        scannedAt: z.string().nullable().optional(),
      },
    },
    async ({ host }) => {
      const cleanHost = toHost(host);
      try {
        const res = await apiFetch(`/api/grade/${encodeURIComponent(cleanHost)}`);
        const data = res.data as Record<string, unknown> | null;
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: `${cleanHost} has not been graded yet. Run attest_scan on its payment endpoint URL to grade it.`,
              },
            ],
          };
        }
        if (!res.ok || !data) {
          const msg =
            (data && typeof data["error"] === "string" && (data["error"] as string)) ||
            `Could not look up that host (HTTP ${res.status}).`;
          return textError(msg);
        }
        const summary = {
          host: String(data["host"] ?? cleanHost),
          grade: String(data["grade"] ?? "F"),
          composite: Number(data["composite"] ?? 0),
          danger: Boolean(data["danger"]),
          slug: typeof data["slug"] === "string" ? (data["slug"] as string) : null,
          scannedAt:
            typeof data["scannedAt"] === "string" ? (data["scannedAt"] as string) : null,
        };
        return {
          content: [
            {
              type: "text" as const,
              text: `${summary.host} is graded ${summary.grade} (${summary.composite}/100).`,
            },
            { type: "text" as const, text: JSON.stringify(summary, null, 2) },
          ],
          structuredContent: summary,
        };
      } catch (err) {
        return textError(networkMessage(err));
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for the JSON-RPC stream.
  console.error(`attest-mcp ${VERSION} ready (api: ${baseUrl()})`);
}

main().catch((err) => {
  console.error("[attest-mcp] fatal:", err);
  process.exit(1);
});
