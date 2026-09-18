import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Start the current Manus Open App OAuth2 authorization flow. */
export const startLogin = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL || "https://manus.im/openapi/oauth";
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = window.location.origin + "/api/oauth/callback";

  if (!appId) {
    console.error("[OAuth] Missing VITE_APP_ID");
    return;
  }

  const nonce = crypto.randomUUID();
  document.cookie = OAUTH_STATE_COOKIE + "=" + nonce + "; Path=/; Max-Age=600; SameSite=Lax; Secure";
  const state = encodeOAuthState({ redirectUri, nonce });

  const url = new URL(oauthPortalUrl);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  window.location.href = url.toString();
};
