import type { Metadata } from 'next';
import './globals.css';
// import './layout.css';
import AuthProvider from '../components/auth/AuthProvider';


export const metadata: Metadata = {
  title: 'NdaY-Fako - Waste Management Platform',
  description: 'Waste collection and recycling management for CUA',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-root">
          <div className="app-overlay">
            <main className="page-container">
              <AuthProvider>{children}</AuthProvider>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}