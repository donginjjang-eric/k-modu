"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcons";
import LogoutButton from "@/components/LogoutButton";

export type NavItem = {
  href: string;
  icon: "home" | "shirt" | "sparkles" | "video" | "inbox" | "badge" | "book";
  label: string;
  short?: string;
  tag?: string;
};

// 초기 서비스에서는 숨김 — 추후 기능 추가 시 아래 배열과 렌더 블록을 함께 복원
// const PRODUCT_SUBNAV = [
//   { icon: "file" as const, label: "상세페이지", tag: "예정" },
//   { icon: "book" as const, label: "룩북 제작", tag: "예정" },
// ];

export const STUDIO_NAV: NavItem[] = [
  { href: "/dashboard/designer/brand", icon: "badge", label: "브랜드 프로필", short: "프로필" },
  { href: "/dashboard/designer/products", icon: "shirt", label: "상품 등록", short: "상품" },
  { href: "/dashboard/designer/generated-looks", icon: "sparkles", label: "AI 룩 제작", short: "AI" },
  { href: "/dashboard/designer/lookbooks", icon: "book", label: "룩북 만들기", short: "룩북", tag: "NEW" },
  { href: "/dashboard/designer/short", icon: "video", label: "숏폼 제작", short: "숏폼" },
  { href: "/dashboard/designer/orders", icon: "inbox", label: "받은 의뢰", short: "의뢰" },
  { href: "/dashboard/designer", icon: "home", label: "대시보드", short: "홈" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/designer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSideNav({
  brandName,
  publicHref,
  googleName,
  googleAvatar,
  googleEmail,
}: {
  brandName: string;
  publicHref: string;
  googleName?: string;
  googleAvatar?: string;
  googleEmail?: string;
}) {
  const pathname = usePathname();
  const googleLabel = googleName || googleEmail;

  return (
    <aside className="st-side">
      <nav>
        {/* 초기 서비스: 상품 등록은 하위 메뉴 없이 단일 메뉴로 통합 (페이지에 업로드+관리가 함께 있음) */}
        {STUDIO_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={active ? "is-active" : ""}>
              <span className="ic"><NavIcon name={item.icon} /></span> {item.label}
              {item.tag ? <span className="tag">{item.tag}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="st-account-card">
        <div className="st-account-avatar">
          {googleAvatar ? <img src={googleAvatar} alt="" referrerPolicy="no-referrer" /> : <NavIcon name="user" />}
        </div>
        <div className="st-account-copy">
          <span>디자이너 스튜디오</span>
          <strong>{brandName}</strong>
          {googleLabel ? <small className="st-account-google" title={googleEmail}>{googleLabel}</small> : null}
        </div>
        <div className="st-account-actions">
          <Link href={publicHref}>공개 페이지</Link>
          <LogoutButton />
        </div>
      </div>
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
