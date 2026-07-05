import "../designer/studio.css";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAdminPendingCounts } from "@/lib/db";
import { AdminSideNav, AdminTabBar } from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";
import ScrollResetOnLoad from "@/components/ScrollResetOnLoad";

export default async function AdminStudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("admin");
  // 처리 대기 건수 — 메뉴 뱃지로 표시 (조회 실패 시 뱃지 없이 렌더)
  const pending = await getAdminPendingCounts().catch(() => ({ pendingDesigners: 0, pendingLooks: 0 }));
  const badges = {
    "/dashboard/admin/designers": pending.pendingDesigners,
    "/dashboard/admin/generated-looks": pending.pendingLooks,
  };

  return (
    <div className="studio admin-studio">
      <ScrollResetOnLoad />
      <header className="st-top">
        <Link className="brand" href="/dashboard/admin">
          <b>K-MODU</b>
          <span className="role-chip admin">관리자 콘솔</span>
        </Link>
        <div className="top-context">
          <Link className="top-link" href="/dashboard/designer">디자이너 화면</Link>
          <div className="me compact">
            <span className="role-label">운영자</span>
            <span>{user.email}</span>
          </div>
        </div>
      </header>

      <div className="st-shell">
        <AdminSideNav email={user.email} badges={badges} />
        <main className="st-main">{children}</main>
      </div>

      <div className="st-mobile-account">
        <span>{user.email}</span>
        <LogoutButton />
      </div>
      <AdminTabBar badges={badges} />
    </div>
  );
}
