"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; icon: string; label: string; short: string; tag?: string };

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard/admin", icon: "HM", label: "홈", short: "홈" },
  { href: "/dashboard/admin/designers", icon: "DS", label: "디자이너 승인", short: "승인" },
  { href: "/dashboard/admin/generated-looks", icon: "AI", label: "AI 생성 이미지", short: "AI" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSideNav() {
  const pathname = usePathname();
  return (
    <aside className="st-side">
      <nav>
        {ADMIN_NAV.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <span className="ic">{item.icon}</span> {item.label}
            {item.tag ? <span className="tag">{item.tag}</span> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function AdminTabBar() {
  const pathname = usePathname();
  return (
    <nav className="st-tabbar">
      {ADMIN_NAV.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
          <span className="ic">{item.icon}</span>
          {item.short}
        </Link>
      ))}
    </nav>
  );
}
