/**
 * Повертає поточні значення форми фільтрів #filters.
 * @returns {import('./state.js').Filters}
 */
export function readFilters() {
  const form = /** @type {HTMLFormElement} */ (document.querySelector('#filters'));
  return {
    query: /** @type {HTMLInputElement} */ (form.elements.namedItem('query')).value,
    genre: /** @type {HTMLSelectElement} */ (form.elements.namedItem('genre')).value,
    mine: /** @type {HTMLInputElement} */ (form.elements.namedItem('mine')).checked,
  };
}

/**
 * Підключає реакції на зміну фільтрів. Надсилання й reset керуються тут, без перезавантаження.
 * @param {() => void} refresh перемальовує список для поточних фільтрів
 */
export function initFilters(refresh) {
  const form = /** @type {HTMLFormElement} */ (document.querySelector('#filters'));
  const query = /** @type {HTMLInputElement} */ (form.elements.namedItem('query'));
  const genre = /** @type {HTMLSelectElement} */ (form.elements.namedItem('genre'));
  const mine = /** @type {HTMLInputElement} */ (form.elements.namedItem('mine'));

  query.addEventListener('input', refresh);
  genre.addEventListener('change', refresh);
  mine.addEventListener('change', refresh);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  form.addEventListener('reset', (event) => {
    // Подія reset відбувається до нативного очищення полів. Скасовуємо його й очищаємо
    // значення самі, щоб refresh одразу побачив вже скинуті значення.
    event.preventDefault();
    query.value = '';
    genre.value = '';
    mine.checked = false;
    refresh();
  });
}
