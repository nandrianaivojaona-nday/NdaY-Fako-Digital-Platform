"use client";
import { Home, QrCode, Layers, User, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/citizen",            label: "Home",    icon: Home },
  { href: "/citizen/bins",       label: "Bins",    icon: Layers },
  { href: "/citizen/qr",         label: "QR",      icon: QrCode, primary: true },
  { href: "/citizen/impact",     label: "Impact",  icon: Sparkles },
  { href: "/citizen/account",    label: "Account", icon: User },
];

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0b1220] text-white flex flex-col">
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#0b1220]/95 backdrop-blur">
        {NAV.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] ${
                active ? "text-cyan-300" : "text-white/50"
              }`}
            >
              <Icon
                size={primary ? 26 : 20}
                className={primary && !active ? "text-cyan-400" : ""}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
