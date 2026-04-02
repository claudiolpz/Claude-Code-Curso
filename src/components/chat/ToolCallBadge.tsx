"use client";

import { ToolInvocation } from "ai";
import { Loader2 } from "lucide-react";

export function getToolLabel(
  toolName: string,
  args: Record<string, unknown>
): { action: string; filename: string | null } {
  const basename = (path: unknown): string | null =>
    typeof path === "string" && path.length > 0
      ? (path.split("/").pop() ?? path)
      : null;

  if (toolName === "str_replace_editor") {
    const command = args.command as string | undefined;
    const filename = basename(args.path);

    const labels: Record<string, string> = {
      create: "Creating",
      str_replace: "Editing",
      insert: "Editing",
      view: "Reading",
      undo_edit: "Reverting",
    };

    return { action: labels[command ?? ""] ?? "Processing", filename };
  }

  if (toolName === "file_manager") {
    const command = args.command as string | undefined;
    const filename = basename(args.path);
    const newFilename = basename(args.new_path);

    if (command === "rename") {
      const label =
        filename && newFilename ? `${filename} → ${newFilename}` : filename;
      return { action: "Renaming", filename: label };
    }

    if (command === "delete") {
      return { action: "Deleting", filename };
    }

    return { action: "Managing", filename };
  }

  return { action: toolName, filename: null };
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args } = toolInvocation;
  const isDone = toolInvocation.state === "result";
  const { action, filename } = getToolLabel(
    toolName,
    args as Record<string, unknown>
  );

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isDone ? (
        <div
          className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
          data-testid="done-indicator"
        />
      ) : (
        <Loader2
          className="w-3 h-3 animate-spin text-blue-600 shrink-0"
          data-testid="loading-indicator"
        />
      )}
      <span className="text-neutral-600">{action}</span>
      {filename && (
        <span className="font-mono font-medium text-neutral-800">
          {filename}
        </span>
      )}
    </div>
  );
}
