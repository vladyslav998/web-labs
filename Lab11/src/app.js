/**
 * Поведінка ShowFinder: пошук (C1), сторінка серіалу (C2), помилки й повторні спроби (C3).
 * Дані сторінки показуються тільки через renderResults і renderShow з наданого view.js.
 */
import { getShow, searchShows } from './api.js';
import { renderResults, renderShow } from './view.js';

const LOADING_TEXT = 'Завантаження…';
const SERVER_ERROR = 'Не вдалося отримати дані від TVmaze.';
const NETWORK_ERROR = 'Немає з’єднання з TVmaze.';
const NOT_FOUND = 'Серіал не знайдено';
const RATE_LIMIT_ERROR = 'Забагато запитів до TVmaze.';
const RATE_LIMIT_WAIT = 'Забагато запитів до TVmaze, повторюю…';
const DEBOUNCE_MS = 250;
const RATE_LIMIT_RETRY_MS = 2500;

const isAbortError = (error) => error?.name === 'AbortError';
const isRateLimit = (error) => error?.status === 429;

/** Скасування паузи при повторі 429, якщо користувач уже змінив запит/серіал. */
function waitForRetry(signal, milliseconds) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Запит скасовано.', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, milliseconds);

    function onAbort() {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(new DOMException('Запит скасовано.', 'AbortError'));
    }

    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/** Автоматична повторна спроба виконується тільки для 429 і лише один раз. */
async function withRateLimitRetry(request, { signal, onWait }) {
  try {
    return await request();
  } catch (error) {
    if (isAbortError(error) || signal.aborted || !isRateLimit(error)) throw error;
    onWait();
    await waitForRetry(signal, RATE_LIMIT_RETRY_MS);
  }

  // Другий виклик навмисно без циклу: друга відмова 429 показується користувачу.
  return request();
}

/** Клонує один із заздалегідь наданих шаблонів стану. */
function templateContent(template) {
  return template.content.cloneNode(true);
}

function setNotBusy(region) {
  region.removeAttribute('aria-busy');
}

function showLoading(region, loadingTemplate) {
  region.setAttribute('aria-busy', 'true');
  region.replaceChildren(templateContent(loadingTemplate));
}

function showMessage(region, message, messageTemplate) {
  const content = templateContent(messageTemplate);
  const paragraph = content.querySelector('.state__text, .state--message');
  if (paragraph) paragraph.textContent = message;
  setNotBusy(region);
  region.replaceChildren(content);
}

function showError(region, message, retry, errorTemplate) {
  const content = templateContent(errorTemplate);
  const text = content.querySelector('.state__text');
  const button = content.querySelector('[data-action="retry"]');
  if (text) text.textContent = message;
  if (button) button.addEventListener('click', retry, { once: true });
  setNotBusy(region);
  region.replaceChildren(content);
}

function userMessage(error, forShow = false) {
  if (forShow && error?.status === 404) return NOT_FOUND;
  if (isRateLimit(error)) return RATE_LIMIT_ERROR;
  if (error?.kind === 'network' || error instanceof TypeError) return NETWORK_ERROR;
  return SERVER_ERROR;
}

