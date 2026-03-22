import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { privateQueryKey } from "@/services/query-client";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Settings from "@/pages/Settings";

const LEGACY_AUTH_STORAGE_KEY = "izledger-auth-user";
const originalFetch = global.fetch;
const { toast } = vi.hoisted(() => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/sonner", () => ({
  toast,
  Toaster: () => null,
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle" />,
}));

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function renderAuthRoutes(initialPath = "/settings") {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/settings" element={<Settings />} />
                <Route path="/dashboard" element={<div>Dashboard</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function AuthHarness() {
  const { login, refreshSession, sessionMessage, sessionState, user } = useAuth();

  return (
    <div>
      <span>{user?.username ?? "anonymous"}</span>
      <span>{sessionState}</span>
      <span>{sessionMessage ?? "no-session-message"}</span>
      <button type="button" onClick={() => void login("next-user", "password123")}>
        Switch User
      </button>
      <button type="button" onClick={() => void refreshSession()}>
        Refresh Session
      </button>
    </div>
  );
}

function RegisterHarness() {
  const { register } = useAuth();
  const [message, setMessage] = useState("");

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          void register("valid-user", "Password123!").then((result) => {
            setMessage(result.error ?? "ok");
          });
        }}
      >
        Register
      </button>
      <span>{message}</span>
    </div>
  );
}

function renderAuthHarness(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthHarness />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

function renderRegisterHarness(queryClient: QueryClient) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <RegisterHarness />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("auth session behavior", () => {
  beforeEach(() => {
    localStorage.clear();
    toast.error.mockReset();
    toast.success.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps the current in-memory session and shows a clear error when logout fails offline", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        user: {
          id: "user-1",
          username: "trader",
        },
      }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch")) as typeof fetch;

    renderAuthRoutes();

    await screen.findByText("trader");

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Could not reach the server, so you are still logged in on this device.");
    });

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Log in" })).not.toBeInTheDocument();
  });

  it("boots the authenticated session without repeatedly refetching /auth/me", async () => {
    global.fetch = vi.fn().mockResolvedValue(createJsonResponse({
      user: {
        id: "user-1",
        username: "trader",
      },
    })) as typeof fetch;

    renderAuthRoutes();

    await screen.findByText("trader");

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not trust a legacy browser auth cache when the server cannot verify the session", async () => {
    localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify({
      id: "user-1",
      username: "trader",
    }));

    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as typeof fetch;

    renderAuthRoutes();

    await screen.findByRole("heading", { name: "Unable to verify your session" });

    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Log in" })).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("treats a stale legacy browser auth cache as anonymous when bootstrap returns 401", async () => {
    localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify({
      id: "user-1",
      username: "trader",
    }));

    global.fetch = vi.fn().mockResolvedValue(
      createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401),
    ) as typeof fetch;

    renderAuthRoutes();

    await screen.findByRole("heading", { name: "Log in" });

    expect(screen.queryByText("Your session expired. Please log in again.")).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("blocks invalid registration payloads before submitting them", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401),
    ) as typeof fetch;

    renderAuthRoutes("/register");

    await screen.findByRole("heading", { name: "Create account" });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "iz" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "short" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Username must be at least 3 characters.")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("shows a clear login error for an incorrect username", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401))
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password.",
          details: [],
        },
      }, 401)) as typeof fetch;

    renderAuthRoutes("/login");

    await screen.findByRole("heading", { name: "Log in" });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "missing-user" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Incorrect username or password.")).toBeInTheDocument();
  });

  it("shows a clear login error for an incorrect password", async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401))
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid username or password.",
          details: [],
        },
      }, 401)) as typeof fetch;

    renderAuthRoutes("/login");

    await screen.findByRole("heading", { name: "Log in" });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "demo-user" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "WrongPassword123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Incorrect username or password.")).toBeInTheDocument();
  });

  it("surfaces backend validation details as a friendly auth error", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401))
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request",
          details: [
            {
              field: "password",
              message: "String must contain at least 8 character(s)",
            },
          ],
        },
      }, 400)) as typeof fetch;

    renderRegisterHarness(queryClient);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Password must be at least 8 characters.")).toBeInTheDocument();
  });

  it("uses the fallback register error for server-side 500 responses", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401))
      .mockResolvedValueOnce(createJsonResponse({
        statusCode: 500,
        error: "Internal Server Error",
        message: "sensitive database details",
      }, 500)) as typeof fetch;

    renderRegisterHarness(queryClient);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    expect(await screen.findByText("Could not create your account right now.")).toBeInTheDocument();
  });

  it("treats invalid bootstrap credentials with only a stale legacy cache as anonymous", async () => {
    localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify({
      id: "user-1",
      username: "trader",
    }));

    global.fetch = vi.fn().mockResolvedValue(
      createJsonResponse({
        error: {
          code: "INVALID_SESSION",
          message: "Invalid session.",
          details: [],
        },
      }, 401),
    ) as typeof fetch;

    renderAuthRoutes();

    await screen.findByRole("heading", { name: "Log in" });

    expect(screen.queryByText("Your session expired. Please log in again.")).not.toBeInTheDocument();
    expect(localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)).toBeNull();
  });

  it("marks a real in-memory session as expired when a refresh returns 401", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        user: {
          id: "user-1",
          username: "trader",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required.",
          details: [],
        },
      }, 401)) as typeof fetch;

    renderAuthHarness(queryClient);

    await screen.findByText("trader");
    fireEvent.click(screen.getByRole("button", { name: "Refresh Session" }));

    await waitFor(() => {
      expect(screen.getByText("anonymous")).toBeInTheDocument();
      expect(screen.getByText("session-expired")).toBeInTheDocument();
      expect(screen.getByText("Your session expired. Please log in again.")).toBeInTheDocument();
    });
  });

  it("clears the previous user's private caches when logging in as another user", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    queryClient.setQueryData(privateQueryKey("user-1", "trades", "list"), { items: [{ id: "trade-1" }] });
    localStorage.setItem(LEGACY_AUTH_STORAGE_KEY, JSON.stringify({
      id: "legacy-user",
      username: "legacy-user",
    }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce(createJsonResponse({
        user: {
          id: "user-1",
          username: "first-user",
        },
      }))
      .mockResolvedValueOnce(createJsonResponse({
        user: {
          id: "user-2",
          username: "next-user",
        },
      })) as typeof fetch;

    renderAuthHarness(queryClient);

    await screen.findByText("first-user");
    fireEvent.click(screen.getByRole("button", { name: "Switch User" }));

    await screen.findByText("next-user");

    expect(queryClient.getQueryData(privateQueryKey("user-1", "trades", "list"))).toBeUndefined();
    expect(localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)).toBeNull();
  });
});
