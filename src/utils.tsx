import axios from "axios";

async function fetch(url: string) {
  // Fetching the URL with a proxy to avoid CORS issues.
  let response = await axios.get(`https://proxy.life23243.workers.dev/?${encodeURIComponent(url)}`);
  return response.data;
}

function waitForElement(selector: any) {
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

// helper function to set the appearance of the album/tracks score element
// Depending on the score of a song the color will change.
// If the score is above 69.5 it is green.
// If the score is above 49.5 but below 69.5 it is yellow.
// If the score is below 49.5 it is red.
function setAppearance(score: number, element: any) {
  if (!Number(score)) {
    element.style.color = "var(--text-subdued)";
    return;
  }
  switch (true) {
    default:
      element.style.color = "var(--text-subdued)";
      break;

    case score >= 69.5:
      element.style.color = "#85ce73";
      break;

    case score >= 49.5 && score < 69.5:
      element.style.color = "#f0e68c";
      break;

    case score < 49.5:
      element.style.color = "#d76666";
      break;
  }
}

function editDistance(s1: any, s2: any) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  var costs = new Array();
  for (var i = 0; i <= s1.length; i++) {
    var lastValue = i;
    for (var j = 0; j <= s2.length; j++) {
      if (i == 0) costs[j] = j;
      else {
        if (j > 0) {
          var newValue = costs[j - 1];
          if (s1.charAt(i - 1) != s2.charAt(j - 1)) newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Calculates the similarity between two strings as a value between 0 and 1.
 *
 * The similarity is computed based on the Levenshtein edit distance, which
 * measures the minimum number of single-character edits (insertions, deletions,
 * or substitutions) required to change one string into the other. The result
 * is normalized by the length of the longer string.
 *
 * Formula:
 * similarity = (length of longer string - edit distance) / length of longer string
 *
 * @param s1 - The first string to compare.
 * @param s2 - The second string to compare.
 * @returns A number between 0 and 1 representing the similarity between the two strings.
 *          - 1.0 means the strings are identical.
 *          - 0.0 means the strings have no similarity.
 *
 * @example
 * similarity("kitten", "sitting"); // Returns a value around 0.571
 * similarity("hello", "hello");    // Returns 1.0
 */
function similarity(s1: any, s2: any) {
  var longer = s1;
  var shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  var longerLength = longer.length;
  if (longerLength == 0) {
    return 1.0;
  }
  return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
}

function isNumeric(value: any) {
  return /^-?\d+$/.test(value);
}

// Sleep for <n> ms.
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Function to determine how many times a certain string appears in another string.
// Used in part of a fix to more accurately get releases.
function countInstances(string: string, word: string) {
  return string.split(word).length - 1;
}

// Function to get data from local storage.
function getLocalStorageDataFromKey(key: string, fallback?: unknown) {
  const data = localStorage.getItem(key);

  if (data) {
    try {
      // If it's json parse it
      return JSON.parse(data);
    } catch {
      // If it's just a string or something
      return data;
    }
  } else {
    return fallback;
  }
}

class ApiError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export {
  fetch,
  waitForElement,
  setAppearance,
  editDistance,
  similarity,
  isNumeric,
  sleep,
  countInstances,
  getLocalStorageDataFromKey,
  ApiError,
};
