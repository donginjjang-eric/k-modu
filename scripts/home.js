const nav = document.querySelector('.nav');
const syncNav = () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 12);
};
syncNav();
window.addEventListener('scroll', syncNav, { passive: true });

const menuToggle = document.querySelector('.menu-toggle');
const closeMobileMenu = () => {
  nav.classList.remove('menu-open');
  document.body.classList.remove('menu-locked');
  menuToggle?.setAttribute('aria-expanded', 'false');
};

menuToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('menu-open');
  document.body.classList.toggle('menu-locked', isOpen);
  menuToggle.setAttribute('aria-expanded', String(isOpen));
});

document.querySelectorAll('.mobile-menu a').forEach((link) => {
  link.addEventListener('click', closeMobileMenu);
});

const setFlowCopy = (mode) => {
  document.querySelectorAll('[data-copy-mode]').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.copyMode === mode);
  });
  document.querySelectorAll('[data-copy]').forEach((target) => {
    const value = target.dataset[mode];
    if (value) target.innerHTML = value;
  });
};

document.querySelectorAll('[data-copy-mode]').forEach((button) => {
  button.addEventListener('click', () => setFlowCopy(button.dataset.copyMode));
});

const modal = document.querySelector('#influencerModal');
const closeModal = () => {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

if (modal) {
  document.querySelectorAll('.campaign[data-name]').forEach((card) => {
    card.addEventListener('click', () => {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });
  });

  document.querySelector('.modal-close')?.addEventListener('click', closeModal);
  document.querySelector('.modal-request')?.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });
}
