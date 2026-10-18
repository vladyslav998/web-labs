import { toggle, watchlist } from './state.js';
import { openDetails } from './details.js';

/**
 * Підключає один делегований click-обробник до #results. Фокус відновлюється одразу після
 * перемальовування, у тому самому обробнику події.
 *
 * @param {() => void} refresh перемальовує список для поточних фільтрів
 */
export function initList(refresh) {
  const results = /** @type {HTMLUListElement} */ (document.querySelector('#results'));
  const mineFilter = /** @type {HTMLInputElement} */ (document.querySelector('#filters [name="mine"]'));
  const heading = /** @type {HTMLElement} */ (document.querySelector('#results-heading'));

  results.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest('button[data-action]');
    if (!(button instanceof HTMLButtonElement) || !results.contains(button)) return;

    const card = button.closest('li[data-id]');
    if (!card) return;

    const id = Number(card.dataset.id);
    if (!Number.isInteger(id)) return;

    if (button.dataset.action === 'details') {
      openDetails(id);
      return;
    }

    if (button.dataset.action !== 'toggle') return;

    const visibleIdsBefore = [...results.querySelectorAll('li[data-id]')].map((item) => Number(item.dataset.id));
    const previousIndex = visibleIdsBefore.indexOf(id);
    const wasInList = watchlist.has(id);

    toggle(id);
    refresh();

    // Якщо в режимі «Лише мій список» елемент прибрали, сфокусувати наступну картку,
    // інакше попередню; коли список порожній — заголовок результатів.
    if (wasInList && mineFilter.checked) {
      const nextId = visibleIdsBefore[previousIndex + 1];
      const previousId = visibleIdsBefore[previousIndex - 1];
      const fallbackId = nextId ?? previousId;
      const fallbackButton = fallbackId === undefined
        ? null
        : results.querySelector(`li[data-id="${fallbackId}"] button[data-action="toggle"]`);

      if (fallbackButton instanceof HTMLButtonElement) fallbackButton.focus();
      else heading.focus();
      return;
    }

    const currentButton = results.querySelector(`li[data-id="${id}"] button[data-action="toggle"]`);
    if (currentButton instanceof HTMLButtonElement) currentButton.focus();
  });
}
