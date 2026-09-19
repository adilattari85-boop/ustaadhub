import { supabase } from "@/lib/supabase";

// Fire-and-forget welcome email trigger.
//
// Call this ONLY after Supabase confirmed a successful signup (and, for
// teachers, after the teacher profile was created). It must never be awaited by
// the registration flow: the request is not awaited and every failure is
// swallowed, so a broken email provider can never make a successful
// registration look failed.
//
// No personal data is sent from here. The API route re-derives the recipient
// email, name and role from the Supabase account behind the access token.
export function requestWelcomeEmail(): void {
  void (async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        // No session (for example when email confirmation is required before the
        // account can be used): there is nothing the server could verify.
        return;
      }

      await fetch("/api/welcome-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        // Keeps the request alive when the page navigates right after signup.
        keepalive: true,
      });
    } catch {
      // Email problems are never surfaced to the registration UX.
    }
  })();
}