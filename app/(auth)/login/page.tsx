import LoginForm from "@/components/auth/LoginForm";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type LoginPageProps = {
  searchParams?: Promise<{
    returnUrl?: string;
    redirect?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};

  const returnUrl = params.returnUrl || params.redirect || "/";
  const message = params.message || "";

  return (
    <main className="min-h-screen bg-[#0b1220] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 shadow-2xl">
          {/* Watermark background */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]">
            <Logo width={220} height={220} className="object-contain" />
          </div>

          {/* Foreground content */}
          <div className="relative z-10">
            <div className="mb-6">
              <h1 className="text-2xl font-black uppercase tracking-wide text-white">
                Waste Management Platform
              </h1>

              <p className="mt-2 text-sm text-white/70">
                Log in to start, resume, or update your assessment.
              </p>

              {message && (
                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  {message}
                </div>
              )}
            </div>

            <LoginForm returnUrl={returnUrl} />
          </div>
        </div>
      </div>
    </main>
  );
}
