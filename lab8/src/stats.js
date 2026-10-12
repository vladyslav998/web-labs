/** @typedef {import('./normalize.js').Show} Show */

/**
 * @typedef {object} GenreStats
 * @property {number} count скільки серіалів мають цей жанр
 * @property {number | null} averageRating середня оцінка цих серіалів
 */

/**
 * C4. Рахує статистику для кожного жанру.
 * Специфікація — ТЗ, C4.
 *
 * @param {Show[]} shows
 * @returns {Record<string, GenreStats>} ключ — назва жанру
 */
export function genreStats(shows) {
  /** @type {Map<string, { count: number, ratingSum: number, ratedCount: number }>} */
  const totals = new Map();

  for (const show of shows) {
    // Один серіал має рахуватися не більше одного разу в межах одного жанру.
    for (const genre of new Set(show.genres)) {
      let total = totals.get(genre);
      if (!total) {
        total = { count: 0, ratingSum: 0, ratedCount: 0 };
        totals.set(genre, total);
      }

      total.count += 1;
      if (show.rating !== null && show.rating !== undefined) {
        total.ratingSum += show.rating;
        total.ratedCount += 1;
      }
    }
  }

  return Object.fromEntries(
    [...totals].map(([genre, { count, ratingSum, ratedCount }]) => {
      const averageRating =
        ratedCount === 0 ? null : Math.round((ratingSum / ratedCount + Number.EPSILON) * 10) / 10;
      return [genre, { count, averageRating }];
    }),
  );
}
