import "./workspaces.css";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import NavIcon from "@/components/NavIcons";
import { requireUser } from "@/lib/auth";
import { listUserWorkspaces } from "@/lib/workspace-access";

const centers = {
  admin: { title: "관리자 콘솔", action: "관리자 콘솔 열기", description: "계정과 브랜드를 관리합니다.", icon: "badge" },
  creator: { title: "크리에이터 센터", action: "크리에이터 센터 열기", description: "캠페인을 찾고 협업을 관리합니다.", icon: "user" },
  fashion_partner: { title: "패션 브랜드 센터", action: "디자이너 스튜디오 열기", description: "패션 상품과 룩북을 관리합니다.", icon: "shirt" },
  beauty_partner: { title: "뷰티 브랜드 센터", action: "뷰티 센터 열기", description: "뷰티 상품을 등록하고 협업을 관리합니다.", icon: "package" },
  agency: { title: "관리 대행사 센터", action: "대행사 센터 열기", description: "소속 크리에이터와 캠페인을 관리합니다.", icon: "building" },
} as const;

export default async function WorkspaceSelectionPage({ searchParams }: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[] }>;
}) {
  const user = await requireUser();
  const memberships = await listUserWorkspaces(user.id);
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : "";
  const showBeautySignup = !memberships.some((membership) => membership.workspace_type === "beauty_partner")
    && (next.startsWith("/dashboard/beauty") || memberships.length === 0);
  const groups = [
    { status: "active", title: "사용 가능" },
    { status: "pending", title: "승인 대기" },
    { status: "disabled", title: "이용 중지" },
  ] as const;

  return (
    <div className="workspace-picker">
      <header className="workspace-picker-bar">
        <Link href="/" aria-label="K-MODU 홈">
          <img src="/assets/k-modu-logo.png" alt="K-MODU" width={133} height={24} />
        </Link>
        <LogoutButton className="workspace-picker-logout" />
      </header>
      <main className="workspace-picker-main">
        <h1>이용할 센터를 선택하세요</h1>
        <p className="workspace-picker-account"><NavIcon name="user" /> {user.email}</p>
        {params.error === "selection" ? <p className="workspace-picker-error" role="alert">센터를 열 수 없습니다. 사용 가능한 센터를 다시 선택해 주세요.</p> : null}
        {showBeautySignup ? (
          <section aria-label="뷰티 브랜드 가입" className="workspace-picker-signup">
            <div>
              <h2>뷰티 상품을 처음 등록하시나요?</h2>
              <p>브랜드를 등록하면 상품 사진과 정보를 바로 올릴 수 있습니다.</p>
            </div>
            <Link href="/beauty/join" className="workspace-picker-action">뷰티 판매자 가입</Link>
          </section>
        ) : null}
        {groups.map((group) => {
          const items = memberships.filter((membership) => membership.status === group.status);
          if (!items.length) return null;

          return (
            <section key={group.status} className="workspace-picker-group">
              <h2>{group.title}</h2>
              <div className="workspace-picker-grid">
                {items.map((membership) => {
                  const center = centers[membership.workspace_type];
                  return (
                    <article key={membership.id} className="workspace-picker-card" data-center={membership.workspace_type}>
                      <span className="workspace-picker-icon"><NavIcon name={center.icon} /></span>
                      <h3>{center.title}</h3>
                      {membership.brand_name ? <p className="workspace-picker-brand">{membership.brand_name}</p> : null}
                      <p className="workspace-picker-description">{center.description}</p>
                      {group.status === "active" ? (
                        <form action="/api/workspaces/select" method="post">
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <input type="hidden" name="next" value={next} />
                          <button className="workspace-picker-action" type="submit">{center.action}<span aria-hidden="true">→</span></button>
                        </form>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}

