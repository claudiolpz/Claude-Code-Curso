import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// ─── getToolLabel unit tests ────────────────────────────────────────────────

test("getToolLabel: str_replace_editor create", () => {
  const result = getToolLabel("str_replace_editor", {
    command: "create",
    path: "/src/App.jsx",
  });
  expect(result).toEqual({ action: "Creating", filename: "App.jsx" });
});

test("getToolLabel: str_replace_editor str_replace", () => {
  const result = getToolLabel("str_replace_editor", {
    command: "str_replace",
    path: "/src/Counter.tsx",
  });
  expect(result).toEqual({ action: "Editing", filename: "Counter.tsx" });
});

test("getToolLabel: str_replace_editor insert", () => {
  const result = getToolLabel("str_replace_editor", {
    command: "insert",
    path: "/src/utils.ts",
  });
  expect(result).toEqual({ action: "Editing", filename: "utils.ts" });
});

test("getToolLabel: str_replace_editor view", () => {
  const result = getToolLabel("str_replace_editor", {
    command: "view",
    path: "/src/index.ts",
  });
  expect(result).toEqual({ action: "Reading", filename: "index.ts" });
});

test("getToolLabel: str_replace_editor undo_edit", () => {
  const result = getToolLabel("str_replace_editor", {
    command: "undo_edit",
    path: "/src/Button.tsx",
  });
  expect(result).toEqual({ action: "Reverting", filename: "Button.tsx" });
});

test("getToolLabel: file_manager rename", () => {
  const result = getToolLabel("file_manager", {
    command: "rename",
    path: "/src/old.tsx",
    new_path: "/src/new.tsx",
  });
  expect(result).toEqual({ action: "Renaming", filename: "old.tsx → new.tsx" });
});

test("getToolLabel: file_manager delete", () => {
  const result = getToolLabel("file_manager", {
    command: "delete",
    path: "/src/unused.tsx",
  });
  expect(result).toEqual({ action: "Deleting", filename: "unused.tsx" });
});

test("getToolLabel: unknown tool returns tool name as action, no filename", () => {
  const result = getToolLabel("some_other_tool", { foo: "bar" });
  expect(result).toEqual({ action: "some_other_tool", filename: null });
});

test("getToolLabel: missing path returns null filename", () => {
  const result = getToolLabel("str_replace_editor", { command: "create" });
  expect(result).toEqual({ action: "Creating", filename: null });
});

test("getToolLabel: partial-call with empty args returns Processing, no filename", () => {
  const result = getToolLabel("str_replace_editor", {});
  expect(result).toEqual({ action: "Processing", filename: null });
});

// ─── ToolCallBadge rendering tests ──────────────────────────────────────────

test("ToolCallBadge: shows action and filename for create command", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Creating")).toBeDefined();
  expect(screen.getByText("App.jsx")).toBeDefined();
});

test("ToolCallBadge: shows Editing for str_replace command", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/src/Counter.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(screen.getByText("Editing")).toBeDefined();
  expect(screen.getByText("Counter.tsx")).toBeDefined();
});

test("ToolCallBadge: shows rename label for file_manager rename", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "3",
        toolName: "file_manager",
        args: { command: "rename", path: "/src/old.tsx", new_path: "/src/new.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );
  expect(screen.getByText("Renaming")).toBeDefined();
  expect(screen.getByText("old.tsx → new.tsx")).toBeDefined();
});

test("ToolCallBadge: done state shows green dot, no spinner", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );
  expect(container.querySelector('[data-testid="done-indicator"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="loading-indicator"]')).toBeNull();
});

test("ToolCallBadge: call state shows spinner, no green dot", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "5",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/src/App.jsx" },
        state: "call",
      }}
    />
  );
  expect(container.querySelector('[data-testid="loading-indicator"]')).not.toBeNull();
  expect(container.querySelector('[data-testid="done-indicator"]')).toBeNull();
});

test("ToolCallBadge: partial-call state shows spinner", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "6",
        toolName: "str_replace_editor",
        args: {},
        state: "partial-call",
      }}
    />
  );
  expect(container.querySelector('[data-testid="loading-indicator"]')).not.toBeNull();
});

test("ToolCallBadge: no filename rendered when path is missing", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "7",
        toolName: "str_replace_editor",
        args: { command: "create" },
        state: "call",
      }}
    />
  );
  expect(screen.getByText("Creating")).toBeDefined();
  expect(container.querySelector(".font-mono")).toBeNull();
});

test("ToolCallBadge: unknown tool shows tool name as fallback", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "8",
        toolName: "custom_tool",
        args: {},
        state: "result",
        result: null,
      }}
    />
  );
  expect(screen.getByText("custom_tool")).toBeDefined();
});
