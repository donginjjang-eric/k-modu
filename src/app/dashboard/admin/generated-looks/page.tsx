import Link from "next/link";
import { getGeneratedLooksForAdmin } from "@/lib/db";
import AdminGeneratedLookActions from "@/components/AdminGeneratedLookActions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminGeneratedLooksPage() {
  const looks = await getGeneratedLooksForAdmin(80);

  return (
    <>
      <h1 className="st-title">AI 결과 검수</h1>
      <p className="st-sub">생성된 AI 룩을 확인하고 공개 승인, 반려, 숨김 상태를 관리합니다.</p>

      {looks.length ? (
        <div className="admin-gallery">
          {looks.map((look) => (
            <article className="st-pcard" key={look.id}>
              <div className="img" style={{ backgroundImage: `url('${look.image_url}')` }}>
                <span className={`badge ${look.status === "approved" ? "pub" : "priv"}`}>{look.status}</span>
              </div>
              <div className="b">
                <div className="c">
                  <Link href={`/dashboard/admin/designers/${look.designer_id}`}>
                    {look.designer_brand_name || "Unknown designer"}
                  </Link>
                </div>
                <div className="n">{look.cache_hit ? "Cached generation" : "Live generation"}</div>
                <div className="st-prices">
                  <span className="supply">{formatDate(look.created_at)}</span>
                  <span className="retail">{look.provider}</span>
                </div>
                <AdminGeneratedLookActions lookId={look.id} status={look.status} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="st-empty">
          <div className="ic">AI</div>
          <p>아직 생성된 AI 이미지가 없습니다.</p>
        </div>
      )}
    </>
  );
}
