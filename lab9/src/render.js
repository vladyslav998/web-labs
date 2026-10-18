import { notes, shows, watchlist } from './state.js';

const results = /** @type {HTMLUListElement} */ (document.querySelector('#results'));
const template = /** @type {HTMLTemplateElement} */ (document.querySelector('#show-card'));
const status = /** @type {HTMLElement} */ (document.querySelector('#status'));
const counter = /** @type {HTMLElement} */ (document.querySelector('#watchlist-count'));

/** Повертає читабельний текст замість null, undefined, порожніх масивів тощо. */
function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

/**
 * Створює картки тільки з HTML-шаблону. Дані записуються в текстові вузли й атрибути,
 * тому назва або нотатка з HTML-подібним текстом не перетворюється на розмітку.
 *
 * @param {readonly import('./state.js').Show[]} list серіали для показу
 */
export function renderShows(list) {
  const fragment = document.createDocumentFragment();

  for (const show of list) {
    const card = /** @type {HTMLLIElement} */ (template.content.firstElementChild.cloneNode(true));
    card.dataset.id = String(show.id);

    for (const nameSlot of card.querySelectorAll('[data-field="name"]')) {
      nameSlot.textContent = show.name;
    }

    card.querySelector('[data-field="year"]').textContent = displayValue(show.year);
    card.querySelector('[data-field="genres"]').textContent = displayValue(show.genres);
    card.querySelector('[data-field="rating"]').textContent = displayValue(show.rating);

    const toggleButton = /** @type {HTMLButtonElement} */ (card.querySelector('[data-action="toggle"]'));
    toggleButton.setAttribute('aria-pressed', String(watchlist.has(show.id)));

    const myRatingRow = /** @type {HTMLElement} */ (card.querySelector('.card__mine'));
    const myRating = card.querySelector('[data-field="my-rating"]');
    const noteRow = /** @type {HTMLElement} */ (card.querySelector('[data-field="note"]'));
    const savedNote = notes.get(show.id);

    myRatingRow.hidden = !savedNote;
    myRating.textContent = savedNote ? String(savedNote.rating) : '';
    noteRow.hidden = !savedNote || savedNote.text.length === 0;
    noteRow.textContent = savedNote?.text ?? '';

    fragment.append(card);
  }

  results.replaceChildren(fragment);
  counter.textContent = String(watchlist.size);
  status.textContent = list.length ? `Знайдено: ${list.length} з ${shows.length}` : 'Нічого не знайдено';
}
