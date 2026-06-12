import LoginForm from "@/components/LoginForm";
import { isGoogleLoginConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="page login-page">
      <section className="login-hero">
        <div className="login-copy">
          <p className="kicker">Partner Login</p>
          <h1>로그인</h1>
          <p className="lead">
            K-MODU 파트너 계정 전용 로그인입니다. 브랜드 신청 승인 후 발급된 계정으로 상품, AI 룩,
            캠페인 운영 상태를 관리할 수 있습니다.
          </p>
        </div>
        <LoginForm googleEnabled={isGoogleLoginConfigured()} />
      </section>
    </main>
  );
}