/** Підключає пошук та область сторінки серіалу. */
export function initApp() {
  const form = document.querySelector('#search');
  const input = document.querySelector('#search-query');
  const status = document.querySelector('#status');
  const results = document.querySelector('#results');
  const details = document.querySelector('#details');
  const loadingTemplate = document.querySelector('#state-loading');
  const messageTemplate = document.querySelector('#state-message');
  const errorTemplate = document.querySelector('#state-error');

  if (!form || !input || !status || !results || !details || !loadingTemplate || !messageTemplate || !errorTemplate) {
    throw new Error('ShowFinder: у HTML відсутній обов’язковий елемент інтерфейсу.');
  }

  let searchTimer = null;
  let searchVersion = 0;
  let activeSearch = null;
  let lastSuccessfulSearch = null;

  let detailsVersion = 0;
  let activeDetails = null;
  let selectedShowId = null;
  const showCache = new Map();

  function setStatus(message) {
    status.textContent = message;
  }

  function clearSearchTimer() {
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = null;
  }

  function cancelActiveSearch() {
    if (activeSearch) activeSearch.controller.abort();
    activeSearch = null;
  }

  /** Інвалідує будь-яку відповідь старішого пошуку. */
  function invalidateSearch() {
    clearSearchTimer();
    searchVersion += 1;
    cancelActiveSearch();
    return searchVersion;
  }

  function clearSearchResults() {
    setNotBusy(results);
    results.replaceChildren();
    setStatus('');
  }

  /** Виконує пошук із зафіксованою версією запиту. */
  async function launchSearch(query, version) {
    if (version !== searchVersion || query.length < 2) return;

    if (activeSearch?.version === version && activeSearch.query === query) return;
    if (lastSuccessfulSearch?.version === version && lastSuccessfulSearch.query === query) return;

    const controller = new AbortController();
    activeSearch = { controller, query, version };
    showLoading(results, loadingTemplate);
    setStatus(LOADING_TEXT);

    try {
      const shows = await withRateLimitRetry(
        () => searchShows(query, { signal: controller.signal }),
        {
          signal: controller.signal,
          onWait: () => {
            if (version === searchVersion) setStatus(RATE_LIMIT_WAIT);
          },
        },
      );

      if (controller.signal.aborted || version !== searchVersion) return;
      if (shows.length === 0) {
        const message = `Нічого не знайдено за запитом «${query}»`;
        showMessage(results, message, messageTemplate);
        setStatus(message);
      } else {
        renderResults(results, shows);
        setNotBusy(results);
        setStatus(`Знайдено: ${shows.length}`);
      }
      lastSuccessfulSearch = { version, query };
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted || version !== searchVersion) return;
      console.error('[ShowFinder] Помилка пошуку TVmaze:', error);
      const message = userMessage(error);
      showError(results, message, () => retrySearch(query), errorTemplate);
      setStatus(message);
    } finally {
      if (activeSearch?.controller === controller) activeSearch = null;
    }
  }

  function retrySearch(query) {
    const version = invalidateSearch();
    lastSuccessfulSearch = null;
    launchSearch(query, version);
  }

  function scheduleSearch() {
    const query = input.value.trim();
    const version = invalidateSearch();

    if (query.length < 2) {
      lastSuccessfulSearch = null;
      clearSearchResults();
      return;
    }

    searchTimer = setTimeout(() => {
      searchTimer = null;
      launchSearch(query, version);
    }, DEBOUNCE_MS);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearSearchTimer();

    const query = input.value.trim();
    if (query.length < 2) {
      invalidateSearch();
      lastSuccessfulSearch = null;
      clearSearchResults();
      return;
    }

    // Якщо той самий пошук уже виконується або завершився, не створюємо дубль.
    if (activeSearch?.query === query && activeSearch.version === searchVersion) return;
    if (lastSuccessfulSearch?.query === query && lastSuccessfulSearch.version === searchVersion) return;

    launchSearch(query, searchVersion);
  });

  input.addEventListener('input', scheduleSearch);

  function cancelActiveDetails() {
    if (activeDetails) activeDetails.controller.abort();
    activeDetails = null;
  }

  async function launchShow(id, version) {
    if (version !== detailsVersion) return;

    const cached = showCache.get(id);
    if (cached) {
      renderShow(details, cached);
      setNotBusy(details);
      return;
    }

    const controller = new AbortController();
    activeDetails = { controller, id, version };
    showLoading(details, loadingTemplate);

    try {
      const data = await withRateLimitRetry(
        () => getShow(id, { signal: controller.signal }),
        {
          signal: controller.signal,
          onWait: () => {
            if (version === detailsVersion) setStatus(RATE_LIMIT_WAIT);
          },
        },
      );

      if (controller.signal.aborted || version !== detailsVersion || selectedShowId !== id) return;
      showCache.set(id, data);
      renderShow(details, data);
      setNotBusy(details);
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted || version !== detailsVersion || selectedShowId !== id) return;
      console.error('[ShowFinder] Помилка завантаження сторінки серіалу:', error);

      if (error?.status === 404) {
        showMessage(details, NOT_FOUND, messageTemplate);
        return;
      }

      const message = userMessage(error, true);
      showError(details, message, () => retryShow(id), errorTemplate);
      if (isRateLimit(error)) setStatus(RATE_LIMIT_ERROR);
    } finally {
      if (activeDetails?.controller === controller) activeDetails = null;
    }
  }

  function openShow(id) {
    detailsVersion += 1;
    const version = detailsVersion;
    selectedShowId = id;
    cancelActiveDetails();
    launchShow(id, version);
  }

  function retryShow(id) {
    openShow(id);
  }

  // Делегування дає змогу обробляти кнопки всіх карток, які renderResults створює динамічно.
  results.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest('button[data-action="open"]');
    if (!button || !results.contains(button)) return;

    const card = button.closest('li[data-id]');
    const id = Number(card?.dataset.id);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    openShow(id);
  });
}
