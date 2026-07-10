import LoginEditorialPanel from "@/components/LoginEditorialPanel";
import LoginForm from "@/components/LoginForm";
import { isGoogleLoginConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="page login-page">
      <section className="login-hero">
        <LoginEditorialPanel />
        <div className="login-auth-column">
          <div className="login-auth-intro">
            <p className="login-auth-brand">K-MODU</p>
            <h1>디자이너 스튜디오</h1>
            <p>당신의 브랜드를 세계에 소개하세요.</p>
            <span>로그인 후 브랜드 등록과 AI 룩북 제작을 시작할 수 있습니다.</span>
          </div>
          <LoginForm googleEnabled={isGoogleLoginConfigured()} />
          <p className="login-legal">
            계속 진행하면 <a href="/terms">이용약관</a> 및 <a href="/privacy-policy">개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </section>
    </main>
  );
}
