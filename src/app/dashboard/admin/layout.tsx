import "../designer/studio.css";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AdminSideNav, AdminTabBar } from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";
import ScrollResetOnLoad from "@/components/ScrollResetOnLoad";

export default async function AdminStudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("admin");

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
        <AdminSideNav email={user.email} />
        <main className="st-main">{children}</main>
      </div>

      <div className="st-mobile-account">
        <span>{user.email}</span>
        <LogoutButton />
      </div>
      <AdminTabBar />
    </div>
  );
}
