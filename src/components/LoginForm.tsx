"use client";

// 파트너 로그인: 구글 로그인 단일 방식. 로그인된 상태면 상태 카드(누구로 로그인됨 + 다음 행동)를 보여준다.
import { useEffect, useState } from "react";

const PARAM_MESSAGES: Record<string, string> = {
  approval_required: "승인된 디자이너 계정만 사용할 수 있어요. 승인 완료 후 다시 로그인해주세요.",
  approval_pending: "디자이너 신청이 접수되어 있어요. 관리자 승인이 끝나면 같은 구글 계정으로 바로 이용할 수 있어요.",
  apply_required: "이 구글 계정으로 접수된 디자이너 신청이 없어요. 디자이너 등록 신청을 먼저 완료해주세요.",
  login_required: "디자이너 등록 신청은 구글 로그인 후 진행돼요. 로그인하면 신청 페이지로 바로 이동해요.",
  designer_required: "디자이너 계정으로 로그인해야 이용할 수 있는 페이지예요.",
  admin_login: "관리자 콘솔은 로그인 후 이용할 수 있어요. 관리자 권한이 있는 구글 계정으로 로그인해주세요.",
  designer_login: "디자이너 스튜디오는 로그인 후 이용할 수 있어요. 구글 계정으로 로그인해주세요.",
  studio_profile_required: "이 계정에는 아직 디자이너 프로필이 없어요. 디자이너 등록 신청을 완료하면 스튜디오가 열려요.",
  google_failed: "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요.",
  google_not_configured: "구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.",
};

type Me = {
  user: { id: string; email: string; role: string } | null;
  designer: { id: string; brandName: string; approvalStatus: string } | null;
};

