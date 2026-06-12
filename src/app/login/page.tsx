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
            한국 디자이너 브랜드와 글로벌 크리에이터를 연결하는 K-MODU입니다.
            구글 계정으로 간편하게 시작하세요.
          </p>
        </div>
        <LoginForm googleEnabled={isGoogleLoginConfigured()} />
      </section>
    </main>
  );
}
