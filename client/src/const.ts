import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { supabase } from "@/lib/supabase";

export { COOKIE_NAME, ONE_YEAR_MS };

export const startLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/account",
    },
  });
  if (error) {
    window.location.href = "/login";
  }
};
