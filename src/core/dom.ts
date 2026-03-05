// TODO: get rid of jquery
import $ from "jquery";

/**
 * selectors
 */
export const Selectors = {
  // spotify selectors
  NOW_PLAYING_WIDGET: ".main-nowPlayingView-nowPlayingWidget",
  SONG_TITLE_BOX: "#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
  INFO_CONTAINER: ".main-nowPlayingWidget-trackInfo.main-trackInfo-container",
  PLAYING_BAR: "div.Root__now-playing-bar > aside > div",

  // aoty selectors
  ALBUM_USER_RATINGS_COUNT: ".albumUserScoreBox > .text.numReviews > a > strong",
  ALBUM_CRITIC_RATINGS_COUNT: ".albumCriticScoreBox > span > meta[itemprop='reviewCount']",
  TRACKLIST_VERIFIED_TRACK_RATINGS: "#tracklist .trackList td.trackRating:first > span",
};

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
export function setAppearance(score: number | string, element?: JQuery): string | JQuery {
  const value = Number(score);
  let color = "var(--text-subdued)";

  if (value === -1 || !Number.isFinite(value)) {
    if (element) {
      element.css({ "color": color });
      return element;
    }
    return color;
  }

  if (value >= 69.5) color = "#85ce73";
  else if (value >= 49.5) color = "#f0e68c";
  else color = "#d76666";

  if (element) {
    element.css({ "color": color });
    return element;
  }

  return color;
}

/**
 * waits for a DOM element matching the given selector to appear in the document.
 * uses MutationObserver to watch for DOM changes.
 *
 * @param selector - css selector string to match the desired element
 * @param timeout - timeout to stop observer and return null in milliseconds
 *
 * @returns promise that resolves with the matching element once it appears
 */
export function waitElement(selector: string | string[], timeout: number = 5000): Promise<JQuery<HTMLElement>> {
  return new Promise((resolve, reject) => {
    const selectorStr = Array.isArray(selector) ? selector.join(",") : selector;

    const el = document.querySelector<HTMLElement>(selectorStr);

    if (el) {
      resolve($(el));
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector<HTMLElement>(selectorStr);

      if (el) {
        clearTimeout(timer);
        observer.disconnect();
        resolve($(el));
        return;
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    const timer = window.setTimeout(() => {
      observer.disconnect();
      reject("timeout exceed");
      return;
    }, timeout);
  });
}