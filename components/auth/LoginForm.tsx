"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type LoginFormProps = {
  returnUrl?: string;
};

const LoginForm = ({ returnUrl = "/" }: LoginFormProps) => {
  const {
    firebaseUser,
    user,
    loading: authLoading,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");

  const safeReturnUrl = (() => {
    const fallback = "/assessment";
    if (
      !returnUrl ||
      !returnUrl.startsWith("/") ||
      returnUrl.startsWith("//") ||
      returnUrl.includes("\\")
    ) {
      return fallback;
    }

    try {
      const target = new URL(returnUrl, "https://nday-fako.invalid");
      if (
        target.origin !== "https://nday-fako.invalid" ||
        target.pathname === "/login" ||
        target.pathname.startsWith("/login/")
      ) {
        return fallback;
      }
      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return fallback;
    }
  })();

  const redirectToTarget = (message?: string) => {
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    const target = message
      ? `${safeReturnUrl}${safeReturnUrl.includes("?") ? "&" : "?"}auth=${encodeURIComponent(message)}`
      : safeReturnUrl;

    // 🔥 Prevent redirect to the same URL
    if (typeof window !== "undefined") {
      const currentUrl = window.location.pathname + window.location.search;
      if (currentUrl === target) {
        hasRedirected.current = false; // allow future redirects if needed
        return;
      }
    }

    router.replace(target);
  };

  useEffect(() => {
    // Wait for BOTH firebaseUser and user (app profile) before redirecting
    if (!authLoading && firebaseUser && user) {
      redirectToTarget();
    }
  }, [authLoading, firebaseUser, user]);

  const handleSubmit = async () => {
    if (submitting || hasRedirected.current) return;

    setSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");

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
    setNoticeMessage("");

    try {
      await loginWithGoogle();
      redirectToTarget("success");
    } catch (error: any) {
      hasRedirected.current = false;
      if (error?.code === "auth/unauthorized-domain") {
        const hostname = typeof window === "undefined" ? "this domain" : window.location.hostname;
        setErrorMessage(
          `Firebase rejected Google sign-in from ${hostname}. Confirm this exact host is authorized, then verify the running app uses the Firebase web API key for the same project and that the key allows Firebase Authentication.`
        );
      } else {
        setErrorMessage(error?.message || "Google login failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (submitting) return;

    setSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");

    try {
      await logout();
      hasRedirected.current = false;
      setNoticeMessage("You are now logged out. You can try signing in again.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Could not log out. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
        <p>Checking your session...</p>
        {firebaseUser && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={submitting}
            className="w-full rounded-xl border border-white/15 px-4 py-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Logging out..." : "Log out"}
          </button>
        )}
      </div>
    );
  }

  if (firebaseUser && user) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
        You are already logged in. Redirecting...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {noticeMessage && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {noticeMessage}
        </div>
      )}

      {firebaseUser && (
        <p className="text-sm text-white/70">
          {firebaseUser.email ? `Signed in as ${firebaseUser.email}. ` : "You are signed in. "}
          If the app session failed, you can log out and try again.
        </p>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      {(firebaseUser || errorMessage) && (
        <button
          type="button"
          onClick={handleLogout}
          disabled={submitting}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Logging out..." : "Log out"}
        </button>
      )}

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-white/80">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-white/80">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            name="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 6 : undefined}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 outline-none focus:border-emerald-400"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Please wait..." : isRegister ? "Create account" : "Log in"}
        </button>
      </form>

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
