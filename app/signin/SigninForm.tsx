"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; email: string }
  | { kind: "error"; message: string };

export function SigninForm() {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) return;
    setStatus({ kind: "sending" });
    try {
      await signIn("resend", { email });
      setStatus({ kind: "sent", email });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setStatus({ kind: "error", message });
    }
  };

  if (status.kind === "sent") {
    return (
      <section
        aria-label="Sign-in confirmation"
        className="bg-bwf-blue mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 px-6 py-12 text-white"
      >
        <h1 className="text-3xl font-semibold tracking-tight">
          Check your inbox
        </h1>
        <p className="text-white/80">
          We&apos;ve sent a magic link to <strong>{status.email}</strong>. Click
          it to finish signing in.
        </p>
        <p className="text-sm text-white/60">
          Didn&apos;t arrive? Check your spam folder, or
          <button
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
            className="text-bwf-pale ml-1 underline underline-offset-2"
          >
            try a different email
          </button>
          .
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Sign in"
      className="bg-bwf-blue mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-6 px-6 py-12 text-white"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-white/70">
          We&apos;ll email you a magic link. No passwords.
        </p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span>Email address</span>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            aria-label="Email address"
            disabled={status.kind === "sending"}
            className="ring-bwf-blue/40 rounded-lg bg-white/10 px-3 py-2 text-base ring-1 outline-none focus:ring-2"
          />
        </label>

        <button
          type="submit"
          disabled={status.kind === "sending" || !email}
          className="bg-bwf-blue hover:bg-bwf-accent rounded-full px-5 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          {status.kind === "sending" ? "Sending…" : "Email me a link"}
        </button>

        {status.kind === "error" ? (
          <p role="alert" className="text-sm text-amber-300">
            {status.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
