"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcons";
import LogoutButton from "@/components/LogoutButton";

type NavItem = {
  href: string;
  icon: "home" | "users" | "package" | "image";
  label: string;
  short: string;
  tag?: string;
};

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", icon: "home", label: "운영 홈", short: "홈" },
  { href: "/dashboard/admin/users", icon: "users", label: "회원 관리", short: "회원" },
  { href: "/dashboard/admin/designers", icon: "users", label: "디자이너 승인", short: "승인" },
  { href: "/dashboard/admin/products", icon: "package", label: "상품 검수", short: "상품" },
  { href: "/dashboard/admin/generated-looks", icon: "image", label: "AI 결과 검수", short: "AI" },
];

// href별 처리 대기 건수 — 있으면 메뉴 옆에 뱃지로 표시
export type AdminNavBadges = Record<string, number | undefined>;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSideNav({ email, badges = {} }: { email: string; badges?: AdminNavBadges }) {
  const pathname = usePathname();
  const initial = (email || "A").trim().charAt(0).toUpperCase();

  return (
    <aside className="st-side">
      <nav>
        {ADMIN_NAV.map((item) => {
          const badge = badges[item.href];
          return (
            <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
              <span className="ic"><NavIcon name={item.icon} /></span> {item.label}
              {badge ? <span className="nav-badge">{badge > 99 ? "99+" : badge}</span> : null}
              {item.tag ? <span className="tag">{item.tag}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="st-account-card admin">
        <div className="st-account-avatar">{initial}</div>
        <div className="st-account-copy">
          <span>관리자 콘솔</span>
          <strong>{email}</strong>
        </div>
        <div className="st-account-actions">
          <Link href="/dashboard/designer">디자이너 화면</Link>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

export function AdminTabBar({ badges = {} }: { badges?: AdminNavBadges }) {
  const pathname = usePathname();
  return (
    <nav className="st-tabbar">
      {ADMIN_NAV.map((item) => {
        const badge = badges[item.href];
        return (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <span className="ic">
              <NavIcon name={item.icon} />
              {badge ? <i className="tab-badge">{badge > 99 ? "99+" : badge}</i> : null}
            </span>
            {item.short}
          </Link>
        );
      })}
    </nav>
  );
}
