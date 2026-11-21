"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput
} from "@/components/ui/input-group";

/** The MCP endpoint apps connect to (FR-MCP-001): `<API origin>/mcp`. */
export const MCP_SERVER_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? ""}/mcp`;

/** The MCP server address with a Copy button, to paste into an app (Claude Code, claude.ai, OpenCode…). */
export function McpServerUrl() {
  const [copies, setCopies] = useState(0);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copies) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copies]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      setCopied(true);
      setCopies((n) => n + 1);
    } catch {
      toast.error("Couldn't copy to the clipboard.");
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="mcp-server-url" className="text-sm font-medium">
        MCP server address
      </label>
      <InputGroup>
        <InputGroupInput
          id="mcp-server-url"
          readOnly
          value={MCP_SERVER_URL}
          className="font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            className="cursor-pointer"
            aria-label="Copy the MCP server address"
            onClick={copy}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <p className="text-xs text-muted-foreground">
        Add PM4 to an app as an MCP server with this address. The app then sends
        you to PM4 to allow it.
      </p>
    </div>
  );
}
