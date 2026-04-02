import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// ─── Typed imports (after vi.mock) ────────────────────────────────────────────

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ANON_WORK = {
  messages: [{ role: "user", content: "Make a button" }],
  fileSystemData: { "/App.jsx": { type: "file", content: "<Button />" } },
};

const CREATED_PROJECT = { id: "proj-123", name: "Test", createdAt: new Date(), updatedAt: new Date() };
const EXISTING_PROJECTS = [
  { id: "proj-999", name: "Old design", createdAt: new Date(), updatedAt: new Date() },
  { id: "proj-888", name: "Older design", createdAt: new Date(), updatedAt: new Date() },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Safe defaults: no anon work, no existing projects, actions succeed
    vi.mocked(getAnonWorkData).mockReturnValue(null);
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue(CREATED_PROJECT as any);
    vi.mocked(signInAction).mockResolvedValue({ success: true });
    vi.mocked(signUpAction).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  // ── signIn — loading state ─────────────────────────────────────────────────

  test("signIn sets isLoading to true while in flight", async () => {
    let resolveSignIn!: (v: any) => void;
    vi.mocked(signInAction).mockReturnValue(
      new Promise((res) => { resolveSignIn = res; })
    );

    const { result } = renderHook(() => useAuth());

    act(() => { result.current.signIn("a@b.com", "password123"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignIn({ success: false, error: "fail" }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signIn resets isLoading to false after success", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signIn resets isLoading to false after failure", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "wrong"); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signIn resets isLoading to false even when handlePostSignIn throws", async () => {
    vi.mocked(getProjects).mockRejectedValue(new Error("DB error"));
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await expect(result.current.signIn("a@b.com", "password123")).rejects.toThrow("DB error");
    });
    expect(result.current.isLoading).toBe(false);
  });

  // ── signIn — success paths ─────────────────────────────────────────────────

  test("signIn returns the AuthResult from the action", async () => {
    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => { returnValue = await result.current.signIn("a@b.com", "password123"); });
    expect(returnValue).toEqual({ success: true });
  });

  test("signIn returns failure AuthResult without navigating", async () => {
    vi.mocked(signInAction).mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => { returnValue = await result.current.signIn("a@b.com", "wrong"); });
    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(mockPush).not.toHaveBeenCalled();
    expect(getProjects).not.toHaveBeenCalled();
    expect(createProject).not.toHaveBeenCalled();
  });

  test("signIn with anon work: creates project from anon data, clears work, navigates", async () => {
    vi.mocked(getAnonWorkData).mockReturnValue(ANON_WORK);
    vi.mocked(createProject).mockResolvedValue(CREATED_PROJECT as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: ANON_WORK.messages,
      data: ANON_WORK.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("signIn with anon work: does not fetch existing projects", async () => {
    vi.mocked(getAnonWorkData).mockReturnValue(ANON_WORK);
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });
    expect(getProjects).not.toHaveBeenCalled();
  });

  test("signIn without anon work: navigates to most recent existing project", async () => {
    vi.mocked(getProjects).mockResolvedValue(EXISTING_PROJECTS as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });

    expect(mockPush).toHaveBeenCalledWith(`/${EXISTING_PROJECTS[0].id}`);
    expect(createProject).not.toHaveBeenCalled();
  });

  test("signIn without anon work and no projects: creates a new project and navigates", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue(CREATED_PROJECT as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("New Design #"),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
  });

  // ── signIn — edge cases ────────────────────────────────────────────────────

  test("anon work with empty messages falls through to getProjects", async () => {
    vi.mocked(getAnonWorkData).mockReturnValue({ messages: [], fileSystemData: {} });
    vi.mocked(getProjects).mockResolvedValue(EXISTING_PROJECTS as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("a@b.com", "password123"); });

    expect(createProject).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(`/${EXISTING_PROJECTS[0].id}`);
  });

  test("calls signInAction with the provided email and password", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signIn("user@example.com", "mypassword"); });
    expect(signInAction).toHaveBeenCalledWith("user@example.com", "mypassword");
  });

  // ── signUp — loading state ─────────────────────────────────────────────────

  test("signUp sets isLoading to true while in flight", async () => {
    let resolveSignUp!: (v: any) => void;
    vi.mocked(signUpAction).mockReturnValue(
      new Promise((res) => { resolveSignUp = res; })
    );

    const { result } = renderHook(() => useAuth());
    act(() => { result.current.signUp("a@b.com", "password123"); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => { resolveSignUp({ success: false }); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signUp resets isLoading to false after success", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "password123"); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signUp resets isLoading to false after failure", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("existing@b.com", "password123"); });
    expect(result.current.isLoading).toBe(false);
  });

  test("signUp resets isLoading to false even when handlePostSignIn throws", async () => {
    vi.mocked(createProject).mockRejectedValue(new Error("DB error"));
    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await expect(result.current.signUp("a@b.com", "password123")).rejects.toThrow("DB error");
    });
    expect(result.current.isLoading).toBe(false);
  });

  // ── signUp — success paths ─────────────────────────────────────────────────

  test("signUp returns the AuthResult from the action", async () => {
    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => { returnValue = await result.current.signUp("a@b.com", "password123"); });
    expect(returnValue).toEqual({ success: true });
  });

  test("signUp returns failure AuthResult without navigating", async () => {
    vi.mocked(signUpAction).mockResolvedValue({ success: false, error: "Email already registered" });
    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => { returnValue = await result.current.signUp("exists@b.com", "password123"); });
    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("signUp with anon work: creates project from anon data, clears work, navigates", async () => {
    vi.mocked(getAnonWorkData).mockReturnValue(ANON_WORK);
    vi.mocked(createProject).mockResolvedValue(CREATED_PROJECT as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("new@b.com", "password123"); });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("Design from"),
      messages: ANON_WORK.messages,
      data: ANON_WORK.fileSystemData,
    });
    expect(clearAnonWork).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
  });

  test("signUp without anon work: navigates to most recent existing project", async () => {
    vi.mocked(getProjects).mockResolvedValue(EXISTING_PROJECTS as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "password123"); });

    expect(mockPush).toHaveBeenCalledWith(`/${EXISTING_PROJECTS[0].id}`);
    expect(createProject).not.toHaveBeenCalled();
  });

  test("signUp without anon work and no projects: creates a new project and navigates", async () => {
    vi.mocked(getProjects).mockResolvedValue([]);
    vi.mocked(createProject).mockResolvedValue(CREATED_PROJECT as any);

    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("a@b.com", "password123"); });

    expect(createProject).toHaveBeenCalledWith({
      name: expect.stringContaining("New Design #"),
      messages: [],
      data: {},
    });
    expect(mockPush).toHaveBeenCalledWith(`/${CREATED_PROJECT.id}`);
  });

  test("calls signUpAction with the provided email and password", async () => {
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.signUp("user@example.com", "mypassword"); });
    expect(signUpAction).toHaveBeenCalledWith("user@example.com", "mypassword");
  });

  // ── Isolation between calls ────────────────────────────────────────────────

  test("signIn and signUp do not interfere with each other's isLoading state", async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => { await result.current.signIn("a@b.com", "password123"); });
    expect(result.current.isLoading).toBe(false);

    await act(async () => { await result.current.signUp("b@b.com", "password456"); });
    expect(result.current.isLoading).toBe(false);

    expect(signInAction).toHaveBeenCalledTimes(1);
    expect(signUpAction).toHaveBeenCalledTimes(1);
  });
});
