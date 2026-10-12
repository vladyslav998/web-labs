/**
 * @typedef {object} Counter
 * @property {() => number} increment збільшує значення на 1 і повертає нове
 * @property {() => number} reset повертає значення до початкового і повертає його
 * @property {() => number} value поточне значення
 */

/**
 * C5.1. Створює лічильник.
 * Специфікація — ТЗ, C5.
 *
 * @param {number} [start]
 * @returns {Counter}
 */
export function createCounter(start = 0) {
  const initialValue = start;
  let currentValue = initialValue;

  return {
    increment() {
      currentValue += 1;
      return currentValue;
    },
    reset() {
      currentValue = initialValue;
      return currentValue;
    },
    value() {
      return currentValue;
    },
  };
}

/**
 * C5.2. Обгортає `fn` так, що вона виконується щонайбільше один раз.
 * Специфікація — ТЗ, C5.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn
 * @returns {F}
 */
export function once(fn) {
  let called = false;
  /** @type {ReturnType<F>} */
  let firstResult;

  return /** @type {F} */ (
    function (...args) {
      if (!called) {
        // Позначаємо виклик до запуску fn, щоб навіть виняток не спричинив повторний запуск.
        called = true;
        firstResult = fn.apply(this, args);
      }
      return firstResult;
    }
  );
}

/**
 * C5.3. Запам'ятовує результати `fn` для кожного значення її єдиного аргументу.
 * Специфікація — ТЗ, C5.
 *
 * @template T, R
 * @param {(arg: T) => R} fn
 * @returns {(arg: T) => R}
 */
export function memoize(fn) {
  /** @type {Map<T, R>} */
  const cache = new Map();

  return function (arg) {
    if (cache.has(arg)) return cache.get(arg);

    const result = fn.call(this, arg);
    cache.set(arg, result);
    return result;
  };
}
