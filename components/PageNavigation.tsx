"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, X } from "lucide-react";

export default function PageNavigation() {
  const router = useRouter();

  return (
    <div className="mb-8 flex w-full items-center justify-between border-b border-blue-400/20 pb-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-medium text-blue-300 transition-colors hover:text-white"
      >
        <ArrowLeft size={18} />
        <span>Back</span>
      </button>

      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-blue-300 transition-colors hover:text-white"
        >
          <Home size={18} />
          <span>Home</span>
        </Link>

        <button
          type="button"
          onClick={() => router.push("/admin/dashboard")}
          className="flex items-center gap-2 text-sm font-medium text-red-400 transition-colors hover:text-red-300"
        >
          <X size={18} />
          <span>Exit</span>
        </button>
      </div>
    </div>
  );
}
