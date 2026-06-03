import "./studio.css";
import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { StudioSideNav, StudioTabBar } from "@/components/StudioNav";

export default async function DesignerStudioLayout({ children }: { children: React.ReactNode }) {
  const { designer } = await requireApprovedDesigner();
  const initial = (designer.brand_name || "K").trim().charAt(0).toUpperCase();

  return (
    <div className="studio">
      <header className="st-top">
        <Link className="brand" href="/dashboard/designer">
          <b>K-MODU</b><span>디자이너 스튜디오</span>
        </Link>
        <div className="me">
          <span>{designer.brand_name}</span>
          <span className="ava">{initial}</span>
          <Link className="logout" href="/login">로그아웃</Link>
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
