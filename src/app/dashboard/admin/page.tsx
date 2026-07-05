// 관리자 홈: 스크롤 없이 핵심 지표만 한눈에. 카드를 누르면 해당 관리 화면으로 이동.
import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/db";

export default async function AdminDashboardPage() {
  const stats = await getAdminDashboardStats();

  const totals = [
    { n: stats.usersTotal, l: "가입 회원", href: "/dashboard/admin/users" },
    { n: stats.designersTotal, l: "전체 디자이너", href: "/dashboard/admin/designers" },
    { n: stats.pendingDesigners, l: "승인 대기", href: "/dashboard/admin/designers", alert: stats.pendingDesigners > 0 },
    { n: stats.productsTotal, l: "공개 상품", href: "/dashboard/admin/products" },
    { n: stats.generatedLooksTotal, l: "AI 생성 이미지", href: "/dashboard/admin/generated-looks" },
  ];
  const trend = [
    { n: stats.signupsToday, l: "오늘 가입", href: "/dashboard/admin/users" },
    { n: stats.signupsWeek, l: "최근 7일 가입", href: "/dashboard/admin/users" },
    { n: stats.liveGenerationsToday, l: "AI 오늘 생성", href: "/dashboard/admin/generated-looks" },
    { n: stats.aiGenerationsWeek, l: "AI 최근 7일", href: "/dashboard/admin/generated-looks" },
  ];

  return (
    <>
      <h1 className="st-title">관리자 홈</h1>
      <p className="st-sub">핵심 지표를 한눈에. 카드를 누르면 해당 관리 화면으로 이동합니다.</p>

      <div className="st-stats admin-stats">
        {totals.map((s) => (
          <Link className={`st-stat${s.alert ? " is-alert" : ""}`} href={s.href} key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </Link>
        ))}
      </div>

      <p className="admin-stats-label">가입·AI 생성 추이</p>
      <div className="st-stats admin-stats-sub">
        {trend.map((s) => (
          <Link className="st-stat" href={s.href} key={s.l}>
            <div className="n">{s.n}</div>
            <div className="l">{s.l}</div>
          </Link>
        ))}
      </div>
    </>
  );
}
