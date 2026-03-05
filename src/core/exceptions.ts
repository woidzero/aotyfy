const { showNotification } = Spicetify;
import { Settings } from "./settings";

export class AOTYFYError extends Error {
  constructor(message: string, opts: {
    name?: string,
    show?: boolean
  } = {
      show: false
    }) {
    super(message);
    this.name = opts.name || "AOTYError";
    console.error(`[aotyfy:${this.name}] ` + message);

    if (Settings.notifications.value && opts.show) {
      showNotification(`[aotyfy] ` + message, true);
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AOTYFYError);
    }
  }
}

export class APIError extends AOTYFYError {
  constructor(message: string) {
    super(message, { name: "APIError" });
  }
}

export class CriticalError extends AOTYFYError {
  constructor(message: string) {
    super(message, { name: "CriticalError" });
  }
}

export class RateLimitError extends AOTYFYError {
  constructor(message: string) {
    super(message, { name: "RateLimitError", show: true });
  }
}

