import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS };

/** Start customer sign-in through NUMI's OAuth provider (Google/email/etc.). */
export const startLogin = () => {
  window.location.href = "/api/oauth/login";
};
