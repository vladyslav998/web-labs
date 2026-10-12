/** @typedef {import('./normalize.js').Show} Show */

/**
 * C3. Повертає новий масив серіалів, відсортований за полем `key`.
 * Специфікація — ТЗ, C3.
 *
 * @param {Show[]} shows
 * @param {'name' | 'year' | 'rating'} key
 * @param {'asc' | 'desc'} [direction]
 * @returns {Show[]}
 */
export function sortShows(shows, key, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1;

  return shows.toSorted((a, b) => {
    const left = a[key];
    const right = b[key];

    // Відсутні значення завжди в кінці, незалежно від напрямку сортування.
    if (key !== 'name') {
      const leftMissing = left === null || left === undefined;
      const rightMissing = right === null || right === undefined;

      if (leftMissing && rightMissing) return 0;
      if (leftMissing) return 1;
      if (rightMissing) return -1;
      return (left - right) * sign;
    }

    return left.localeCompare(right) * sign;
  });
}
