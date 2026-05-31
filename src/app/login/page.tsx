export default function LoginPage() {
  return (
    <main className="page">
      <section className="hero" style={{ minHeight: "auto" }}>
        <div>
          <p className="kicker">Partner Login</p>
          <h1>로그인</h1>
          <p className="lead">
            Phase 1에서는 로그인 화면 틀만 준비합니다. Phase 3에서 이메일/비밀번호 로그인과 승인된 디자이너 접근 제어를 연결합니다.
          </p>
        </div>
        <form className="generate-box">
          <label>
            <p className="kicker">Email</p>
            <input style={{ width: "100%", minHeight: 48, padding: 12 }} placeholder="designer@k-modu.com" disabled />
          </label>
          <label>
            <p className="kicker">Password</p>
            <input style={{ width: "100%", minHeight: 48, padding: 12 }} placeholder="Phase 3에서 활성화" disabled />
          </label>
          <button className="generate-button" type="button" disabled>Login</button>
        </form>
      </section>
    </main>
  );
}
