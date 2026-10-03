// Typed sync errors. The worker maps them to run statuses (see messages.ts).

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: "blocked" | "network" | "parse" | "budget" | "robots" | "forbidden" | "too_large" | "http"
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BlockedError extends SyncError {
  constructor(message: string) {
    super(message, "blocked");
  }
}

export class NetworkError extends SyncError {
  constructor(message: string) {
    super(message, "network");
  }
}

export class HttpStatusError extends SyncError {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message, "http");
  }
}

export class ParseError extends SyncError {
  constructor(message: string) {
    super(message, "parse");
  }
}

export class BudgetExceededError extends SyncError {
  constructor(message = "Dostignut je limit zahteva za ovaj uvoz.") {
    super(message, "budget");
  }
}

export class RobotsDisallowedError extends SyncError {
  constructor(message: string) {
    super(message, "robots");
  }
}

export class ForbiddenUrlError extends SyncError {
  constructor(message: string) {
    super(message, "forbidden");
  }
}

export class TooLargeError extends SyncError {
  constructor(message: string) {
    super(message, "too_large");
  }
}

/** Errors that stop a partner's run (the rest are per-item). */
export function isStopError(error: unknown): boolean {
  return (
    error instanceof BlockedError ||
    error instanceof BudgetExceededError ||
    error instanceof NetworkError ||
    error instanceof RobotsDisallowedError ||
    error instanceof ForbiddenUrlError
  );
}
