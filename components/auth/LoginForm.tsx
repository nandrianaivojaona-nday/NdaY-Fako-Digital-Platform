"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

type LoginFormProps = {
  returnUrl?: string;
};

const LoginForm = ({ returnUrl = "/" }: LoginFormProps) => {
  const { loginWithEmail, registerWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const createSession = async () => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "SUPER_ADMIN",
      }),
    });

    const text = await res.text();

  if (!res.ok) {
    throw new Error(`Failed to create session cookie: ${res.status} ${text}`);
  }
  };

  const redirectToTarget = (message: string) => {
    const separator = returnUrl.includes("?") ? "&" : "?";
    router.replace(`${returnUrl}${separator}auth=${encodeURIComponent(message)}`);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isRegister) {
        await registerWithEmail(email, password);
        await createSession();
        setSuccessMessage("Account created successfully. Redirecting...");
        redirectToTarget("registered");
      } else {
        await loginWithEmail(email, password);
        await createSession();
        setSuccessMessage("Login successful. Redirecting...");
        redirectToTarget("success");
      }
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Authentication failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await loginWithGoogle();
      await createSession();
      setSuccessMessage("Google login successful. Redirecting...");
      redirectToTarget("success");
    } catch (error: any) {
      setErrorMessage(
        error?.message || "Google login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
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
        disabled={loading}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Please wait..." : isRegister ? "Create account" : "Log in"}
      </button>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => setIsRegister((prev) => !prev)}
        className="w-full text-sm text-white/70 hover:text-white transition-colors"
      >
        {isRegister
          ? "Already have an account? Log in"
          : "No account yet? Create one"}
      </button>
    </div>
  );
};

export default LoginForm;
