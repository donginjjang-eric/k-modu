// 공통 헤더 인증 메뉴: 로그인 상태에 따라 [data-auth-link]를 로그인/디자이너 신청/승인 대기중/디자이너 스튜디오/관리자 콘솔로 바꾸고 로그아웃 버튼을 붙인다.
// 새로고침 깜빡임 방지를 위해 마지막 상태를 sessionStorage에 캐시했다가 즉시 적용하고, 서버 응답으로 보정한다.
(() => {
  const CACHE_KEY = 'kmodu-auth-nav-state';
  const STUDIO_PATH = '/dashboard/designer';
  const KAKAO_CHANNEL_URL = '#contact';

  const ensureStudioQuickBanner = () => {
    if (window.location.pathname.startsWith(STUDIO_PATH)) {
      document.querySelector('.studio-quick-banner')?.remove();
      document.querySelector('.kakao-quick-banner')?.remove();
      return;
    }

    if (!document.getElementById('studio-quick-banner-style')) {
      const style = document.createElement('style');
      style.id = 'studio-quick-banner-style';
      style.textContent = `
        .studio-quick-banner {
          position: fixed;
          z-index: 9998;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
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
        .kakao-quick-banner {
          top: calc(50% + 132px);
          border-color: rgba(57, 40, 0, .14);
          background: #fee500;
          color: #191600;
          box-shadow: 0 18px 44px rgba(57, 40, 0, .18);
        }
        .studio-quick-banner:hover {
          transform: translateY(-50%) translateX(-2px);
          background: #050505;
          box-shadow: 0 22px 54px rgba(17, 24, 39, .3);
        }
        .kakao-quick-banner:hover {
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
        @media (max-width: 760px) {
          .studio-quick-banner {
            right: 12px;
            top: auto;
            bottom: 88px;
            width: auto;
            min-height: 54px;
            padding: 10px 12px;
            border-radius: 999px;
            flex-direction: row;
            gap: 9px;
            transform: none;
          }
          .kakao-quick-banner {
            bottom: 24px;
          }
          .studio-quick-banner:hover {
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

    if (document.querySelector('.studio-quick-banner')) return;

    const banner = document.createElement('a');
    banner.className = 'studio-quick-banner';
    banner.href = STUDIO_PATH;
    banner.setAttribute('aria-label', '디자이너 스튜디오 바로가기');
    banner.innerHTML = '<span class="studio-quick-banner-mark">K</span><strong>디자이너<br>스튜디오</strong><span>Studio</span>';
    document.body.appendChild(banner);

    const kakaoBanner = document.createElement('a');
    kakaoBanner.className = 'studio-quick-banner kakao-quick-banner';
    kakaoBanner.href = KAKAO_CHANNEL_URL;
    kakaoBanner.setAttribute('aria-label', '카카오 문의하기');
    kakaoBanner.innerHTML = '<span class="studio-quick-banner-mark">K</span><strong>카카오<br>문의</strong><span>Talk</span>';
    if (/^https?:\/\//.test(KAKAO_CHANNEL_URL)) {
      kakaoBanner.target = '_blank';
      kakaoBanner.rel = 'noopener';
    }
    document.body.appendChild(kakaoBanner);
  };

  const computeTarget = (user, designer) => {
    if (!user) return null;
    if (user.role === 'admin') return { href: '/dashboard/admin', label: '관리자 콘솔' };
    const approved = user.role === 'designer' && designer && designer.approvalStatus === 'approved';
    if (approved) return { href: '/dashboard/designer/brand', label: '디자이너 스튜디오' };
    if (designer) return { href: '/login?notice=approval_pending', label: '승인 대기중' };
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
        if (existingLogout) existingLogout.remove();
        return;
      }

      link.href = target.href;
      link.textContent = target.label;
      link.setAttribute('aria-label', target.label);

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
