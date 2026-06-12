import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "K-MODU by MARKBRIDGE",
  description: "K-MODU는 한국 디자이너 브랜드와 글로벌 패션 크리에이터를 연결합니다.",
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
              {/* auth-nav.js가 로그인 상태에 따라 바꿔치기하므로 일반 앵커를 사용 */}
              <a className="pill" data-auth-link href="/login">로그인</a>
            </nav>
          </header>
          {children}
        </div>
        <script src="/auth-nav.js" defer />
      </body>
    </html>
  );
}
