import "../designer/studio.css";
import "./beauty.css";
import Link from "next/link";
import { requireBeautyPartner } from "@/lib/auth";
import { BeautyPartnerMobileNav, BeautyPartnerSideNav } from "@/components/BeautyPartnerNav";
import MasterRoleSwitcher from "@/components/MasterRoleSwitcher";
import ScrollResetOnLoad from "@/components/ScrollResetOnLoad";

export default async function BeautyPartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, designer } = await requireBeautyPartner();

  const publicHref = "/beauty";

  return (
    <div className="studio beauty-partner">
      <ScrollResetOnLoad />
      <MasterRoleSwitcher userId={user.id} email={user.email} active="beauty_partner" />
      <header className="st-top beauty-topbar">
        <Link className="brand" href="/dashboard/beauty">
          <b>K-MODU</b>
          <span className="beauty-role-chip">뷰티 파트너 센터</span>
        </Link>
        <div className="top-context">
          <Link className="top-link" href={publicHref}>공개 상품</Link>
          <div className="me compact">
            <span className="role-label">BEAUTY BRAND</span>
            <span>{designer.brand_name}</span>
          </div>
        </div>
      </header>

      <div className="beauty-shell">
        <BeautyPartnerSideNav
          brandName={designer.brand_name}
          publicHref={publicHref}
          googleName={user.name}
          googleAvatar={user.avatar}
          googleEmail={user.email}
        />
        <main className="beauty-main">{children}</main>
      </div>
      <BeautyPartnerMobileNav />
    </div>
  );
}
