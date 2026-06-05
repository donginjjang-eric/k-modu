import "./studio.css";
import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { StudioSideNav, StudioTabBar } from "@/components/StudioNav";

export default async function DesignerStudioLayout({ children }: { children: React.ReactNode }) {
  const { designer } = await requireApprovedDesigner();
  const initial = (designer.brand_name || "K").trim().charAt(0).toUpperCase();

  return (
    <div className="studio designer-studio">
      <header className="st-top">
        <Link className="brand" href="/dashboard/designer">
          <b>K-MODU</b>
          <span className="role-chip designer">디자이너 스튜디오</span>
        </Link>
        <div className="top-context">
          <Link className="top-link" href="/designers/maison-lune">공개 페이지</Link>
          <div className="me">
            <span className="role-label">브랜드</span>
            <span>{designer.brand_name}</span>
            <span className="ava">{initial}</span>
            <Link className="logout" href="/login">로그아웃</Link>
          </div>
        </div>
      </header>

      <div className="st-shell">
        <StudioSideNav />
        <main className="st-main">{children}</main>
      </div>

      <StudioTabBar />
    </div>
  );
}
