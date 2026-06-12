"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import NavIcon from "@/components/NavIcons";
import LogoutButton from "@/components/LogoutButton";

export type NavItem = {
  href: string;
  icon: "home" | "shirt" | "sparkles" | "video" | "inbox" | "badge";
  label: string;
  short?: string;
  tag?: string;
};

const PRODUCT_SUBNAV = [
  { icon: "file" as const, label: "상세페이지", tag: "예정" },
  { icon: "book" as const, label: "룩북 제작", tag: "예정" },
];

export const STUDIO_NAV: NavItem[] = [
  { href: "/dashboard/designer/brand", icon: "badge", label: "브랜드 프로필", short: "프로필" },
  { href: "/dashboard/designer/products", icon: "shirt", label: "상품 작업", short: "상품" },
  { href: "/dashboard/designer/generated-looks", icon: "sparkles", label: "AI 룩 제작", short: "AI" },
  { href: "/dashboard/designer/short", icon: "video", label: "숏폼 제작", short: "숏폼" },
  { href: "/dashboard/designer/orders", icon: "inbox", label: "받은 의뢰", short: "의뢰", tag: "예정" },
  { href: "/dashboard/designer", icon: "home", label: "대시보드", short: "홈" },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/designer") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function StudioSideNav({ brandName, publicHref }: { brandName: string; publicHref: string }) {
  const pathname = usePathname();
  const productActive = isActive(pathname, "/dashboard/designer/products");
  const [productOpen, setProductOpen] = useState(productActive);
  const initial = (brandName || "K").trim().charAt(0).toUpperCase();

  return (
    <aside className="st-side">
      <nav>
        {STUDIO_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          if (item.href === "/dashboard/designer/products") {
            return (
              <div className={`st-nav-group${productOpen ? " is-open" : ""}`} key={item.href}>
                <button
                  type="button"
                  className={`st-nav-toggle ${active ? "is-active" : ""}`}
                  onClick={() => setProductOpen((current) => !current)}
                  aria-expanded={productOpen}
                >
                  <span className="ic"><NavIcon name={item.icon} /></span>
                  {item.label}
                  <span className="st-chevron" aria-hidden="true">{productOpen ? "−" : "+"}</span>
                </button>
                {productOpen ? (
                  <div className="st-subnav" aria-label="상품 작업 하위 메뉴">
                    <Link className={active ? "st-subitem is-active" : "st-subitem"} href={item.href}>
                      <span className="ic"><NavIcon name="shirt" /></span>
                      내 상품
                    </Link>
                    {PRODUCT_SUBNAV.map((subitem) => (
                      <span className="st-subitem is-soon" key={subitem.label}>
                        <span className="ic"><NavIcon name={subitem.icon} /></span>
                        {subitem.label}
                        <span className="tag">{subitem.tag}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={active ? "is-active" : ""}>
              <span className="ic"><NavIcon name={item.icon} /></span> {item.label}
              {item.tag ? <span className="tag">{item.tag}</span> : null}
            </Link>
          );
        })}
      </nav>
      <div className="st-account-card">
        <div className="st-account-avatar">{initial}</div>
        <div className="st-account-copy">
          <span>디자이너 스튜디오</span>
          <strong>{brandName}</strong>
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
