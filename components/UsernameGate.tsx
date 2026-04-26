"use client";

import { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "@/lib/auth";

type Props = {
  username: string | null;
  onUsernameSet: (username: string | null) => void;
};

export default function UsernameGate({ username, onUsernameSet }: Props) {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = signupUsername.trim();

    if (!trimmedEmail.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (mode === "signup" && trimmedUsername.length < 3) {
      setMessage("Username must be at least 3 characters.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const result = await signUpWithEmail({
          email: trimmedEmail,
          password,
          username: trimmedUsername,
        });

        setMessage(
          result.requiresEmailConfirmation
            ? "Account created. Check your email to confirm, then sign in."
            : "Account created and signed in."
        );

        if (!result.requiresEmailConfirmation) {
          onUsernameSet(trimmedUsername);
        }
      } else {
        await signInWithEmail({
          email: trimmedEmail,
          password,
        });
        setMessage("Signed in.");
      }
    } catch (error) {
      const nextMessage =
        error instanceof Error ? error.message : "Sign-in failed. Please try again.";
      setMessage(nextMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (username) {
    return null;
  }

  return (
    <div className="mb-6 flex w-full flex-col items-center gap-4">
      <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signup" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8"
          }`}
        >
          Create Account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage("");
          }}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            mode === "signin" ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/8"
          }`}
        >
          Sign In
        </button>
      </div>

      <div className="grid w-full max-w-md gap-3">
        {mode === "signup" && (
          <input
            value={signupUsername}
            onChange={(event) => {
              setSignupUsername(event.target.value);
              setMessage("");
            }}
            placeholder="Choose a username"
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
          />
        )}
        <input
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setMessage("");
          }}
          placeholder="Email address"
          autoCapitalize="none"
          autoCorrect="off"
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
        />
        <input
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setMessage("");
          }}
          placeholder="Password"
          type="password"
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className={`rounded-xl px-4 py-3 font-semibold text-slate-950 transition ${
            submitting ? "bg-cyan-200" : "bg-cyan-400 hover:bg-cyan-300"
          }`}
        >
          {submitting
            ? mode === "signup"
              ? "Creating Account..."
              : "Signing In..."
            : mode === "signup"
            ? "Create Account"
            : "Sign In"}
        </button>
      </div>

      {message && <div className="text-center text-sm text-amber-300">{message}</div>}
    </div>
  );
}
