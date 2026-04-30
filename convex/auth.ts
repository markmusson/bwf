import Resend from "@auth/core/providers/resend";
import { convexAuth } from "@convex-dev/auth/server";

// Magic-link only via Resend. Per design/07-convex-pivot.md §6.
// AUTH_RESEND_KEY and EMAIL_FROM are set via `npx convex env set ...`.
// EMAIL_FROM is a placeholder until Adam confirms the sender domain
// (design/06-locked-from-adam.md item 8).

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM,
    }),
  ],
});
