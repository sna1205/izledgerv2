import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";

type CreateAccountInput = {
  name: string;
  broker: string;
  type: "Personal" | "Funded" | "Challenge" | "Demo" | "Crypto";
  balance: number;
  currency: string;
  isDefault?: boolean;
};

type CreatedAccount = {
  id: string;
  name: string;
  broker: string;
  type: CreateAccountInput["type"];
  balance: number;
  currency: string;
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function createAccountViaApi(
  app: FastifyInstance,
  sessionCookie: string,
  overrides: Partial<CreateAccountInput> = {},
) {
  const createAccountResponse = await app.inject({
    method: "POST",
    url: "/accounts",
    headers: {
      cookie: sessionCookie,
    },
    payload: {
      name: "Primary Account",
      broker: "Manual",
      type: "Personal",
      balance: 0,
      currency: "USD",
      ...overrides,
    } satisfies CreateAccountInput,
  });

  assert.equal(createAccountResponse.statusCode, 201);

  return createAccountResponse.json().account as CreatedAccount;
}
