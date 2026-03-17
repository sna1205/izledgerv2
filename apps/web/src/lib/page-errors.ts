import { ApiError } from "@/lib/api/client";

export type PageErrorKind =
  | "unauthorized"
  | "not-found"
  | "validation"
  | "backend-outage"
  | "timeout"
  | "unknown";

type ValidationDetail = {
  field?: string;
  message?: string;
};

export type PageErrorConfig = {
  unavailableTitle: string;
  unavailableDescription: string;
  unauthorizedTitle?: string;
  unauthorizedDescription?: string;
  notFoundTitle?: string;
  notFoundDescription?: string;
  validationTitle?: string;
  validationDescription?: string;
  timeoutTitle?: string;
  timeoutDescription?: string;
};

export type PageErrorState = {
  kind: PageErrorKind;
  title: string;
  description: string;
  allowRetry: boolean;
};

function getValidationDetail(error: ApiError) {
  const details = error.details;

  if (!Array.isArray(details)) {
    return null;
  }

  const firstDetail = details.find((item): item is ValidationDetail => Boolean(item) && typeof item === "object");
  return firstDetail?.message?.trim() || null;
}

export function getPageErrorKind(error: unknown): PageErrorKind {
  if (!(error instanceof ApiError)) {
    return error instanceof TypeError ? "backend-outage" : "unknown";
  }

  if (error.status === 401 || error.status === 403) {
    return "unauthorized";
  }

  if (error.status === 404) {
    return "not-found";
  }

  if (
    error.status === 400 ||
    error.status === 422 ||
    error.code === "VALIDATION_ERROR" ||
    error.code === "INVALID_INPUT"
  ) {
    return "validation";
  }

  if (error.status === 408 || error.code === "REQUEST_TIMEOUT") {
    return "timeout";
  }

  if (
    error.status === 0 ||
    error.status >= 500 ||
    error.code === "NETWORK_ERROR" ||
    error.code === "REQUEST_ABORTED"
  ) {
    return "backend-outage";
  }

  return "unknown";
}

function withOptionalDetail(base: string, detail: string | null) {
  if (!detail || base.includes(detail)) {
    return base;
  }

  return `${base} ${detail}`;
}

export function getPageErrorState(error: unknown, config: PageErrorConfig): PageErrorState {
  const kind = getPageErrorKind(error);

  if (kind === "unauthorized") {
    return {
      kind,
      title: config.unauthorizedTitle ?? config.unavailableTitle,
      description:
        config.unauthorizedDescription ??
        "You are not authorized to view this page right now.",
      allowRetry: false,
    };
  }

  if (kind === "not-found") {
    return {
      kind,
      title: config.notFoundTitle ?? config.unavailableTitle,
      description:
        config.notFoundDescription ??
        "The requested resource could not be found.",
      allowRetry: false,
    };
  }

  if (kind === "validation") {
    const detail = error instanceof ApiError ? getValidationDetail(error) ?? error.message : null;

    return {
      kind,
      title: config.validationTitle ?? config.unavailableTitle,
      description: withOptionalDetail(
        config.validationDescription ?? "The request was invalid.",
        detail,
      ),
      allowRetry: false,
    };
  }

  if (kind === "timeout") {
    return {
      kind,
      title: config.timeoutTitle ?? config.unavailableTitle,
      description:
        config.timeoutDescription ??
        "The request took too long to finish. Please try again.",
      allowRetry: true,
    };
  }

  if (kind === "backend-outage") {
    const isOffline = error instanceof TypeError || (error instanceof ApiError && error.status === 0);

    return {
      kind,
      title: config.unavailableTitle,
      description: isOffline
        ? "We could not reach the server. Check your connection and try again."
        : config.unavailableDescription,
      allowRetry: true,
    };
  }

  return {
    kind,
    title: config.unavailableTitle,
    description: error instanceof ApiError && error.message
      ? error.message
      : config.unavailableDescription,
    allowRetry: true,
  };
}
