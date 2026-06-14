import LoginForm from "@/components/LoginForm";
import { isGoogleLoginConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="page login-page">
      <section className="login-hero">
        <div className="login-copy">
          <p className="kicker">K-MODU</p>
          <h1>반갑습니다</h1>
          <p className="lead">
            한국 디자이너 브랜드를 위한 AI 룩북·숏폼 제작과 글로벌 크리에이터 매칭 플랫폼이에요.
            브랜드를 등록하고 스튜디오를 열어보세요.
          </p>
        </div>
        <LoginForm googleEnabled={isGoogleLoginConfigured()} />
      </section>
    </main>
  );
}
