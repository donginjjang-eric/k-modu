import "./studio.css";
import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { StudioSideNav, StudioTabBar } from "@/components/StudioNav";

export default async function DesignerStudioLayout({ children }: { children: React.ReactNode }) {
  const { designer } = await requireApprovedDesigner();

  return (
    <div className="studio designer-studio">
      <header className="st-top">
        <Link className="brand" href="/dashboard/designer/brand">
          <b>K-MODU</b>
          <span className="role-chip designer">디자이너 스튜디오</span>
        </Link>
        <div className="top-context">
          <Link className="mobile-home-link" href="/" aria-label="메인 홈페이지로 이동">⌂</Link>
          <Link className="top-link" href="/designers/maison-lune">공개 페이지</Link>
          <div className="me compact">
            <span className="role-label">브랜드</span>
            <span>{designer.brand_name}</span>
          </div>
        </div>
      </header>

      <div className="st-shell">
        <StudioSideNav brandName={designer.brand_name} />
        <main className="st-main">{children}</main>
      </div>

      <div className="st-mobile-account">
        <span>{designer.brand_name}</span>
        <Link href="/login">로그아웃</Link>
      </div>
      <StudioTabBar />
    </div>
  );
}
