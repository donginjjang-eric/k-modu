import "../designer/studio.css";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AdminSideNav, AdminTabBar } from "@/components/AdminNav";

export default async function AdminStudioLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("admin");
  const initial = (user.email || "A").trim().charAt(0).toUpperCase();

  return (
    <div className="studio admin-studio">
      <header className="st-top">
        <Link className="brand" href="/dashboard/admin">
          <b>K-MODU</b>
          <span className="role-chip admin">관리자 콘솔</span>
        </Link>
        <div className="top-context">
          <Link className="top-link" href="/dashboard/designer">디자이너 화면</Link>
          <div className="me">
            <span className="role-label">운영자</span>
            <span>{user.email}</span>
            <span className="ava">{initial}</span>
            <Link className="logout" href="/login">로그아웃</Link>
          </div>
        </div>
      </header>

      <div className="st-shell">
        <AdminSideNav />
        <main className="st-main">{children}</main>
      </div>

      <AdminTabBar />
    </div>
  );
}
