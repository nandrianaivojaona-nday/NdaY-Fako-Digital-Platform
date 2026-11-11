export default function CitizenQrPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">
          Citizen QR
        </p>
        <h1 className="mt-4 text-3xl font-black text-white">QR workflow coming soon</h1>
        <p className="mt-3 max-w-xl text-sm text-white/70">
          This page is reserved for the citizen QR scan and validation flow. The route is now active and can be expanded with live QR logic next.
        </p>
      </div>
    </main>
  );
}
