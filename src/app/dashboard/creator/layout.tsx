import "./creator.css";
import Link from "next/link";
import { requireApprovedCreator } from "@/lib/auth";
import { CreatorSideNav, CreatorTabBar } from "@/components/CreatorNav";
import { CreatorDemoControls } from "@/components/CreatorDemoControls";
import { CreatorPersonaSwitch } from "@/components/CreatorPersonaSwitch";
import MasterRoleSwitcher from "@/components/MasterRoleSwitcher";

export default async function CreatorCenterLayout({ children }: { children: React.ReactNode }) {
  const { user, creator, isPreview } = await requireApprovedCreator();
  return (
    <div className="creator-center">
      <MasterRoleSwitcher userId={user.id} email={user.email} active="creator" />
      {isPreview ? (
        <div className="creator-admin-preview">
          <div className="creator-admin-preview-copy" role="status">
            <strong>관리자 미리보기</strong>
            <span>해외 크리에이터가 실제로 보는 화면입니다.</span>
            <Link href="/dashboard/admin/campaigns">캠페인 관리</Link>
          </div>
          <CreatorPersonaSwitch />
          <CreatorDemoControls />
        </div>
      ) : null}
      <CreatorTabBar creator={creator} user={user} />
      <div className="creator-shell">
        <CreatorSideNav creator={creator} user={user} />
        <main className="creator-content">{children}</main>
      </div>
    </div>
  );
}
