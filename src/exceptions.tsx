const { showNotification } = Spicetify;

import { getLocalStorageDataFromKey } from "./utils";

const SHOW_NOTIFICATION = getLocalStorageDataFromKey("aotyfy:notifications");

export class AOTYError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AOTYError";
    if (SHOW_NOTIFICATION) {
      showNotification(`[AOTYfy:${this.name}] ` + message, true);
    }
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AOTYError);
    }
  }
}

export class APIError extends AOTYError {
  constructor(message: string) {
    super(message);
    this.name = "APIError";
  }
}
