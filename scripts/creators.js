const modalBackdrop = document.getElementById('modalBackdrop');
const modals = document.querySelectorAll('.creator-modal');
const closeButtons = document.querySelectorAll('.modal-close');
const creatorList = document.getElementById('creatorList');
const viewModeButtons = document.querySelectorAll('[data-view-mode]');

viewModeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    viewModeButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    creatorList.classList.toggle('list-view', button.dataset.viewMode === 'list');
  });
});

// Keep profile links as modal triggers.
document.querySelectorAll('.creator-card .pill.light').forEach((btn, index) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('creatorModal1');
  });
  btn.textContent = '프로필 보기';
});

document.querySelectorAll('.creator-card').forEach((card, index) => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.creator-actions')) return;
    openModal('creatorModal1');
  });
});

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  modals.forEach(modal => modal.classList.remove('active'));
  modalBackdrop.classList.remove('active');
  document.body.style.overflow = '';
}

closeButtons.forEach(btn => {
  btn.addEventListener('click', closeModal);
});

modals.forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
});

modalBackdrop.addEventListener('click', closeModal);
