import Link from "next/link";
import {
  getAdminDashboardStats,
  getAllDesigners,
  getDesignerGenerationUsage,
  getGeneratedLooksForAdmin,
  getGenerationUsageOverview,
} from "@/lib/db";
import GenerationLimitControl from "@/components/GenerationLimitControl";
import { getApprovalStatusLabel } from "@/lib/status-labels";

function weekdayLabel(dateStr: string) {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return days[day] ?? "";
}

export default async function AdminDashboardPage() {
  const [stats, designers, looks, usageOverview, designerUsage] = await Promise.all([
    getAdminDashboardStats(),
    getAllDesigners(),
    getGeneratedLooksForAdmin(8),
    getGenerationUsageOverview(),
    getDesignerGenerationUsage(),
  ]);
  const pending = designers.filter((designer) => designer.approval_status === "pending").slice(0, 4);
  const peakDaily = Math.max(1, ...usageOverview.daily.map((d) => d.count));

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">디자이너 승인, 상품/AI 생성 현황, 운영 체크를 한 화면에서 봅니다.</p>

      <div className="st-stats admin-stats">
        <div className="st-stat"><div className="n">{stats.usersTotal}</div><div className="l">가입 회원</div></div>
        <div className="st-stat"><div className="n">{stats.designersTotal}</div><div className="l">전체 디자이너</div></div>
        <div className="st-stat"><div className="n">{stats.pendingDesigners}</div><div className="l">승인 대기</div></div>
        <div className="st-stat"><div className="n">{stats.productsTotal}</div><div className="l">공개 상품</div></div>
        <div className="st-stat"><div className="n">{stats.generatedLooksTotal}</div><div className="l">AI 생성 이미지</div></div>
      </div>

      <div className="st-actions admin-actions-grid">
        <Link className="st-bigbtn dark" href="/dashboard/admin/designers">
          <div><div className="t">디자이너 승인 관리</div><div className="d">신규 브랜드를 승인하거나 비활성화합니다.</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/admin/users">
          <div><div className="t">회원 관리</div><div className="d">가입 계정 전체와 디자이너 신청 전 회원을 봅니다.</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/admin/products">
          <div><div className="t">상품 전체 관리</div><div className="d">등록 상품을 확인하고 공개 상태를 조정합니다.</div></div>
          <div className="go">→</div>
        </Link>
        <Link className="st-bigbtn" href="/dashboard/admin/generated-looks">
          <div><div className="t">AI 생성 이미지 확인</div><div className="d">최근 생성 결과와 상태를 빠르게 점검합니다.</div></div>
          <div className="go">→</div>
        </Link>
      </div>

      <section className="st-card gen-overview">
        <div className="st-sec-head">
          <div>
            <h2>AI 생성 사용량</h2>
            <p className="st-sub tight">공개 화면의 실제 생성(비용)만 집계해요. 캐시 재사용은 비용이 없어요.</p>
          </div>
          <div className="gen-overview-totals">
            <span><b>{usageOverview.today}</b> 오늘</span>
            <span><b>{usageOverview.week}</b> 최근 7일</span>
          </div>
        </div>

        <div className="gen-trend" aria-label="최근 7일 일별 생성">
          {usageOverview.daily.map((d) => (
            <div className="gen-trend-col" key={d.date} title={`${d.date} · ${d.count}건`}>
              <div className="gen-trend-bar">
                <i style={{ height: `${Math.round((d.count / peakDaily) * 100)}%` }} />
                <span className="gen-trend-val">{d.count}</span>
              </div>
              <span className="gen-trend-day">{weekdayLabel(d.date)}</span>
            </div>
          ))}
        </div>

        <div className="gen-overview-list">
          <div className="gen-overview-list-head">
            <span>브랜드</span>
            <span>오늘 / 한도</span>
            <span>조정</span>
          </div>
          {designerUsage.length ? designerUsage.map((u) => {
            const ratio = u.daily_generation_limit ? Math.min(100, Math.round((u.today_count / u.daily_generation_limit) * 100)) : 0;
            return (
              <div className="gen-overview-row" key={u.id}>
                <Link className="admin-title-link" href={`/dashboard/admin/designers/${u.id}`}>{u.brand_name}</Link>
                <span>
                  <b>{u.today_count}</b> / {u.daily_generation_limit}
                  <div className="gen-usage-bar"><i style={{ width: `${ratio}%` }} /></div>
                </span>
                <GenerationLimitControl designerId={u.id} initialLimit={u.daily_generation_limit} />
              </div>
            );
          }) : <div className="st-empty compact"><p>승인된 디자이너가 없습니다.</p></div>}
        </div>
      </section>

      <div className="st-grid2col">
        <section className="st-card">
          <div className="st-sec-head">
            <h2>승인 대기</h2>
            <Link href="/dashboard/admin/designers">전체 보기 →</Link>
          </div>
          {pending.length ? (
            <div className="admin-list">
              {pending.map((designer) => (
                <Link key={designer.id} className="admin-row" href={`/dashboard/admin/designers/${designer.id}`}>
                  <div>
                    <b>{designer.brand_name}</b>
                    <span>{designer.country || "국가 미입력"} · {designer.mood || "무드 미입력"}</span>
                  </div>
                  <em className="status-badge pending">{getApprovalStatusLabel(designer.approval_status)}</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>현재 승인 대기 디자이너가 없습니다.</p></div>
          )}
        </section>

        <section className="st-card">
          <div className="st-sec-head">
            <h2>최근 AI 생성</h2>
            <Link href="/dashboard/admin/generated-looks">전체 보기 →</Link>
          </div>
          {looks.length ? (
            <div className="admin-look-grid">
              {looks.map((look) => (
                <div key={look.id} className="admin-look-thumb" style={{ backgroundImage: `url('${look.image_url}')` }}>
                  <span>{look.designer_brand_name || "Unknown"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="st-empty compact"><p>아직 생성된 AI 이미지가 없습니다.</p></div>
          )}
        </section>
      </div>
    </>
  );
}
