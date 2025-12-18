import axios from "axios";

/**
 * returns a value if it exists, otherwise returns a fallback.
 * a utility function that provides a default value when the input is null or undefined.
 *
 * @template T - type of value being checked
 * @param v - value to check (may be undefined or null)
 * @param fallback - fallback value to return if v is nullish
 *
 * @returns original value if it exists, otherwise fallback value
 */
function d<T>(v: T | undefined, fallback = "-1") {
  return v ?? fallback;
}

/**
 * fetches content from a url using a CORS proxy.
 *
 * @param url - the url to fetch content from
 * @returns promise resolving to the response data
 */
async function fetch(url: string): Promise<any> {
  const res = await axios.get(`https://proxy.life23243.workers.dev/?${encodeURIComponent(url)}`);
  return res.data;
}

/**
 * waits for a DOM element matching the given selector to appear in the document.
 * uses MutationObserver to watch for DOM changes.
 *
 * @param selector - css selector string to match the desired element
 *
 * @returns promise that resolves with the matching element once it appears
 */
function waitForElement(selector: string): Promise<Element> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      return resolve(element);
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

/**
 * sets the color appearance of an element based on a score value.
 * returns the color string if no element is provided.
 *
 * score ranges:
 *
 * - score >= 69.5: green
 * - score >= 49.5: yellow
 * - score <= 49.5: red
 * - -1 or invalid: default
 *
 * @param score - numeric score to determine color
 * @param element - optional HTML element to apply the color to
 *
 * @returns the color string if no element provided, the modified element if so
 */
function setAppearance(score: number | string, element?: HTMLElement): string | HTMLElement {
  const value = Number(score);
  let color = "var(--text-subdued)";

  if (value === -1 || !Number.isFinite(value)) {
    if (element) {
      element.style.color = color;
      return element;
    }
    return color;
  }

  if (value >= 69.5) color = "#85ce73";
  else if (value >= 49.5) color = "#f0e68c";
  else color = "#d76666";

  if (element) {
    element.style.color = color;
    return element;
  }

  return color;
}

/**
 * calculates the levenshtein edit distance between two strings.
 * uses an optimized single-array implementation for better memory efficiency.
 *
 * - time complexity: O(m * n) where m and n are the string lengths
 * - space complexity: O(min(m, n))
 *
 * @param str1 -  first string to compare
 * @param str2 -  second string to compare
 *
 * @returns the minimum number of single-character edits (insertions, deletions, substitutions)
 *          needed to transform str1 into str2
 */
function editDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  // early return for edge cases
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  if (s1 === s2) return 0;

  // use single array for space optimization O(min(m,n))
  let prev: number[] = Array.from({ length: len2 + 1 }, (_, i) => i);

  // calculate edit distance
  for (let i = 1; i <= len1; i++) {
    const curr: number[] = Array.from({ length: len2 + 1 });
    curr[0] = i;

    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;

      curr[j] = Math.min(
        curr[j - 1] + 1, // insertion
        prev[j] + 1, // deletion
        prev[j - 1] + cost, // substitution
      );
    }

    prev = curr;
  }

  return prev[len2];
}

/**
 * calculates the similarity between two strings as a value between 0 and 1.
 *
 * the similarity is computed based on the levenshtein edit distance, normalized
 * by the length of the longer string.
 *
 * - formula: similarity = (max_length - edit_distance) / max_length
 *
 * @param str1 - first string to compare
 * @param str2 - second string to compare
 *
 * @returns a number between 0 and 1:
 *          - 1.0: strings are identical (case-insensitive)
 *          - 0.0: strings have no similarity
 */
function similarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLength = Math.max(len1, len2);

  // handle empty strings
  if (maxLength === 0) return 1.0;

  // early return for identical strings (case-insensitive)
  if (str1.toLowerCase() === str2.toLowerCase()) return 1.0;

  const distance = editDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

/**
 * checks if a value represents a numeric string (including negative integers).
 *
 * @param value - the value to test
 *
 * @returns true if the value is a string representing an integer, false otherwise
 */
function isNumeric(value: unknown): boolean {
  return typeof value === "string" && /^-?\d+$/.test(value);
}

/**
 * pauses execution for a specified number of milliseconds.
 *
 * @param ms - number of milliseconds to sleep
 *
 * @returns promise that resolves after the specified delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * counts the number of occurrences of a substring within a string.
 *
 * @param string - string to search within
 * @param word - substring to count
 *
 * @returns the number of times substring appears in string
 */
function countInstances(string: string, word: string): number {
  if (word.length === 0) return 0;
  return string.split(word).length - 1;
}

/**
 * retrieves and parses data from localStorage by key.
 * automatically parses JSON strings, returns plain strings as-is.
 *
 * @param key - localStorage key to retrieve
 * @param fallback - optional fallback value if key doesn't exist or parsing fails
 *
 * @returns parsed data, raw string, or fallback value
 */
function getLocalStorageDataFromKey(key: string, fallback?: any): any {
  const data = localStorage.getItem(key);

  if (data === null) {
    return fallback;
  }

  try {
    // attempt to parse as JSON
    return JSON.parse(data);
  } catch {
    // return raw string if not valid JSON
    return data;
  }
}

export {
  d,
  fetch,
  waitForElement,
  setAppearance,
  editDistance,
  similarity,
  isNumeric,
  sleep,
  countInstances,
  getLocalStorageDataFromKey,
};
