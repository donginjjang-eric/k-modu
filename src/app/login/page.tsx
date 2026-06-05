import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <main className="page">
      <section className="hero" style={{ minHeight: "auto" }}>
        <div>
          <p className="kicker">Partner Login</p>
          <h1>로그인</h1>
          <p className="lead">
            디자이너와 관리자가 사용하는 파트너 로그인입니다. 디자이너는 상품과 AI 생성 이미지를 관리하고,
            관리자는 브랜드 승인과 운영 상태를 확인합니다.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
