import Link from "next/link";
import { requireApprovedDesigner } from "@/lib/auth";

export default async function DesignerDashboardPage() {
  const { designer } = await requireApprovedDesigner();

  return (
    <main className="page">
      <p className="kicker">Designer Dashboard</p>
      <h1 style={{ marginTop: 0, fontSize: 48 }}>{designer.brand_name}</h1>
      <section className="dashboard-grid">
        <Link className="dash-card" href="/dashboard/designer/products">
          <p className="kicker">Products</p>
          <h2>상품 관리</h2>
          <p className="notice">상품 등록, 수정, 삭제와 이미지 업로드를 관리합니다.</p>
        </Link>
        <Link className="dash-card" href="/dashboard/designer/generated-looks">
          <p className="kicker">Generated Looks</p>
          <h2>생성 이미지</h2>
          <p className="notice">AI 룩북 생성 결과와 캐시 상태를 확인합니다.</p>
        </Link>
      </section>
    </main>
  );
}
