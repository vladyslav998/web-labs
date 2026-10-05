const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#site-menu');
const menuLinks = menu?.querySelectorAll('a') ?? [];
const desktopMedia = window.matchMedia('(min-width: 64rem)');

const setMenuState = (isOpen) => {
  if (!menuButton || !menu) return;

  menu.classList.toggle('is-open', isOpen);
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Закрити меню' : 'Відкрити меню');
};

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  setMenuState(!isOpen);
});

menuLinks.forEach((link) => {
  link.addEventListener('click', () => setMenuState(false));
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenuState(false);
});

desktopMedia.addEventListener('change', (event) => {
  if (event.matches) setMenuState(false);
});