export default function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [me, setMe] = useState<Me>({ user: null, designer: null });
  // 깜빡임 방지: 로그인 상태 확인이 끝나기 전엔 폼/카드를 그리지 않는다.
  const [checked, setChecked] = useState(false);
  // 로그인 후 복귀할 사이트 내 경로 (예: /apply에서 유도된 경우)
  const [nextPath, setNextPath] = useState("");
  // 관리자 페이지 접근이 차단되어 온 경우: 계정 전환 안내를 최우선으로 보여준다.
  const [adminRequired, setAdminRequired] = useState(false);
  // 카카오톡 등 인앱 브라우저: 구글이 OAuth를 차단하므로 외부 브라우저로 탈출시킨다.
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isKakao = ua.includes("kakaotalk");
    // 구글이 OAuth를 막는 주요 인앱 웹뷰. K-MODU 타깃(틱톡 크리에이터·말레이시아)을 고려해
    // 틱톡(musical_ly/bytedance/trill)·위챗(micromessenger)·스레드(barcelona)까지 포함.
    const isOtherInApp = /instagram|fbav|fban|fb_iab|micromessenger|line\/|naver\(inapp|daumapps|everytimeapp|musical_ly|bytedancewebview|tiktok|trill|threads|barcelona|snapchat|kakaostory/.test(ua);
    if (isKakao) {
      setInAppBrowser(true);
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
    } else if (isOtherInApp) {
      setInAppBrowser(true);
      // Android는 크롬으로 강제 전환 시도. iOS는 강제 전환 수단이 없어 안내 화면(수동 복사)으로 처리.
      if (ua.includes("android")) {
        window.location.href = `intent://${window.location.host}${window.location.pathname}${window.location.search}#Intent;scheme=https;package=com.android.chrome;end`;
      }
    }
  }, []);

  const copyCurrentUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("링크를 복사했어요. Safari·Chrome 등 기본 브라우저에 붙여넣어 열어주세요.");
    } catch {
      setMessage("링크 복사가 안 됐어요. 주소창의 URL을 길게 눌러 복사한 뒤 기본 브라우저에서 열어주세요.");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const key = params.get("notice") || params.get("error") || "";
    if (PARAM_MESSAGES[key]) setMessage(PARAM_MESSAGES[key]);
    if (params.get("error") === "admin_required") setAdminRequired(true);
    const next = params.get("next") || "";
    if (next.startsWith("/") && !next.startsWith("//")) setNextPath(next);

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setMe({ user: data.user, designer: data.designer || null });
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    window.location.href = "/login";
  };

  if (inAppBrowser) {
    return (
      <div className="generate-box login-form-card">
        <p className="login-status-email">외부 브라우저로 열어주세요</p>
        <p className="login-google-hint">
          카카오톡·인스타그램·틱톡 등 앱 안의 브라우저에서는 구글 정책상 로그인이 차단돼요.
          자동 전환되지 않으면 아래 버튼으로 링크를 복사해 Safari·Chrome 등 기본 브라우저에 붙여넣거나,
          우측 메뉴(⋮ 또는 공유 버튼)에서 &ldquo;다른 브라우저로 열기&rdquo;를 눌러주세요.
        </p>
        <button className="generate-button login-status-cta" type="button" onClick={copyCurrentUrl}>
          링크 복사하기
        </button>
        {message ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  if (!checked) {
    return (
      <div className="generate-box login-form-card">
        <p className="login-google-hint">로그인 상태를 확인하는 중…</p>
      </div>
    );
  }

  // 이미 로그인된 상태: 로그인 폼 대신 상태 카드
  if (me.user) {
    const isAdmin = me.user.role === "admin";
    const isApproved = me.designer?.approvalStatus === "approved";
    const isPending = !isApproved && Boolean(me.designer);
    const notApplied = !isAdmin && !isApproved && !me.designer;
    return (
      <div className="generate-box login-form-card">
        <div className="login-status-head">
          <p className="login-status-badge">✓ 로그인됨</p>
          <p className="login-status-email">{me.user.email}</p>
        </div>

        {adminRequired && !isAdmin ? (
          <>
            <p className="login-google-hint">
              이 계정에는 관리자 권한이 없어요. 관리자 권한이 있는 계정으로 다시 로그인해주세요.
            </p>
            <button className="generate-button login-status-cta" type="button" onClick={logout}>
              로그아웃하고 다른 계정으로 로그인
            </button>
          </>
        ) : isAdmin ? (
          <>
            <p className="login-google-hint">관리자 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/admin">관리자 콘솔 열기</a>
            {me.designer ? (
              <a className="generate-button login-status-cta" href="/dashboard/designer/brand">
                디자이너 스튜디오 열기 ({me.designer.brandName})
              </a>
            ) : (
              <a className="login-email-toggle" href="/apply">내 브랜드 등록하고 스튜디오 열기</a>
            )}
          </>
        ) : isApproved ? (
          <>
            <p className="login-google-hint">{me.designer?.brandName || "디자이너"} 계정으로 로그인되어 있어요.</p>
            <a className="generate-button login-status-cta" href="/dashboard/designer/brand">디자이너 스튜디오 열기</a>
          </>
        ) : isPending ? (
          <div className="login-onboard">
            <p className="login-onboard-title">신청이 접수됐어요 — 승인을 기다리는 중이에요</p>
            <p className="login-google-hint">
              <b>{me.designer?.brandName || "브랜드"}</b> 신청을 검토하고 있어요. 승인이 끝나면 이 화면에서 바로 스튜디오가 열려요. 같은 구글 계정으로 다시 들어오면 돼요.
            </p>
            <ol className="login-steps">
              <li className="is-done"><span>✓</span><div><b>브랜드 등록 신청</b><small>접수 완료</small></div></li>
              <li className="is-active"><span>2</span><div><b>관리자 승인</b><small>검토 중 · 승인되면 알려드려요</small></div></li>
              <li><span>3</span><div><b>스튜디오 오픈</b><small>룩북·상품 등록, 크리에이터 매칭</small></div></li>
            </ol>
          </div>
        ) : (
          <div className="login-onboard">
            <p className="login-onboard-title">환영해요! K&#8209;MODU 디자이너로 시작해볼까요?</p>
            <p className="login-google-hint">브랜드를 등록하면 AI 룩북·숏폼을 만들고 글로벌 크리에이터와 매칭돼요. 신청은 1분이면 끝나요.</p>
            <ol className="login-steps">
              <li className="is-active"><span>1</span><div><b>브랜드 등록 신청</b><small>브랜드명·소개만 입력 (1분)</small></div></li>
              <li><span>2</span><div><b>관리자 승인</b><small>검토 후 승인되면 알려드려요</small></div></li>
              <li><span>3</span><div><b>스튜디오 오픈</b><small>룩북·상품 등록, 크리에이터 매칭 시작</small></div></li>
            </ol>
            <a className="generate-button login-status-cta" href="/apply">디자이너 등록 신청하기</a>
          </div>
        )}

        <button className="login-email-toggle" type="button" onClick={logout}>로그아웃</button>
        {message && !notApplied ? <p className="notice">{message}</p> : null}
      </div>
    );
  }

  return (
    <div className="generate-box login-form-card">
      {googleEnabled ? (
        <>
          <a className="google-login-button" href={`/api/auth/google${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}>
            <span className="g-chip" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            Google로 시작하기
          </a>
          <p className="login-google-hint">
            처음이라면 로그인 후 디자이너 등록 신청으로 바로 이어져요.
            승인되면 같은 계정으로 스튜디오가 열립니다.
          </p>
        </>
      ) : (
        <p className="login-google-hint">구글 로그인이 아직 설정되지 않았어요. 관리자에게 문의해주세요.</p>
      )}
      {message ? <p className="notice">{message}</p> : null}
    </div>
  );
}
