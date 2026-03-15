# Frontend Integration Notes

The current frontend already uses React Query, so the cleanest migration is:

1. keep the existing UI components
2. replace localStorage modules with API clients
3. move page-level state to React Query hooks incrementally

## Recommended API client

```ts
// src/lib/api/client.ts
export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${import.meta.env.VITE_API_URL}${input}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
```

## Auth replacement

Replace `src/lib/auth.tsx` localStorage logic with server-backed calls.

```ts
// src/lib/api/auth.ts
import { apiFetch } from "./client";

export function register(username: string, password: string) {
  return apiFetch<{ user: { id: string; username: string } }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function login(username: string, password: string) {
  return apiFetch<{ user: { id: string; username: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

export function getMe() {
  return apiFetch<{ user: { id: string; username: string } }>("/auth/me");
}

export function changePassword(currentPassword: string, nextPassword: string) {
  return apiFetch<{ user: { id: string; username: string } }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ currentPassword, nextPassword }),
  });
}
```

## Auth state with React Query

```ts
// src/hooks/useAuthSession.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";

export function useAuthSession() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: authApi.getMe,
    retry: false,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });
}
```

## Accounts replacement

```ts
// src/lib/api/accounts.ts
import { apiFetch } from "./client";
import { Account } from "@/lib/types";

export function getAccounts() {
  return apiFetch<{ items: Account[] }>("/accounts");
}

export function createAccount(payload: Omit<Account, "id" | "createdAt"> & { isDefault?: boolean }) {
  return apiFetch<{ account: Account }>("/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
```

The same pattern applies for setups, trades, and reviews.

## Trade response shape

The backend keeps the response close to your current frontend trade model:

```ts
type ApiTrade = {
  id: string;
  date: string;
  accountId: string;
  pair: string;
  direction: "Buy" | "Sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  profit: number;
  result: "Win" | "Loss";
  setupId: string | null;
  setup: string;
  session: "Asia" | "London" | "New York" | null;
  emotion: "Calm" | "Focused" | "Confident" | "Anxious" | "Frustrated" | null;
  notes: string;
  screenshots: string[];
  screenshotAssets: Array<{
    id: string;
    storageKey: string;
    sortOrder: number;
    url: string;
  }>;
  createdAt: string;
  updatedAt: string;
};
```

That means most existing UI code can keep using:

- `trade.date`
- `trade.setup`
- `trade.screenshots`

while later gaining access to `setupId` and `screenshotAssets`.

## Screenshot migration from base64

The current UI stores screenshots as base64 strings. Move it to this flow:

1. User selects files.
2. If the trade does not exist yet, create the trade first.
3. Call `POST /trades/:id/screenshots/presign`.
4. Upload each file directly with `fetch(uploadUrl, { method: "PUT", body: file, headers })`.
5. Call `POST /trades/:id/screenshots/complete`.
6. Refresh the trade query or optimistically append the returned asset.

## Trade hook example

```ts
// src/hooks/useTrades.ts
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

export function useTrades(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  return useQuery({
    queryKey: ["trades", filters],
    queryFn: () =>
      apiFetch<{
        items: unknown[];
        pagination: {
          page: number;
          pageSize: number;
          total: number;
          totalPages: number;
        };
      }>(`/trades?${params.toString()}`),
  });
}
```

## Recommended replacement order by frontend module

### First pass

- `src/lib/auth.tsx`
- `src/lib/accounts.ts`
- `src/lib/setups.ts`

### Second pass

- `src/lib/trades.ts`
- `src/lib/reviews.ts`
- screenshot upload UI

### Third pass

- dashboard data source
- analytics data source
- remove old localStorage fallback code

## Minimal-breakage mapping

- `Account` DTOs already align closely with the frontend.
- `SetupDefinition` needs `updatedAt` and `isArchived` added if you want full parity with the backend.
- `Trade` can stay mostly the same, with `screenshots` still as `string[]`.
- `Review` can keep `reviewScope` as an alias for `type` during migration.

## Suggested env for the frontend

```env
VITE_API_URL=http://localhost:4000
```

## Migration strategy

- Keep current components.
- Add API modules beside the localStorage modules.
- Swap one page at a time to React Query.
- Once stable, delete the localStorage implementations.
