// 관리자 홈: 스크롤 없이 핵심 지표만 한눈에. 상세 관리는 좌측 메뉴로 이동.
import { getAdminDashboardStats } from "@/lib/db";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const totals = [
    { n: stats.usersTotal, l: "가입 회원" },
    { n: stats.designersTotal, l: "전체 디자이너" },
    { n: stats.pendingDesigners, l: "승인 대기", alert: stats.pendingDesigners > 0 },
    { n: stats.productsTotal, l: "공개 상품" },
    { n: stats.generatedLooksTotal, l: "AI 생성 이미지" },
  ];
  const trend = [
    { n: stats.signupsToday, l: "오늘 가입" },
    { n: stats.signupsWeek, l: "최근 7일 가입" },
    { n: stats.liveGenerationsToday, l: "AI 오늘 생성" },
    { n: stats.aiGenerationsWeek, l: "AI 최근 7일" },
  ];

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">핵심 지표를 한눈에. 상세 관리는 왼쪽 메뉴에서 하세요.</p>

      <div className="st-stats admin-stats">
        {totals.map((s) => (
          <div className={`st-stat${s.alert ? " is-alert" : ""}`} key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>

      <p className="admin-stats-label">가입·AI 생성 추이</p>
      <div className="st-stats admin-stats-sub">
        {trend.map((s) => (
          <div className="st-stat" key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </div>
        ))}
      </div>
    </>
  );
}
