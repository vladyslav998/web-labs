/**
 * Запити до TVmaze API: https://www.tvmaze.com/api.
 * Використовуємо лише Fetch API, без власних заголовків і без CORS-проксі.
 */
export const API = 'https://api.tvmaze.com';

/** Структурована помилка запиту, яку app.js перетворює на зрозумілий стан інтерфейсу. */
class TVmazeError extends Error {
  /**
   * @param {'http' | 'network' | 'invalid-json' | 'invalid-data'} kind
   * @param {string} message
   * @param {number} [status]
   */
  constructor(kind, message, status) {
    super(message);
    this.name = 'TVmazeError';
    this.kind = kind;
    this.status = status;
  }
}

/** Перевіряє скасування, щоб AbortError не став звичайною мережевою помилкою. */
function isAbortError(error) {
  return error?.name === 'AbortError';
}

/**
 * Виконує GET і перевіряє статус та JSON. Fetch не відхиляє Promise на HTTP 4xx/5xx,
 * тому response.ok треба перевіряти явно.
 *
 * @param {string} url
 * @param {{ signal?: AbortSignal }} [options]
 */
async function getJSON(url, { signal } = {}) {
  let response;
  try {
    // Не додаємо заголовки: запит залишається простим CORS GET без preflight.
    response = await fetch(url, { signal });
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw error;
    throw new TVmazeError('network', 'Не вдалося виконати мережевий запит.');
  }

  if (!response.ok) {
    throw new TVmazeError('http', `TVmaze відповів зі статусом ${response.status}.`, response.status);
  }

  try {
    return await response.json();
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw error;
    throw new TVmazeError('invalid-json', 'TVmaze повернув відповідь, яку неможливо прочитати як JSON.');
  }
}

/**
 * C1. Шукає серіали за назвою. Повертає масив об'єктів show у порядку відповіді API.
 *
 * @param {string} query
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<object[]>}
 */
export async function searchShows(query, { signal } = {}) {
  const normalizedQuery = String(query ?? '').trim();
  if (normalizedQuery.length < 2) return [];

  const params = new URLSearchParams({ q: normalizedQuery });
  const data = await getJSON(`${API}/search/shows?${params}`, { signal });

  if (!Array.isArray(data) || data.some((item) => !item?.show || typeof item.show.id !== 'number')) {
    throw new TVmazeError('invalid-data', 'TVmaze повернув дані неочікуваного формату.');
  }

  return data.map(({ show }) => show);
}

/**
 * C2. Завантажує серіал, епізоди й акторів одним запитом через embed.
 * Результат придатний для renderShow з view.js.
 *
 * @param {number} id
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ show: object, episodes: object[], cast: object[] }>}
 */
export async function getShow(id, { signal } = {}) {
  const params = new URLSearchParams();
  params.append('embed[]', 'episodes');
  params.append('embed[]', 'cast');

  const data = await getJSON(`${API}/shows/${encodeURIComponent(id)}?${params}`, { signal });
  if (!data || typeof data !== 'object' || typeof data.id !== 'number' || typeof data.name !== 'string') {
    throw new TVmazeError('invalid-data', 'TVmaze повернув дані серіалу неочікуваного формату.');
  }

  const embedded = data._embedded;
  if (!embedded || !Array.isArray(embedded.episodes) || !Array.isArray(embedded.cast)) {
    throw new TVmazeError('invalid-data', 'TVmaze не повернув епізоди й акторський склад серіалу.');
  }

  const { _embedded: _ignored, ...show } = data;
  return { show, episodes: embedded.episodes, cast: embedded.cast };
}
