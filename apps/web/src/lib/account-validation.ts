import { ApiError } from "@/lib/api/client";

export const ACCOUNT_NAME_MAX_LENGTH = 100;
export const ACCOUNT_BROKER_MAX_LENGTH = 100;
export const ACCOUNT_CURRENCY_MIN_LENGTH = 3;
export const ACCOUNT_CURRENCY_MAX_LENGTH = 10;
export const ACCOUNT_MAX_BALANCE = 999_999_999_999.99;

type AccountValidationDetail = {
  field?: unknown;
  message?: unknown;
};

export type AccountFormValidationInput = {
  name: string;
  broker: string;
  balance: string;
  currency: string;
};

export function validateAccountForm(input: AccountFormValidationInput) {
  const name = input.name.trim();
  const broker = input.broker.trim();
  const currency = input.currency.trim().toUpperCase();
  const rawBalance = input.balance.trim();
  const balance = rawBalance ? Number.parseFloat(rawBalance) : 0;

  if (!name) {
    return "Account name is required.";
  }

  if (name.length > ACCOUNT_NAME_MAX_LENGTH) {
    return `Account name must be ${ACCOUNT_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!broker) {
    return "Broker is required.";
  }

  if (broker.length > ACCOUNT_BROKER_MAX_LENGTH) {
    return `Broker must be ${ACCOUNT_BROKER_MAX_LENGTH} characters or fewer.`;
  }

  if (!Number.isFinite(balance)) {
    return "Balance must be a valid number.";
  }

  if (balance < 0) {
    return "Balance cannot be negative.";
  }

  if (balance > ACCOUNT_MAX_BALANCE) {
    return "Balance is too large.";
  }

  if (!currency) {
    return "Currency is required.";
  }

  if (currency.length < ACCOUNT_CURRENCY_MIN_LENGTH) {
    return `Currency must be at least ${ACCOUNT_CURRENCY_MIN_LENGTH} characters.`;
  }

  if (currency.length > ACCOUNT_CURRENCY_MAX_LENGTH) {
    return `Currency must be ${ACCOUNT_CURRENCY_MAX_LENGTH} characters or fewer.`;
  }

  return null;
}

export function getAccountApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError && error.code === "VALIDATION_ERROR" && Array.isArray(error.details)) {
    for (const detail of error.details) {
      const message = normalizeAccountValidationDetail(detail);

      if (message) {
        return message;
      }
    }
  }

  if (error instanceof ApiError && error.status >= 500) {
    return fallback;
  }

  return error instanceof ApiError ? error.message : fallback;
}

function normalizeAccountValidationDetail(detail: unknown) {
  if (!detail || typeof detail !== "object") {
    return null;
  }

  const { field, message } = detail as AccountValidationDetail;

  if (field === "name") {
    if (typeof message === "string" && /at least/i.test(message)) {
      return "Account name is required.";
    }

    if (typeof message === "string" && /at most/i.test(message)) {
      return `Account name must be ${ACCOUNT_NAME_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (field === "broker") {
    if (typeof message === "string" && /at least/i.test(message)) {
      return "Broker is required.";
    }

    if (typeof message === "string" && /at most/i.test(message)) {
      return `Broker must be ${ACCOUNT_BROKER_MAX_LENGTH} characters or fewer.`;
    }
  }

  if (field === "balance") {
    if (typeof message === "string" && /greater than or equal to 0/i.test(message)) {
      return "Balance cannot be negative.";
    }

    if (typeof message === "string" && /finite/i.test(message)) {
      return "Balance must be a valid number.";
    }

    if (typeof message === "string" && /less than or equal to/i.test(message)) {
      return "Balance is too large.";
    }
  }

  if (field === "currency") {
    if (typeof message === "string" && /at least/i.test(message)) {
      return `Currency must be at least ${ACCOUNT_CURRENCY_MIN_LENGTH} characters.`;
    }

    if (typeof message === "string" && /at most/i.test(message)) {
      return `Currency must be ${ACCOUNT_CURRENCY_MAX_LENGTH} characters or fewer.`;
    }
  }

  return typeof message === "string" && message.trim() ? message : null;
}
