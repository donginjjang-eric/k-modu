// 공통 헤더 인증 메뉴: 로그인 상태에 따라 [data-auth-link]를 로그인/디자이너 스튜디오/승인 대기중으로 바꾸고 로그아웃 버튼을 붙인다.
(() => {
  const syncHeaderAuth = async () => {
    const links = document.querySelectorAll('[data-auth-link]');
    if (!links.length) return;

    let user = null;
    let designer = null;
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      user = data && data.user;
      designer = data && data.designer;
    } catch (error) {
      return; // 로그인 상태를 모르면 기본(로그인 버튼) 유지
    }
    if (!user) return;

    const isApprovedDesigner = user.role === 'designer' && designer && designer.approvalStatus === 'approved';
    const target = user.role === 'admin'
      ? { href: '/dashboard/admin', label: '관리자 콘솔' }
      : isApprovedDesigner
        ? { href: '/dashboard/designer/brand', label: '디자이너 스튜디오' }
        : { href: '/login?notice=approval_pending', label: '승인 대기중' };

    links.forEach((link) => {
      link.href = target.href;
      link.textContent = target.label;
      link.setAttribute('aria-label', target.label);

      // 같은 스타일을 물려받도록 기존 링크를 복제해 로그아웃 버튼을 만든다.
      const logout = link.cloneNode(false);
      logout.removeAttribute('data-auth-link');
      logout.classList.add('logout-link');
      logout.href = '#';
      logout.textContent = '로그아웃';
      logout.setAttribute('aria-label', '로그아웃');
      logout.addEventListener('click', async (event) => {
        event.preventDefault();
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch (error) { /* 무시하고 이동 */ }
        window.location.href = '/';
      });
      link.after(logout);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncHeaderAuth);
  } else {
    syncHeaderAuth();
  }
})();
