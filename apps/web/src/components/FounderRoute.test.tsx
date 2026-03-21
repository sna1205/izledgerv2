import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FounderRoute } from "@/components/FounderRoute";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/lib/auth";

const originalFetch = global.fetch;

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function renderFounderRoute(initialPath = "/founder") {
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
              <Route path="/" element={<div>Home</div>} />
              <Route path="/login" element={<div>Login</div>} />
              <Route element={<ProtectedRoute />}>
                <Route element={<FounderRoute />}>
                  <Route path="/founder" element={<div>Founder Page</div>} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("FounderRoute", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("allows the founder username through", async () => {
    global.fetch = vi.fn().mockResolvedValue(createJsonResponse({
      user: {
        id: "user-1",
        username: "VEASNA",
      },
    })) as typeof fetch;

    renderFounderRoute();

    expect(await screen.findByText("Founder Page")).toBeInTheDocument();
  });

  it("redirects non-founders to the landing page", async () => {
    global.fetch = vi.fn().mockResolvedValue(createJsonResponse({
      user: {
        id: "user-2",
        username: "trader",
      },
    })) as typeof fetch;

    renderFounderRoute();

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("Founder Page")).not.toBeInTheDocument();
  });
});
