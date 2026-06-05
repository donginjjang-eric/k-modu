import Link from "next/link";
import { getGeneratedLooksForAdmin } from "@/lib/db";

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
      <h1 className="st-title">AI 생성 이미지</h1>
      <p className="st-sub">최근 생성 이미지, 브랜드, 캐시 여부와 생성 상태를 확인합니다.</p>

      {looks.length ? (
        <div className="admin-gallery">
          {looks.map((look) => (
            <article className="st-pcard" key={look.id}>
              <div className="img" style={{ backgroundImage: `url('${look.image_url}')` }}>
                <span className={`badge ${look.status === "hidden" ? "priv" : "pub"}`}>{look.status}</span>
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
