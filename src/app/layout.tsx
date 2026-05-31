import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "K-MODU",
  description: "K-MODU AI lookbook service rebuild",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="site-shell">
          <header className="top-nav">
            <Link className="brand" href="/">K-MODU</Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/designers">디자이너</Link>
              <Link href="/dashboard/designer">대시보드</Link>
              <Link className="pill" href="/login">로그인</Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
