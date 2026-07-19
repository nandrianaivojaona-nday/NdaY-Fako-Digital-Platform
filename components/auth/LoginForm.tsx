"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type LoginFormProps = {
  returnUrl?: string;
};

const LoginForm = ({ returnUrl = "/" }: LoginFormProps) => {
  const { firebaseUser, user, loading: authLoading, loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const safeReturnUrl =
    !returnUrl || returnUrl.startsWith("/login") ? "/assessment" : returnUrl;

  const redirectToTarget = (message?: string) => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const target = message
      ? `${safeReturnUrl}${safeReturnUrl.includes("?") ? "&" : "?"}auth=${encodeURIComponent(message)}`
      : safeReturnUrl;

    router.replace(target);
  };

  useEffect(() => {
    if (
      !authLoading &&
      firebaseUser
    ) {
      redirectToTarget();
    }
  }, [
    authLoading,
    firebaseUser,
  ]);

  const handleSubmit = async () => {
    if (submitting || hasRedirected.current) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
        redirectToTarget("registered");
        return;
      }

      await loginWithEmail(email, password);
      redirectToTarget("success");
    } catch (error: any) {
      hasRedirected.current = false;
      setErrorMessage(
        error?.message ||
          "Authentication failed. Please check your credentials and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (submitting || hasRedirected.current) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      await loginWithGoogle();
      redirectToTarget("success");
    } catch (error: any) {
      hasRedirected.current = false;
      setErrorMessage(error?.message || "Google login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        Checking your session...
      </div>
    );
  }

  if (firebaseUser) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        You are already logged in. Redirecting...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-semibold text-white/80">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-400"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-white/80">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-400"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}
      </button>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={submitting}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setIsRegister((prev) => !prev)}
        className="w-full text-sm text-white/70 transition-colors hover:text-white"
      >
        {isRegister
          ? "Already have an account? Log in"
          : "No account yet? Create one"}
      </button>
    </div>
  );
};

export default LoginForm;
