/** @typedef {import('./normalize.js').Show} Show */

/**
 * @typedef {object} FilterOptions
 * @property {string | null} [query] частина назви
 * @property {string | null} [genre] жанр
 * @property {number | null} [minRating] мінімальна оцінка
 */

/**
 * C2. Повертає серіали, які відповідають усім заданим фільтрам.
 * Специфікація — ТЗ, C2.
 *
 * @param {Show[]} shows
 * @param {FilterOptions} [options]
 * @returns {Show[]}
 */
export function filterShows(shows, options = {}) {
  const query = typeof options.query === 'string' ? options.query.trim().toLowerCase() : '';
  const genre = typeof options.genre === 'string' ? options.genre.trim() : '';
  const minRating = options.minRating;

  return shows.filter((show) => {
    if (query && !show.name.toLowerCase().includes(query)) return false;
    if (genre && !show.genres.includes(genre)) return false;

    // Нульовий поріг означає відсутність фільтра; null-оцінки не відкидаємо.
    if (typeof minRating === 'number' && minRating > 0) {
      if (show.rating === null || show.rating < minRating) return false;
    }

    return true;
  });
}
