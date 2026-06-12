// 공통 헤더 인증 메뉴: 로그인 상태에 따라 [data-auth-link]를 로그인/디자이너 신청/승인 대기중/디자이너 스튜디오/관리자 콘솔로 바꾸고 로그아웃 버튼을 붙인다.
// 새로고침 깜빡임 방지를 위해 마지막 상태를 sessionStorage에 캐시했다가 즉시 적용하고, 서버 응답으로 보정한다.
(() => {
  const CACHE_KEY = 'kmodu-auth-nav-state';

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

  const sync = async () => {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (cached && cached.href && cached.label) applyTarget(cached);
    } catch (error) { /* 캐시 불량 시 기본 표시 유지 */ }

    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const target = computeTarget(data && data.user, data && data.designer);
      applyTarget(target);
      maybeWelcome(data && data.user, data && data.designer);
      try {
        if (target) sessionStorage.setItem(CACHE_KEY, JSON.stringify(target));
        else sessionStorage.removeItem(CACHE_KEY);
      } catch (error) { /* 저장 실패 무시 */ }
    } catch (error) { /* 상태를 모르면 현재 표시 유지 */ }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', sync);
  } else {
    sync();
  }
})();
