"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcons";

export type NavItem = {
  href: string;
  icon: "home" | "shirt" | "sparkles" | "video" | "inbox" | "badge";
  label: string;
  short?: string;
  tag?: string;
};

export const STUDIO_NAV: NavItem[] = [
  { href: "/dashboard/designer", icon: "home", label: "스튜디오 홈", short: "홈" },
  { href: "/dashboard/designer/products", icon: "shirt", label: "상품 작업", short: "상품" },
  { href: "/dashboard/designer/generated-looks", icon: "sparkles", label: "AI 룩 제작", short: "AI" },
  { href: "/dashboard/designer/short", icon: "video", label: "숏폼 제작", short: "숏폼" },
  { href: "/dashboard/designer/orders", icon: "inbox", label: "받은 의뢰", short: "의뢰", tag: "예정" },
  { href: "/dashboard/designer/brand", icon: "badge", label: "브랜드 프로필", short: "브랜드" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/designer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSideNav() {
  const pathname = usePathname();
  return (
    <aside className="st-side">
      <nav>
        {STUDIO_NAV.map((item) => (
          <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
            <span className="ic"><NavIcon name={item.icon} /></span> {item.label}
            {item.tag ? <span className="tag">{item.tag}</span> : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

export function StudioTabBar() {
  const pathname = usePathname();
  const tabs = STUDIO_NAV.filter((item) => item.href !== "/dashboard/designer/orders");
  return (
    <nav className="st-tabbar">
      {tabs.map((item) => (
        <Link key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : ""}>
          <span className="ic"><NavIcon name={item.icon} /></span>{item.short}
        </Link>
      ))}
    </nav>
  );
}
