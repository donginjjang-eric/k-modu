import "./studio.css";
import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";
import { StudioSideNav, StudioTabBar } from "@/components/StudioNav";
import LogoutButton from "@/components/LogoutButton";
import ScrollResetOnLoad from "@/components/ScrollResetOnLoad";

export default async function DesignerStudioLayout({ children }: { children: React.ReactNode }) {
  const { user, designer } = await requireApprovedDesigner();
  // 공개 화면 = 크리에이터가 보는 보드 모달 (딥링크로 자동 오픈)
  const publicHref = `/designers?open=${designer.id}`;

  return (
    <div className="studio designer-studio">
      <ScrollResetOnLoad />
      <header className="st-top">
        <Link className="brand" href="/dashboard/designer/brand">
          <b>K-MODU</b>
          <span className="role-chip designer">디자이너 스튜디오</span>
        </Link>
        <div className="top-context">
          <Link className="mobile-home-link" href="/" aria-label="메인 홈페이지로 이동">⌂</Link>
          <Link className="top-link" href={publicHref}>공개 페이지</Link>
          <div className="me compact">
            <span className="role-label">브랜드</span>
            <span>{designer.brand_name}</span>
          </div>
        </div>
      </header>

      {designer.approval_status !== "approved" ? (
        <div className="st-approval-banner" role="status">
          <span>이 프로필은 아직 공개 승인 전이에요 — 등록한 사진·정보가 공개 보드에 노출되지 않아요.</span>
          <Link href="/dashboard/admin">관리자 콘솔에서 승인하기</Link>
        </div>
      ) : null}

      <div className="st-shell">
        <StudioSideNav
          brandName={designer.brand_name}
          publicHref={publicHref}
          googleName={user.name}
          googleAvatar={user.avatar}
          googleEmail={user.email}
        />
        <main className="st-main">{children}</main>
      </div>

      <div className="st-mobile-account">
        <span>{designer.brand_name}</span>
        <LogoutButton />
      </div>
      <StudioTabBar />
    </div>
  );
}
