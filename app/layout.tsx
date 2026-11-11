import type { Metadata } from 'next';
import './globals.css';
// import './layout.css';
import { AuthProvider } from '@/hooks/useAuth';


export const metadata = {
  title: "NdaY'Fako",
  description: "Your household waste collection service",
  manifest: "/manifest.json",
  themeColor: "#06b6d4",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NdaY'Fako",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-root">
            <div className="app-overlay">
              <main className="page-container">
              {children} {/* ✅ IMPORTANT */}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}