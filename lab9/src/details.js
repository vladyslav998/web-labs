import { getShow, notes, saveNote } from './state.js';

let activeShowId = null;

const dialog = /** @type {HTMLDialogElement} */ (document.querySelector('#details'));
const title = /** @type {HTMLElement} */ (document.querySelector('#details-title'));
const summary = /** @type {HTMLElement} */ (document.querySelector('#details-summary'));
const link = /** @type {HTMLAnchorElement} */ (document.querySelector('#details-link'));
const form = /** @type {HTMLFormElement} */ (document.querySelector('#note-form'));
const ratingInput = /** @type {HTMLInputElement} */ (form.elements.namedItem('rating'));
const noteInput = /** @type {HTMLTextAreaElement} */ (form.elements.namedItem('note'));
const ratingError = /** @type {HTMLElement} */ (document.querySelector('#note-rating-error'));
const cancelButton = /** @type {HTMLButtonElement} */ (form.querySelector('button[type="button"]'));

/** Чи є оцінка цілим числом у дозволеному діапазоні. */
function validRating() {
  const value = ratingInput.valueAsNumber;
  return ratingInput.value !== '' && Number.isFinite(value) && Number.isInteger(value) && value >= 1 && value <= 10;
}

/** Очищає повідомлення про помилку та відповідні ARIA-атрибути. */
function clearRatingError() {
  ratingError.textContent = '';
  ratingInput.removeAttribute('aria-invalid');
  ratingInput.removeAttribute('aria-describedby');
}

/** Показує HTML-опис як текстові абзаци, не вставляючи його розмітку в DOM сторінки. */
function renderSummaryAsText(markup) {
  const parsed = new DOMParser().parseFromString(markup ?? '', 'text/html');
  const fragment = document.createDocumentFragment();

  for (const node of parsed.body.childNodes) {
    const text = node.textContent ?? '';
    if (!text.trim()) continue;

    const paragraph = document.createElement('p');
    paragraph.textContent = text.trim();
    fragment.append(paragraph);
  }

  summary.replaceChildren(fragment);
}

/**
 * Заповнює та відкриває модальний діалог конкретного серіалу.
 * @param {number} id
 */
export function openDetails(id) {
  const show = getShow(id);
  activeShowId = id;
  const openerButton = document.querySelector(`#results li[data-id="${id}"] button[data-action="details"]`);

  title.textContent = show.name;
  renderSummaryAsText(show.summary);
  link.href = show.url;

  const savedNote = notes.get(id);
  ratingInput.value = savedNote ? String(savedNote.rating) : '';
  noteInput.value = savedNote?.text ?? '';
  clearRatingError();

  // showModal() запам'ятовує поточний фокус для відновлення під час закриття.
  // Це також працює для кліку мишею, коли браузер не сфокусував кнопку самостійно.
  if (openerButton instanceof HTMLButtonElement) openerButton.focus();
  if (!dialog.open) dialog.showModal();
  title.focus();
}

/**
 * Підключає закриття діалогу та валідацію/збереження нотатки.
 * @param {() => void} refresh перемальовує список для поточних фільтрів
 */
export function initDetails(refresh) {
  // Власна перевірка має показувати доступне повідомлення поруч із полем, а не
  // блокувати submit стандартним повідомленням браузера.
  form.noValidate = true;

  cancelButton.addEventListener('click', () => {
    dialog.close();
  });

  // Явно замикаємо Tab-послідовність у межах модального вікна. Це не дає фокусу
  // опинитися на body після останнього контролу в тих браузерних сценаріях, де
  // вбудований цикл dialog залишає проміжний фокус поза вікном.
  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;

    const focusable = [...dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((element) => !element.hidden && element.getClientRects().length > 0);
    if (!focusable.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === dialog || active === title)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });

  ratingInput.addEventListener('input', () => {
    if (validRating()) clearRatingError();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (activeShowId === null) return;

    if (!validRating()) {
      ratingError.textContent = 'Введіть ціле число від 1 до 10.';
      ratingInput.setAttribute('aria-invalid', 'true');
      ratingInput.setAttribute('aria-describedby', ratingError.id);
      ratingInput.focus();
      return;
    }

    const show = getShow(activeShowId);
    saveNote(activeShowId, {
      rating: ratingInput.valueAsNumber,
      text: noteInput.value,
    });

    dialog.close();
    refresh();

    const status = /** @type {HTMLElement} */ (document.querySelector('#status'));
    status.textContent = `Нотатку до ${show.name} збережено`;

    // refresh() створив нову картку, тому фокусуємо нову кнопку, а не видалений вузол.
    const detailsButton = document.querySelector(
      `#results li[data-id="${activeShowId}"] button[data-action="details"]`,
    );
    if (detailsButton instanceof HTMLButtonElement) detailsButton.focus();

    activeShowId = null;
  });
}
