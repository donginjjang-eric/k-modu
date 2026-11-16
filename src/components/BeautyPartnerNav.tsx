"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WorkspaceAccountCard from "@/components/WorkspaceAccountCard";
import NavIcon from "@/components/NavIcons";
import { BEAUTY_PARTNER_NAV_ITEMS, isBeautyPartnerPathActive } from "@/lib/brand-partner-center";

type AccountProps = {
  brandName: string;
  publicHref: string;
  googleName?: string;
  googleAvatar?: string;
  googleEmail?: string;
};

export function BeautyPartnerSideNav({ brandName, publicHref, googleName, googleAvatar, googleEmail }: AccountProps) {
  const pathname = usePathname();
  const googleLabel = googleName || googleEmail;

  return (
    <aside className="beauty-side">
      <nav aria-label="뷰티 파트너 센터 메뉴">
        <p className="beauty-nav-label">PARTNER WORKSPACE</p>
        {BEAUTY_PARTNER_NAV_ITEMS.map((item) => {
          if (item.availability === "upcoming") {
            return (
              <span className="beauty-nav-item is-upcoming" aria-disabled="true" data-destination={item.href} key={item.href}>
                <span className="ic"><NavIcon name={item.icon} /></span>
                <span>{item.label}</span>
                <small>준비 중</small>
              </span>
            );
          }
          const active = isBeautyPartnerPathActive(pathname, item.href);
          return (
            <Link className={`beauty-nav-item${active ? " is-active" : ""}`} href={item.href} key={item.href}>
              <span className="ic"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <WorkspaceAccountCard
        centerLabel="뷰티 브랜드 센터"
        title={brandName}
        detail={googleLabel}
        avatarUrl={googleAvatar}
        publicHref={publicHref}
        publicLabel="공개 상품"
        tone="beauty"
      />
    </aside>
  );
}

export function BeautyPartnerMobileNav() {
  const pathname = usePathname();
  const tabs = BEAUTY_PARTNER_NAV_ITEMS.filter((item) => item.availability === "active");

  return (
    <nav className="beauty-mobile-nav" aria-label="뷰티 파트너 센터 모바일 메뉴">
      {tabs.map((item) => (
        <Link className={isBeautyPartnerPathActive(pathname, item.href) ? "is-active" : ""} href={item.href} key={item.href}>
          <span className="ic"><NavIcon name={item.icon} /></span>
          <span>{item.short}</span>
        </Link>
      ))}
    </nav>
  );
}
