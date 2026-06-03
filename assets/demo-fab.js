/* K-MODU 시연용 플로팅 바로가기 (우측 하단). 자체 완결형: 스타일+마크업+동작 주입. */
(function () {
  if (window.__kmoduDemoFab) return;
  window.__kmoduDemoFab = true;

  var CSS = '' +
    '.demo-fab{position:fixed;right:22px;bottom:22px;z-index:2000;display:flex;flex-direction:column;align-items:flex-end;gap:11px;font-family:"Pretendard",system-ui,-apple-system,sans-serif;}' +
    '.demo-fab-cap{opacity:0;transform:translateY(8px);transition:.25s ease;font-size:10px;font-weight:800;letter-spacing:.14em;color:#0a0a0a;background:rgba(255,255,255,.92);padding:5px 11px;border-radius:999px;border:1px solid rgba(0,0,0,.08);box-shadow:0 6px 18px rgba(0,0,0,.1);pointer-events:none;}' +
    '.demo-fab-item{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:999px;padding:8px 18px 8px 8px;box-shadow:0 12px 30px rgba(0,0,0,.16);text-decoration:none;opacity:0;transform:translateY(12px) scale(.95);pointer-events:none;transition:.3s cubic-bezier(.2,.7,.3,1);}' +
    '.demo-fab-item .dfi-ic{width:36px;height:36px;border-radius:999px;background:#0a0a0a;color:#fff;display:grid;place-items:center;flex:0 0 36px;}' +
    '.demo-fab-item .dfi-ic svg{width:19px;height:19px;}' +
    '.demo-fab-item .dfi-label{font-size:14px;font-weight:700;color:#0a0a0a;white-space:nowrap;letter-spacing:-.01em;}' +
    '.demo-fab-item:hover{transform:translateY(0) scale(1);border-color:#0a0a0a;box-shadow:0 16px 36px rgba(0,0,0,.22);}' +
    '.demo-fab.open .demo-fab-cap{opacity:1;transform:none;}' +
    '.demo-fab.open .demo-fab-item{opacity:1;transform:none;pointer-events:auto;}' +
    '.demo-fab-toggle{width:58px;height:58px;border-radius:999px;background:#0a0a0a;color:#fff;border:1px solid rgba(255,255,255,.14);box-shadow:0 14px 32px rgba(0,0,0,.34);cursor:pointer;display:grid;place-items:center;transition:transform .35s ease;}' +
    '.demo-fab-toggle svg{width:24px;height:24px;}' +
    '.demo-fab.open .demo-fab-toggle{transform:rotate(135deg);}' +
    '@media(max-width:760px){.demo-fab{right:14px;bottom:14px;}.demo-fab-toggle{width:52px;height:52px;}}';

  var ICON_DESIGNER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 9h18M9 21V9"/></svg>';
  var ICON_ADMIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6l7-3z"/></svg>';
  var ICON_TOGGLE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2l1.9 6.6 6.6 1.9-6.6 1.9L12 19.2l-1.9-6.6L3.5 10.7l6.6-1.9z"/></svg>';

  function build() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var fab = document.createElement('div');
    fab.className = 'demo-fab';
    fab.setAttribute('aria-label', '시연용 바로가기');
    fab.innerHTML =
      '<span class="demo-fab-cap">DEMO 바로가기</span>' +
      '<a class="demo-fab-item" href="/designer-studio.html"><span class="dfi-ic">' + ICON_DESIGNER + '</span><span class="dfi-label">디자이너 스튜디오</span></a>' +
      '<a class="demo-fab-item" href="/dashboard/admin"><span class="dfi-ic">' + ICON_ADMIN + '</span><span class="dfi-label">관리자 페이지</span></a>' +
      '<button class="demo-fab-toggle" type="button" aria-label="시연 메뉴" aria-expanded="false">' + ICON_TOGGLE + '</button>';
    document.body.appendChild(fab);

    var toggle = fab.querySelector('.demo-fab-toggle');
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = fab.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function () { fab.classList.remove('open'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
