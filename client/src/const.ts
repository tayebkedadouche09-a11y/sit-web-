import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS };

/**
 * Start NUMI owner/admin login through the server-side Manus API key.
 * The secret never enters the browser or frontend bundle.
 */
export const startLogin = () => {
  window.location.href = "/api/auth/manus-key/login";
};
