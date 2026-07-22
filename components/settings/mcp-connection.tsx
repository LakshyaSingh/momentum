"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Snippet = { label: string; language: string; code: string };

function useCopy() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      /* clipboard unavailable — no-op */
    }
  }
  return { copiedKey, copy };
}

export function McpConnection({ mcpUrl }: { mcpUrl: string }) {
  const { copiedKey, copy } = useCopy();

  const snippets: Snippet[] = [
    {
      label: "Claude Code",
      language: "bash",
      code: `claude mcp add --transport http momentum ${mcpUrl}`,
    },
    {
      label: "Codex CLI",
      language: "bash",
      code: `codex mcp add momentum --url ${mcpUrl}`,
    },
    {
      label: "Cursor / JSON clients",
      language: "json",
      code: `{
  "mcpServers": {
    "momentum": {
      "url": "${mcpUrl}"
    }
  }
}`,
    },
  ];

  return (
    <div>
      <div>
        <h2 className="text-base font-semibold tracking-tight">Connections</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect an AI agent (Claude, Cursor, Codex, …) to your tracker over MCP.
          The first connection opens a sign-in and consent screen.
        </p>

        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {[
            "Add applications automatically — e.g. from a “thanks for applying” email",
            "Update status & details — mark rejections, interviews, and offers",
            "Search your applications and answer questions about your job search",
          ].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden className="mt-0.5 text-foreground/40">
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator className="my-5" />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          MCP server URL
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-foreground/5 px-3 py-2 text-sm">
            {mcpUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy("url", mcpUrl)}
          >
            {copiedKey === "url" ? (
              <>
                <Check className="size-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="size-4" /> Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {snippets.map((snippet) => (
          <div key={snippet.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {snippet.label}
              </p>
              <button
                type="button"
                onClick={() => copy(snippet.label, snippet.code)}
                className={cn(
                  "inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
                )}
              >
                {copiedKey === snippet.label ? (
                  <>
                    <Check className="size-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy
                  </>
                )}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-lg bg-foreground/5 px-3 py-2.5 text-xs leading-relaxed">
              <code>{snippet.code}</code>
            </pre>
          </div>
        ))}
      </div>

      <Separator className="my-5" />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Access & revoking
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          You approve each agent on a consent screen before it gets any access, and
          every action is scoped to your account — an agent can never see another
          user&rsquo;s data. To disconnect an agent, remove the Momentum server from
          its config (e.g. <code className="rounded bg-foreground/5 px-1 py-0.5">claude mcp remove momentum</code>).
          Any MCP client that supports remote (Streamable HTTP) servers can connect —
          authorization is handled automatically over OAuth.
        </p>
      </div>
    </div>
  );
}
