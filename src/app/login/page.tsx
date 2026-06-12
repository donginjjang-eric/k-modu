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
            구글 계정으로 로그인하세요. 디자이너 등록 신청이 승인되면 같은 계정으로
            상품, AI 룩, 캠페인 운영 상태를 관리할 수 있습니다.
          </p>
        </div>
        <LoginForm googleEnabled={isGoogleLoginConfigured()} />
      </section>
    </main>
  );
}
