// 공통 헤더 인증 메뉴: 로그인 상태에 따라 [data-auth-link]를 로그인/디자이너 신청/승인 대기중/디자이너 스튜디오/관리자 콘솔로 바꾸고 로그아웃 버튼을 붙인다.
// 새로고침 깜빡임 방지를 위해 마지막 상태를 sessionStorage에 캐시했다가 즉시 적용하고, 서버 응답으로 보정한다.
(() => {
  const CACHE_KEY = 'kmodu-auth-nav-state';
  const STUDIO_PATH = '/dashboard/designer';
  const BEAUTY_STUDIO_PATH = '/dashboard/beauty';
  const KAKAO_CHANNEL_URL = '#contact';

  const ensureStudioQuickBanner = () => {
    if (window.location.pathname.startsWith(STUDIO_PATH)) {
      document.querySelector('.quick-link-stack')?.remove();
      return;
    }

    if (!document.getElementById('studio-quick-banner-style')) {
      const style = document.createElement('style');
      style.id = 'studio-quick-banner-style';
      style.textContent = `
        .quick-link-stack {
          position: fixed;
          z-index: 9998;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 16px;
        }
        .quick-link-stack .studio-quick-banner {
          position: relative;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 92px;
          min-height: 116px;
          padding: 15px 12px 14px;
          border: 1px solid rgba(17, 24, 39, .16);
          border-radius: 18px;
          background: rgba(17, 24, 39, .94);
          color: #fff;
          text-decoration: none;
          box-shadow: 0 18px 44px rgba(17, 24, 39, .22);
          backdrop-filter: blur(12px);
          transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
        }
        .quick-link-stack .creator-quick-banner {
          border-color: rgba(17, 24, 39, .16);
          background: rgba(255, 255, 255, .96);
          color: #111827;
          box-shadow: 0 18px 44px rgba(17, 24, 39, .18);
        }
        .quick-link-stack .beauty-quick-banner {
          border-color: #852148;
          background: #a12d5a;
          box-shadow: 0 18px 44px rgba(161, 45, 90, .28);
        }
        .quick-link-stack .kakao-quick-banner {
          top: auto;
          border-color: rgba(57, 40, 0, .14);
          background: #fee500;
          color: #191600;
          box-shadow: 0 18px 44px rgba(57, 40, 0, .18);
        }
        .quick-link-stack .studio-quick-banner:hover {
          transform: translateX(-2px);
          background: #050505;
          box-shadow: 0 22px 54px rgba(17, 24, 39, .3);
        }
        .quick-link-stack .creator-quick-banner:hover {
          background: #fff;
          box-shadow: 0 22px 54px rgba(17, 24, 39, .24);
        }
        .quick-link-stack .beauty-quick-banner:hover {
          background: #852148;
          box-shadow: 0 22px 54px rgba(161, 45, 90, .36);
        }
        .quick-link-stack .kakao-quick-banner:hover {
          background: #f7dc00;
          box-shadow: 0 22px 54px rgba(57, 40, 0, .25);
        }
        .studio-quick-banner-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: #fff;
          color: #111827;
          font-size: 15px;
          font-weight: 900;
          line-height: 1;
        }
        .kakao-quick-banner .studio-quick-banner-mark {
          background: #191600;
          color: #fee500;
        }
        .creator-quick-banner .studio-quick-banner-mark {
          background: #111827;
          color: #fff;
        }
        .studio-quick-banner strong {
          display: block;
          color: #fff;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.22;
          letter-spacing: 0;
          text-align: center;
        }
        .kakao-quick-banner strong {
          color: #191600;
        }
        .creator-quick-banner strong {
          color: #111827;
        }
        .studio-quick-banner span:not(.studio-quick-banner-mark) {
          display: block;
          color: rgba(255, 255, 255, .72);
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .kakao-quick-banner span:not(.studio-quick-banner-mark) {
          color: rgba(25, 22, 0, .68);
        }
        .creator-quick-banner span:not(.studio-quick-banner-mark) {
          color: rgba(17, 24, 39, .62);
        }
        .quick-link-stack .studio-quick-banner:focus-visible {
          outline: 3px solid currentColor;
          outline-offset: 3px;
        }
        body:has(.creator-center) .quick-link-stack,
        body:has(.modal.is-open) .quick-link-stack,
        body.proposal-open .quick-link-stack,
        body.sheet-open .quick-link-stack {
          opacity: 0;
          pointer-events: none;
        }
        @media (max-width: 760px) {
          body:has(.creator-center) .quick-link-stack {
            display: none;
          }
          .quick-link-stack {
            right: 12px;
            top: auto;
            bottom: calc(24px + env(safe-area-inset-bottom));
            transform: none;
            gap: 10px;
          }
          .quick-link-stack .studio-quick-banner {
            width: auto;
            min-height: 54px;
            padding: 10px 12px;
            border-radius: 999px;
            flex-direction: row;
            gap: 9px;
            transform: none;
          }
          .quick-link-stack .studio-quick-banner:hover {
            transform: translateY(-2px);
          }
          .studio-quick-banner-mark {
            width: 30px;
            height: 30px;
            font-size: 13px;
          }
          .studio-quick-banner strong {
            max-width: 74px;
            font-size: 12px;
            text-align: left;
          }
          .studio-quick-banner span:not(.studio-quick-banner-mark) {
            display: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    if (document.querySelector('.quick-link-stack')) return;
    document.querySelectorAll('.studio-quick-banner, .creator-quick-banner, .kakao-quick-banner, .beauty-quick-banner').forEach((link) => link.remove());

    const stack = document.createElement('aside');
    stack.className = 'quick-link-stack';

    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
      const beautyBanner = document.createElement('a');
      beautyBanner.className = 'studio-quick-banner beauty-quick-banner';
      beautyBanner.href = BEAUTY_STUDIO_PATH;
      beautyBanner.setAttribute('aria-label', '뷰티 스튜디오 바로가기');
      beautyBanner.innerHTML = '<span class="studio-quick-banner-mark">K</span><strong>뷰티<br>스튜디오</strong><span>Beauty</span>';
      stack.appendChild(beautyBanner);
    }

    const banner = document.createElement('a');
    banner.className = 'studio-quick-banner';
    banner.href = STUDIO_PATH;
    banner.setAttribute('aria-label', '디자이너 스튜디오 바로가기');
    banner.innerHTML = '<span class="studio-quick-banner-mark">K</span><strong>디자이너<br>스튜디오</strong><span>Studio</span>';
    stack.appendChild(banner);

    const creatorBanner = document.createElement('a');
    creatorBanner.className = 'studio-quick-banner creator-quick-banner';
    creatorBanner.href = '/dashboard/creator';
    creatorBanner.setAttribute('aria-label', '크리에이터 센터 바로가기');
    creatorBanner.innerHTML = '<span class="studio-quick-banner-mark" aria-hidden="true">K</span><strong>크리에이터 센터</strong><span class="creator-quick-banner-copy">크리에이터 바로가기</span>';
    stack.appendChild(creatorBanner);

    const kakaoBanner = document.createElement('a');
    kakaoBanner.className = 'studio-quick-banner kakao-quick-banner';
    kakaoBanner.href = KAKAO_CHANNEL_URL;
    kakaoBanner.setAttribute('aria-label', '카카오 문의하기');
    kakaoBanner.innerHTML = '<span class="studio-quick-banner-mark">K</span><strong>카카오<br>문의</strong><span>Talk</span>';
    if (/^https?:\/\//.test(KAKAO_CHANNEL_URL)) {
      kakaoBanner.target = '_blank';
      kakaoBanner.rel = 'noopener';
    }
    stack.appendChild(kakaoBanner);
    document.body.appendChild(stack);
  };

  // 승인 전 디자이너에게 "무엇을 기다리는 중인지" 설명하는 말풍선 문구 (approval_status별)
  const pendingHint = (designer) => {
    const brand = designer && designer.brandName ? `'${designer.brandName}' ` : '';
    const status = designer && designer.approvalStatus;
    if (status === 'rejected') return `${brand}디자이너 신청이 반려되었어요. 로그인 페이지에서 안내를 확인해 주세요.`;
    if (status === 'disabled') return `${brand}디자이너 계정이 비활성 상태예요. 관리자에게 문의해 주세요.`;
    return `${brand}디자이너 신청이 접수되어 관리자 승인을 기다리고 있어요. 승인되면 이 버튼이 '디자이너 스튜디오'로 바뀝니다.`;
  };

  const ensureAuthHintStyle = () => {
    if (document.getElementById('auth-link-hint-style')) return;
    const style = document.createElement('style');
    style.id = 'auth-link-hint-style';
    style.textContent = `
      [data-auth-link].auth-link--pending { position: relative; }
      [data-auth-link] .auth-link-hint {
        position: absolute;
        top: calc(100% + 10px);
        right: 0;
        width: min(280px, 80vw);
        padding: 10px 12px;
        border-radius: 12px;
        background: #111;
        color: #fff;
        font-size: 12px;
        font-weight: 500;
        line-height: 1.5;
        letter-spacing: 0;
        text-transform: none;
        text-align: left;
        white-space: normal;
        box-shadow: 0 12px 30px rgba(0, 0, 0, .22);
        opacity: 0;
        visibility: hidden;
        transform: translateY(4px);
        transition: opacity .18s ease, transform .18s ease, visibility .18s;
        pointer-events: none;
        z-index: 1000;
      }
      [data-auth-link] .auth-link-hint::before {
        content: "";
        position: absolute;
        top: -6px;
        right: 18px;
        border: 6px solid transparent;
        border-top: 0;
        border-bottom-color: #111;
      }
      [data-auth-link].auth-link--pending:hover .auth-link-hint,
      [data-auth-link].auth-link--pending:focus-visible .auth-link-hint,
      [data-auth-link].auth-link--pending.is-peek .auth-link-hint {
        opacity: 1;
        visibility: visible;
        transform: none;
      }
      .mobile-login .auth-link-hint { display: none; }
    `;
    document.head.appendChild(style);
  };

  // 승인 대기 버튼에 말풍선을 붙인다. 세션당 한 번은 자동으로 잠깐 펼쳐 보여 준다.
  const PEEK_KEY = 'kmodu-auth-hint-peeked';
  const applyHint = (link, hint) => {
    link.querySelector('.auth-link-hint')?.remove();
    link.classList.remove('auth-link--pending', 'is-peek');
    if (!hint) {
      link.removeAttribute('title');
      return;
    }
    ensureAuthHintStyle();
    link.classList.add('auth-link--pending');
    link.setAttribute('title', hint);
    const bubble = document.createElement('span');
    bubble.className = 'auth-link-hint';
    bubble.setAttribute('role', 'tooltip');
    bubble.textContent = hint;
    link.appendChild(bubble);
    let peeked = false;
    try { peeked = sessionStorage.getItem(PEEK_KEY) === '1'; } catch (error) { /* 무시 */ }
    if (!peeked && !link.classList.contains('mobile-login')) {
      link.classList.add('is-peek');
      try { sessionStorage.setItem(PEEK_KEY, '1'); } catch (error) { /* 무시 */ }
      setTimeout(() => link.classList.remove('is-peek'), 5000);
    }
  };

  const computeTarget = (user, designer) => {
    if (!user) return null;
    if (user.role === 'admin') return { href: '/dashboard/admin', label: '관리자 콘솔' };
    const approved = user.role === 'designer' && designer && designer.approvalStatus === 'approved';
    if (approved) return { href: '/dashboard/designer/brand', label: '디자이너 스튜디오' };
    if (designer) return { href: '/login?notice=approval_pending', label: '승인 대기중', hint: pendingHint(designer) };
    return { href: '/apply', label: '디자이너 신청' };
  };

  const applyTarget = (target) => {
    document.querySelectorAll('[data-auth-link]').forEach((link) => {
      const sibling = link.nextElementSibling;
      const existingLogout = sibling && sibling.classList && sibling.classList.contains('logout-link') ? sibling : null;

      if (!target) {
        link.href = '/login';
        link.textContent = '로그인';
        link.setAttribute('aria-label', '로그인');
        applyHint(link, null);
        if (existingLogout) existingLogout.remove();
        return;
      }

      link.href = target.href;
      link.textContent = target.label;
      link.setAttribute('aria-label', target.label);
      applyHint(link, target.hint);

      if (!existingLogout) {
        // 같은 스타일을 물려받도록 기존 링크를 복제해 로그아웃 버튼을 만든다.
        const logout = link.cloneNode(false);
        logout.removeAttribute('data-auth-link');
        logout.classList.add('logout-link');
        logout.href = '#';
        logout.textContent = '로그아웃';
        logout.setAttribute('aria-label', '로그아웃');
        logout.addEventListener('click', async (event) => {
          event.preventDefault();
          try { sessionStorage.removeItem(CACHE_KEY); } catch (error) { /* 무시 */ }
          try { await fetch('/api/auth/logout', { method: 'POST' }); } catch (error) { /* 무시 */ }
          window.location.href = '/';
        });
        link.after(logout);
      }
    });
  };

  // 로그인 직후 도착 페이지에서 잠깐 보여주는 환영 토스트
  const showToast = (text) => {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = 'position:fixed;left:50%;bottom:36px;transform:translateX(-50%) translateY(10px);'
      + 'background:#111;color:#fff;padding:13px 24px;border-radius:999px;font-size:14px;font-weight:700;'
      + 'z-index:99999;opacity:0;transition:opacity .25s ease,transform .25s ease;'
      + 'box-shadow:0 12px 30px rgba(0,0,0,.28);max-width:90vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  };

  const maybeWelcome = (user, designer) => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('welcome') !== '1' || !user) return;
    // URL에서 플래그 제거 (새로고침 시 토스트 반복 방지)
    params.delete('welcome');
    const query = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    const who = user.role === 'admin'
      ? '관리자'
      : (designer && designer.brandName) || user.email;
    showToast(`✓ ${who}님, 로그인되었습니다`);
  };

  const loadAuthState = () => {
    const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/login/';
    if (isLoginPage && window.__kmoduLoginAuthMeRequest) {
      return window.__kmoduLoginAuthMeRequest;
    }

    const request = fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    if (isLoginPage) window.__kmoduLoginAuthMeRequest = request;
    return request;
  };

  const sync = async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.href && cached.label) applyTarget(cached);
    } catch (error) { /* 캐시 불량 시 기본 표시 유지 */ }

    try {
      const data = await loadAuthState();
      if (!data) return;
      const target = computeTarget(data && data.user, data && data.designer);
      applyTarget(target);
      maybeWelcome(data && data.user, data && data.designer);
      try {
        if (target) sessionStorage.setItem(CACHE_KEY, JSON.stringify(target));
        else sessionStorage.removeItem(CACHE_KEY);
      } catch (error) { /* 저장 실패 무시 */ }
    } catch (error) { /* 상태를 모르면 현재 표시 유지 */ }
  };

  const startAuthNav = () => {
    ensureStudioQuickBanner();
    sync();
  };

  // Next.js 페이지에서는 React hydration이 끝난 뒤 DOM을 갱신해야 속성 불일치가 생기지 않는다.
  // 정적 HTML 페이지도 load 직후 실행해 동일한 동작 순서를 유지한다.
  if (document.readyState === 'complete') {
    setTimeout(startAuthNav, 0);
  } else {
    window.addEventListener('load', () => setTimeout(startAuthNav, 0), { once: true });
  }
})();
