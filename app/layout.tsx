import type { Metadata } from 'next';
import './globals.css';
// import './layout.css';
import { AuthProvider } from '@/hooks/useAuth';


export const metadata: Metadata = {
  title: 'NdaY-Fako - Waste Management Platform',
  description: 'Waste collection and recycling management for CUA',
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