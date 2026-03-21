import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
import FounderDashboard from "@/pages/FounderDashboard";

const originalFetch = global.fetch;

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function renderFounderDashboard() {
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
          <FounderDashboard />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );
}

describe("FounderDashboard", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("renders fallback founder stats when the stats endpoint fails", async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/auth/me")) {
        return createJsonResponse({
          user: {
            id: "user-1",
            username: "VEASNA",
          },
        });
      }

      if (url.includes("/founder/stats")) {
        return createJsonResponse({
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error.",
          },
        }, 500);
      }

      if (url.includes("/founder/recent")) {
        return createJsonResponse({
          users: [
            {
              id: "u1",
              username: "VEASNA",
              createdAt: "2026-03-21T00:00:00.000Z",
            },
          ],
          trades: [],
          reviews: [],
        });
      }

      if (url.includes("/founder/health")) {
        return createJsonResponse({
          apiStatus: "ok",
          dbConnection: "ok",
          sessionValid: true,
          usersWithZeroTrades: 0,
          checkedAt: "2026-03-21T00:00:00.000Z",
        });
      }

      return createJsonResponse({}, 404);
    }) as typeof fetch;

    renderFounderDashboard();

    expect(await screen.findByText("Founder Dashboard")).toBeInTheDocument();
    expect(await screen.findByText("Some founder data is unavailable")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    expect(screen.getByText(/VEASNA/)).toBeInTheDocument();
  });
});
