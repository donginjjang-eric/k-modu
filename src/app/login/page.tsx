import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="page">
      <section className="hero" style={{ minHeight: "auto" }}>
        <div>
          <p className="kicker">Partner Login</p>
          <h1>로그인</h1>
          <p className="lead">
            이메일/비밀번호 기반 파트너 로그인입니다. 승인된 디자이너만 디자이너 대시보드에 접근할 수 있고,
            관리자는 승인/비활성화 작업을 처리합니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
