import { requireUser } from "@/lib/auth";
import { listUserWorkspaces } from "@/lib/workspace-access";

const labels = {
  admin: "관리자 콘솔",
  creator: "크리에이터 화면",
  fashion_partner: "패션 브랜드 센터",
  beauty_partner: "뷰티 브랜드 센터",
  agency: "관리 대행사 센터",
} as const;

export default async function WorkspaceSelectionPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await requireUser();
  const memberships = await listUserWorkspaces(user.id);
  const { next = "" } = await searchParams;
  const groups = [
    { status: "active", title: "사용 가능" },
    { status: "pending", title: "승인 대기" },
    { status: "disabled", title: "이용 중지" },
  ] as const;

  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "64px 24px", fontFamily: "Pretendard, sans-serif" }}>
      <p style={{ color: "#8c6a2f", fontWeight: 800 }}>K-MODU WORKSPACES</p>
      <h1 style={{ fontSize: 42, margin: "8px 0 12px" }}>이용할 화면을 선택하세요</h1>
      <p style={{ color: "#667085", marginBottom: 40 }}>{user.email} 계정에 연결된 작업공간입니다.</p>
      {groups.map((group) => {
        const items = memberships.filter((membership) => membership.status === group.status);
        return (
          <section key={group.status} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 20 }}>{group.title} <small>{items.length}</small></h2>
            <div style={{ display: "grid", gap: 12 }}>
              {items.map((membership) => (
                <article key={membership.id} style={{ border: "1px solid #ddd6c9", padding: 20, background: "#fff" }}>
                  <strong>{labels[membership.workspace_type]}</strong>
                  {membership.brand_name ? <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{membership.brand_name}</p> : null}
                  {group.status === "active" ? (
                    <form action="/api/workspaces/select" method="post" style={{ marginTop: 14 }}>
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <input type="hidden" name="next" value={next} />
                      <button type="submit">이 화면 열기</button>
                    </form>
                  ) : <p style={{ marginBottom: 0 }}>{group.title}</p>}
                </article>
              ))}
              {items.length === 0 && <p style={{ color: "#98a2b3" }}>해당 작업공간이 없습니다.</p>}
            </div>
          </section>
        );
      })}
    </main>
  );
}

