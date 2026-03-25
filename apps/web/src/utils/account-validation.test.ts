import { describe, expect, it } from "vitest";
import { ApiError } from "@/services/api/client";
import {
  getAccountApiErrorMessage,
  validateAccountForm,
} from "@/utils/account-validation";

describe("account validation", () => {
  it("requires an account name before save", () => {
    expect(validateAccountForm({
      name: "   ",
      broker: "Manual",
      balance: "",
      currency: "USD",
    })).toBe("Account name is required.");
  });

  it("requires a valid currency code", () => {
    expect(validateAccountForm({
      name: "Primary",
      broker: "Manual",
      balance: "1000",
      currency: "US",
    })).toBe("Currency must be at least 3 characters.");
  });

  it("maps backend validation details to a specific account field message", () => {
    const error = new ApiError("Invalid request", 400, "VALIDATION_ERROR", [
      {
        field: "name",
        message: "String must contain at least 1 character(s)",
      },
    ]);

    expect(getAccountApiErrorMessage(error, "Could not save the account right now.")).toBe("Account name is required.");
  });

  it("uses the fallback message for server-side account errors", () => {
    const error = new ApiError("Sensitive database error", 500, "DATABASE_ERROR");

    expect(getAccountApiErrorMessage(error, "Could not save the account right now.")).toBe("Could not save the account right now.");
  });
});
