// @ts-nocheck

// If anyone is reading this on the Github the reason his file has over 150 lines of comments
// is because I do not remember all of stuff that I code so I just wrote small things to explain it to myself
// if I cannot remember. So if you are reading the comments to actually find out what some of the code
// does don't expect the best explanations, they are basically just poorly written reminders for myself

// Import module for parsing HTML
import * as cheerio from "cheerio";
import {
  fetch,
  waitForElement,
  similarity,
  isNumeric,
  countInstances,
  getLocalStorageDataFromKey,
  ApiError,
  setAppearance,
} from "./utils";

// Setup.
const { Player } = Spicetify;

let prevTrack: string;
let prevRequest: number = 0;
let isRefreshing: boolean = false;

// Button cooldown is set to 5 seconds just to avoid hitting the rate limit.
const RATE_LIMIT = 5000;

// Refresh icon
const REFRESH_ICON = `
<?xml version="1.0" ?><svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></svg>`;
new Spicetify.Topbar.Button("[AOTYfy] Refresh score", REFRESH_ICON, refreshRequest, false);

// Clear (trash) icon
const CLEAR_ICON = `
<?xml version="1.0" ?><svg fill="white" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg"><path d="M 8.386719 1.800781 L 7.785156 2.398438 L 3.601562 2.398438 L 3.601562 4.800781 L 20.398438 4.800781 L 20.398438 2.398438 L 16.214844 2.398438 L 15.613281 1.800781 L 15.015625 1.199219 L 8.984375 1.199219 Z M 8.386719 1.800781 M 4.804688 13.402344 C 4.816406 20.230469 4.816406 20.816406 4.867188 20.96875 C 4.964844 21.300781 5.046875 21.480469 5.191406 21.699219 C 5.527344 22.222656 5.996094 22.554688 6.644531 22.734375 C 6.808594 22.78125 7.261719 22.785156 12 22.785156 C 16.738281 22.785156 17.191406 22.78125 17.355469 22.734375 C 18.003906 22.554688 18.472656 22.222656 18.808594 21.699219 C 18.953125 21.480469 19.035156 21.300781 19.132812 20.96875 C 19.183594 20.816406 19.183594 20.230469 19.195312 13.402344 L 19.199219 6 L 4.800781 6 Z M 4.804688 13.402344 "/></svg>`;
new Spicetify.Topbar.Button("[AOTYfy] Clear score", CLEAR_ICON, clearRating, false);

// Setting up HTML elements.
let ratingContainer: HTMLAnchorElement;
let songRating: HTMLAnchorElement;
let songTitleBox: HTMLAnchorElement | null;
let infoContainer: HTMLElement | null;

// local storage keys
const SETTINGS_KEY = "aotyfy:enabled";
const NOTIFICATION_KEY = "aotyfy:notifications";
// const AGGRESSIVE_SEARCH_KEY = "aotyfy:aggressive_search";
// const CUSTOM_URL_KEY = "aotyfy:custom_url";
const NEW_VERSION_KEY = "aotyfy:new_version";

const Settings = {
  get isEnabled() {
    return getLocalStorageDataFromKey(SETTINGS_KEY, true);
  },
  get isNotifications() {
    return getLocalStorageDataFromKey(NOTIFICATION_KEY, false);
  },
  // get isAggressiveSearch() {
  //   return getLocalStorageDataFromKey(AGGRESSIVE_SEARCH_KEY, true);
  // }
};

// Clearing the displayed ratings.
function clearRating() {
  if (!infoContainer || !ratingContainer) return;

  console.debug("[AOTYfy] Clearing ratings ...");

  try {
    // Clear song scores and reset title styling
    if (songTitleBox) {
      document.querySelectorAll(".songScore").forEach((el) => el.remove());

      if (songTitleBox.children.length) {
        songTitleBox.children[0].style.fontWeight = 400;
      }
    }

    // Clear general score elements
    document.querySelectorAll(".scoreElement").forEach((el) => el.remove());
  } catch (e) {
    console.error("[AOTYfy] Error clearing ratings:", e);
  }
}

// Function for fetching aoty URL from album/artist name then parsing the data.
async function getPageLink(
  artist: string,
  album: string,
  firstiteration: boolean,
  type?: string | undefined,
  skip_simcheck: boolean = false,
): any[] | undefined {
  let song: string = artist + " " + album;

  // base url
  let url: string = "https://www.albumoftheyear.orgundefined";

  // Changed so if it already tried searching for a release but couldn't find one it will
  // just search the album name and get the most similar one.
  if (firstiteration) {
    url = `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(song)}`;
  } else {
    url = `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(album)}`;
  }

  console.debug(`[AOTYfy] Fetching URL: \n${url}`);

  const res = await fetch(url);
  console.debug(`[AOTYfy] Fetched response: \n${res}`);

  const $$ = cheerio.load(res);

  // If this URL is not changed it will know there has been an error
  let aotyUrl: string = "https://www.albumoftheyear.orgundefined";

  // A lot of JSONS. All used for finding the album most similar to what it is searching for if the exact cannot be found.
  // For example one Rüfüs Du Sol album was released just under "Rüfüs" on AOTY
  // This means the normal search prompt would return nothing.
  // This is fixed by searching only the album title and getting the album with the most similar artist name
  // Only gets it if it is more than 30% similar.
  let SimToArtistJSON = "{\n";
  let ArtistToUrlJSON = "{\n";
  let ArtistToSimJSON = "{\n";
  let ArtistToAlbumJSON = "{\n";
  let SimToAlbumJSON = "{\n";
  let AlbumToUrlJSON = "{\n";

  // Interface for release objects
  interface ReleaseObject {
    title: string;
    artist: string;
    type: string;
    year: number;
    url?: string;
  }

  let $albumBlocks = $$(`div.albumBlock`);

  if (type) {
    console.debug(`[AOTYfy] Searching for '${type}' releases only.`);
    $albumBlocks = $$(`div.albumBlock[data-type='${type}']`);
  }

  const Releases: ReleaseObject[] = $albumBlocks
    .map((i, el) => {
      const _albumBlock = $$(el);
      const _albumTitle = _albumBlock.find(".albumTitle").text().trim() || "";
      const _artistName = _albumBlock.find(".artistTitle").text().trim() || "";
      const _meta = _albumBlock.find(".type").text().trim().toLowerCase() || "";
      const _url = _albumBlock.find("a:has(.albumTitle)").attr("href") || "undefined";

      const [_yearStr, _typeStr] = _meta.split(" • ");
      const _year = parseInt(_yearStr, 10) || 0;

      return {
        title: _albumTitle,
        artist: _artistName,
        type: _typeStr || "",
        year: _year,
        url: _url ? "https://www.albumoftheyear.org" + _url : "",
      };
    })
    .get();

  console.debug(`[AOTYfy] Collected ${Releases.length} releases:`);
  console.table(Releases);

  // skip checking similarity (in some cases really useful)
  if (skip_simcheck) {
    aotyUrl = Releases[0].url;
  } else {
    // If there is just one result it will just pick that and ignore the other steps.
    if (Releases.length == 1) {
      console.debug("[AOTYfy] Only one release found.");
      const _artistTitle = $$(".artistTitle")[0];
      let _strct1 = _artistTitle.parentNode?.parentNode?.children?.[2]?.["attribs"]?.["href"];
      let _strct2 = _artistTitle.nextSibling?.["attribs"]?.["href"]; // fallback structure

      if (_strct1) {
        aotyUrl = "https://www.albumoftheyear.org" + _strct1;
      } else if (_strct2) {
        aotyUrl = "https://www.albumoftheyear.org" + _strct2;
      } else {
        console.debug("[AOTYfy] Can't get URL. Probably something wrong with selectors.");
        return;
      }
      Releases[0].url = aotyUrl;
      console.debug(`[AOTYfy] URL: ${aotyUrl}`);
    } else if (Releases.length > 1) {
      console.debug(`[AOTYfy] Multiple results (${Releases.length}) found.`);

      // Array that will have all the similarity numbers.
      let ReleaseSim: number[] = [];

      // Trying to check if the first result is exactly the same by lowering album title
      // if (AlbumList[0].toLowerCase() === album.toLowerCase()) {
      if (Releases[0].title.toLowerCase() == album.toLowerCase()) {
        const _artistTitle = $$(".artistTitle")[0];

        let _strct1 = _artistTitle.parentNode?.nextSibling?.attribs?.href;
        let _strct2 = _artistTitle.nextSibling?.attribs?.href;
        let _strct3 = _artistTitle.parentNode?.parentNode?.children?.[2]?.attribs?.href;

        if (_strct1) {
          aotyUrl = "https://www.albumoftheyear.org" + _strct1;
        } else if (_strct2) {
          aotyUrl = "https://www.albumoftheyear.org" + _strct2;
        } else if (_strct3) {
          aotyUrl = "https://www.albumoftheyear.org" + _strct3;
        } else {
          console.error("[AOTYfy] Can't get URL. Probably something wrong with selectors.");
          return;
        }

        Releases[0].url = aotyUrl;
        console.debug(`[AOTYfy] Exact match found at first result: ${aotyUrl}`);
      } else {
        console.debug("[AOTYfy] No exact match found at first result, checking similarities...");
        // If an exact match wasn't found at first result it will do the similarity checks.
        // Loop for the amount of releases there are.
        for (let h = 0; h < Releases.length; h++) {
          // Changed i to go down from 60 to 0 instead of up from 0 to 60 because
          // in JSONs if there are duplicate values it will just pick the last one of it in
          // the list, and since AOTY search results are sorted by popularity it would pick the
          // least popular one, now if there are duplicate values it prioritizes the most popular one.
          let i = Releases.length - (h + 1);

          const RELEASE_ALBUM = Releases[i].title;
          const RELEASE_ARTIST = Releases[i].artist;

          // If it isn't the last iteration.
          if (i !== 0) {
            const _href = $$(".artistTitle")[i].parentNode.parentNode.children[2]["attribs"]["href"];

            // JSON that has similarities and artist names. Example:
            // "0.43": "Frank Ocean"
            SimToArtistJSON += `"${similarity(RELEASE_ARTIST, artist)}": "${RELEASE_ARTIST}",\n`;
            console.debug(`[AOTYfy] Similar to artist: ${SimToArtistJSON}`);

            // JSON that has artist names and album URLs. Example:
            // "King Crimson": "https://www.albumoftheyear.org/album/5929-king-crimson-in-the-court-of-the-crimson-king.php"
            ArtistToUrlJSON += `"${RELEASE_ARTIST}": "${_href}",\n`;
            console.debug(`[AOTYfy] Artist to URL: ${ArtistToUrlJSON}`);

            // JSON that has artist names and similarities. Example:
            // "Frank Ocean": "0.43"
            ArtistToSimJSON += `"${RELEASE_ARTIST}": "${similarity(RELEASE_ARTIST, artist)}",\n`;
            console.debug(`[AOTYfy] Artist to similar: ${ArtistToSimJSON}`);

            // JSON that has artist names and album names. Example:
            // "Stevie Wonder": "Songs In The Key Of Life"
            // (This one actually isn't a JSON, not gonna change it though so the names are more consistent.)
            ArtistToAlbumJSON += `"${RELEASE_ARTIST}": ${RELEASE_ALBUM}\n`;
            console.debug(`[AOTYfy] Artist to album: ${ArtistToAlbumJSON}`);

            ReleaseSim.push(similarity(RELEASE_ARTIST, artist));

            // JSON that has album names and album URLs. Example:
            // "Songs In The Key Of Life": "https://www.albumoftheyear.org/album/5600-stevie-wonder-songs-in-the-key-of-life.php"
            AlbumToUrlJSON += `"${RELEASE_ALBUM.replaceAll('"', '\\"')}": "${_href}",\n`;
            console.debug(`[AOTYfy] Album to URL: ${AlbumToUrlJSON}`);
          }

          // If it is the last iteration.
          if (i == 0) {
            const _href = $$(".artistTitle")[i].parentNode.parentNode.children[2]["attribs"]["href"];
            // All JSONs are the same as the previously mentioned ones, only difference is they don't end in
            // commas and there is a } at the end to make it a valid JSON.
            SimToArtistJSON += `"${similarity(RELEASE_ARTIST, artist)}": "${RELEASE_ARTIST}"\n}`;
            ArtistToUrlJSON += `"${RELEASE_ARTIST}": "${_href}"\n}`;
            ArtistToSimJSON += `"${RELEASE_ARTIST}": "${similarity(RELEASE_ARTIST, artist)}"\n}`;
            ArtistToAlbumJSON += `"${RELEASE_ARTIST}": ${RELEASE_ALBUM}`;
            AlbumToUrlJSON += `"${RELEASE_ALBUM.replaceAll('"', '\\"')}": "${_href}"\n}`;

            ReleaseSim.push(similarity(RELEASE_ARTIST, artist));
          }
        }
        // Arrays for in the case of dupe artists.
        let DupeAristArray = [];
        let DupeArtistSimArr = [];

        // Gets the highest value of similarity from the list then uses that to get the artist name
        // for example if the highest similarity is "0.76" and the most similar name is Marvin Gaye
        // the JSON would look like this "0.76": "Marvin Gaye" and then using the highest similarity it outputs the artist name.
        let MostSimArtist = JSON.parse(SimToArtistJSON)[ReleaseSim.reduce((a, b) => Math.max(a, b), -Infinity)];

        // Splits the artist & album "JSON" by lines so it is easier to work with and to know how many times to loop.
        var lines = ArtistToAlbumJSON.split("\n");

        // If the most similar artist name shows up more than once in the artist & album JSON.
        if (countInstances(ArtistToUrlJSON, MostSimArtist) > 1) {
          // Loop for the amount of lines.
          for (let h = 0; h < lines.length; h++) {
            let line = lines[h];

            // Checks if that line contains the most similar artist.
            if (line.indexOf(`"${MostSimArtist}":`) != -1) {
              // If it does it adds the album name to an array.
              DupeAristArray.push(line.split(`"${MostSimArtist}": `)[1]);
            }
          }
        }

        // If a singular artist has more than 1 song on the page.
        if (DupeAristArray.length > 1) {
          // Loop for the amount of albums that artist has on the page.
          for (let a = 0; a < DupeAristArray.length; a++) {
            // If it is not the last iteration
            if (a !== DupeAristArray.length - 1) {
              SimToAlbumJSON += `"${similarity(DupeAristArray[a], album)}": "${
                // Replace quotation marks in album titles since this messes with the JSON.
                DupeAristArray[a].replaceAll('"', '\\"')
              }",\n`;
            }
            // If it is the last iteration.
            if (a == DupeAristArray.length - 1) {
              SimToAlbumJSON += `"${similarity(DupeAristArray[a], album)}": "${
                // Replace quotation marks in album titles since this messes with the JSON.
                DupeAristArray[a].replaceAll('"', '\\"')
              }"\n}`;
            }

            // Add similarity of duplicate artist albums and album.
            DupeArtistSimArr.push(similarity(DupeAristArray[a], album));
          }
        }

        if (DupeAristArray.length >= 1) {
          // Most similar album of the multiple albums from one artist.
          let MostSimAlbum = JSON.parse(SimToAlbumJSON)[DupeArtistSimArr.reduce((a, b) => Math.max(a, b), -Infinity)];

          // Changes the URL.
          aotyUrl = "https://www.albumoftheyear.org" + JSON.parse(AlbumToUrlJSON)[MostSimAlbum];
        }

        // If the artist has only 1 album on the page.
        if (DupeAristArray.length < 1) {
          // If the artist name is at least 30% similar.
          if (JSON.parse(ArtistToSimJSON)[MostSimArtist] > 0.3) {
            aotyUrl = "https://www.albumoftheyear.org" + JSON.parse(ArtistToUrlJSON)[MostSimArtist];
          }
        }
      }
    } else {
      if (Settings.isNotifications)
        Spicetify.showNotification("[AOTYfy] Can't find anything on AOTY (not added on website/search failed)", true);
      return;
    }
  }

  let $;
  let res2;

  // If no URL was able to be obtained.
  if (aotyUrl == "https://www.albumoftheyear.orgundefined") {
    // [improved error handling]
    switch (res.status) {
      case 500:
        if (Settings.isNotifications) Spicetify.showNotification(`[AOTYfy] AOTY or Proxy is down.`, true);
        return;
      case 200:
      case 530:
        if (Settings.isNotifications) Spicetify.showNotification("[AOTYfy] No release found on AOTY.", true);
        return;
      case 429:
        if (Settings.isNotifications) Spicetify.showNotification(`[AOTYfy] Request failed.`, true);
        return;
      default:
        if (Settings.isNotifications) Spicetify.showNotification(`[AOTYfy] Request failed.`, true);
        return;
    }
  } else {
    console.log("[AOTYfy] Parsing URL: " + aotyUrl);
    res2 = await fetch(aotyUrl);

    // Parsing the HTML to find data to be used.
    $ = cheerio.load(res2);
  }

  // Seeing the number of ratings an album has via CSS selector.
  let ratingCount: string = $(
    "#centerContent > div.fullWidth > div:nth-child(4) > div.albumUserScoreBox > div.text.numReviews > a > strong",
  ).text()!;

  // Seeing if the tracklist has track rating enabled via checking if any tracks have a number rating next to them
  // This has to be done because not every release has track rating enabled.
  let checkIfTrackRatings = $("#tracklist > div.trackList > table > tbody > tr:nth-child(1) > td.trackRating > span").text();

  // hasRatings is False by default and changes to True if a track score is detected.
  let hasRatings = "False";

  // Setting up JSONs to be parsed to return information.
  let JSONSongUrls = "";
  let JSONTrackRatings = "";
  let JSONRatingCount = "";
  let songRatingsJSON = "{\n";
  let songUrlJSON = "{\n";
  let songRatingCountJSON = "{\n";

  // If tracklist has ratings this will run.
  let tracklistcount;
  let longestdisc = 0;
  let testing;

  if (isNumeric(checkIfTrackRatings) == true) {
    // Set hasRatings to true because a tracklist has ratings
    hasRatings = "True";

    let h = 1;
    let numofdiscs = $(".discNumber");

    // Finding the amount of tracks the longest disc in an album has.
    // This was a fix for albums that have longer second or third discs than first discs.
    var arr = [];
    if (numofdiscs.length > 0) {
      for (let i = 0; i < numofdiscs.length; i++) {
        testing = $(".rightBox").find(".trackListTable").get(i);
        tracklistcount = $(testing).children("tbody").children("tr").length;
        arr.push(tracklistcount);
      }

      longestdisc = arr.reduce((a, b) => Math.max(a, b), -Infinity);
    }

    // If the album is just one disc it will not check for the longest.
    if (numofdiscs.length <= 0) {
      testing = $(".rightBox").find(".trackListTable").get(0);
      tracklistcount = $(testing).children("tbody").children("tr").length;
      longestdisc = tracklistcount;
    }
    // This will loop for the amount of tracks in the tracklist.
    // Or in the case of multiple discs it will loop the amount of times of the longest disc.
    let ii;
    let dc;
    let i = 0;
    if (numofdiscs.length == 0) {
      ii = 0;
      dc = 0;
    }
    if (numofdiscs.length > 0) {
      ii = 1;
    }
    for (i = Number(ii); i <= numofdiscs.length; i++) {
      let trackcounter = 0;
      if (numofdiscs.length > 0) {
        dc = i - 1;
      }
      // Getting the amount of tracks in a disc.
      testing = $(".rightBox").find(".trackListTable").get(Number(dc));
      tracklistcount = $(testing).children("tbody").children("tr").length;

      // Setting up the JSON for data
      let trackratingbydisc = "";
      let trackurlbydisc = "";
      let trackratingcountbydisc = "";

      // Run the amount of times as the longest disc has tracks
      for (h = 0; h < longestdisc; h++) {
        trackcounter++;

        // Element where track ratings and rating counts are obtained.
        let ratingElement = $(
          `#tracklist > div.trackList > table > tbody > tr:nth-child(${trackcounter}) > td.trackRating > span`,
        );
        // Element where the track URL is obtained.
        let urlElement = $(`#tracklist > div.trackList > table > tbody > tr:nth-child(${trackcounter}) > td.trackTitle > a`);
        let trbd1;
        let tubd1;

        // If there isn't the same amount of elements as the amount of discs
        // and it is not on the longest disc. (When first disc is longer than the second)
        if (ratingElement.length !== numofdiscs.length && tracklistcount !== longestdisc) {
          trackratingbydisc += "00&";
          trackurlbydisc += "/song/undefined";
          trackratingcountbydisc += "0 Ratings&";
        }

        // If there isn't the same amount of elements as the amount of discs
        // and you are on the longest disc. (When second disc is longer than the first)
        if (ratingElement.length !== numofdiscs.length && tracklistcount == longestdisc) {
          // The number it would normally be has to be subtracted by 1 if the second disc is longer
          // this is because there would only be 1 element instead of 2, without this the output would be undefined
          trbd1 = $(ratingElement[ratingElement.length - 1]);

          // Each bit of data is split up with a & symbol for easier parsing.
          trackratingbydisc += trbd1.text() + "&";
          tubd1 = $(urlElement[ratingElement.length - 1]);
          trackurlbydisc += tubd1.attr("href");
          trackratingcountbydisc += trbd1.attr("title") + "&";
        }

        // If there is the same amount of elements as the amount of discs.
        if (ratingElement.length == numofdiscs.length) {
          trbd1 = $(ratingElement[Number(dc)]);

          // Each bit of data is split up with a & symbol for easier parsing.
          trackratingbydisc += trbd1.text() + "&";
          tubd1 = $(urlElement[Number(dc)]);
          trackurlbydisc += tubd1.attr("href");
          trackratingcountbydisc += trbd1.attr("title") + "&";
        }
      }

      // If it is the last iteration OR there is only 1 disc
      // it will not add a comma to the end, without this in place there would be
      // an error parsing the JSON.
      if (dc === numofdiscs.length - 1 || numofdiscs.length == 0) {
        songRatingsJSON += `"${dc}": "` + trackratingbydisc + '"\n';
        songUrlJSON += `"${dc}": "` + trackurlbydisc + '"\n';
        songRatingCountJSON += `"${dc}": "` + trackratingcountbydisc + '"\n';
      }

      // If it isn't the last iteration it will add a comma to the end
      // without this in place there would be an error parsing the JSON.
      if (dc !== numofdiscs.length - 1 && numofdiscs.length > 0) {
        songRatingsJSON += `"${dc}": "` + trackratingbydisc + '",\n';
        songUrlJSON += `"${dc}": "` + trackurlbydisc + '",\n';
        songRatingCountJSON += `"${dc}": "` + trackratingcountbydisc + '",\n';
      }
    }

    // Adding } to the end of the JSON so it can be parsed without error.
    songRatingsJSON += "}";
    songUrlJSON += "}";
    songRatingCountJSON += "}";

    // Parsing the JSONs.
    JSONSongUrls = JSON.parse(songUrlJSON);
    JSONTrackRatings = JSON.parse(songRatingsJSON);
    JSONRatingCount = JSON.parse(songRatingCountJSON);
  }

  // Removing the comma from the rating count to later check if this equals 0 or not.
  let ratingcountint = ratingCount.replace(",", "");

  // Getting and rounding score to 2 decimals.
  let score = $("#centerContent > div.fullWidth > div:nth-child(4) > div.albumUserScoreBox > div.albumUserScore > a").attr(
    "title",
  )!;
  let intscore = parseFloat(score);
  let finalintscore = intscore.toFixed(2);
  let roundedscore = parseFloat(finalintscore);

  // Returning all data obtained.
  return [roundedscore, ratingCount, aotyUrl, ratingcountint, JSONTrackRatings, hasRatings, JSONSongUrls, JSONRatingCount];
}

// Function that the refresh button runs.
async function refreshRequest() {
  let now = Date.now();

  // If it has been less than 5 seconds since the last attempt at running this send notification and don't run the main function.
  if (now - prevRequest < RATE_LIMIT) {
    if (Settings.isNotifications)
      Spicetify.showNotification(
        `[AOTYfy] You are on cooldown. Please wait ${
          (RATE_LIMIT - (now - prevRequest)) / 1000
        } seconds to avoid hitting the rate limit.`,
      );
    return;
  }

  // Fix to make it not spam.
  isRefreshing = true;

  // Start the 5 second count.
  prevRequest = Date.now();

  console.log("[AOTYfy] Refreshing scores ...");
  // Run the main script.
  update();
  if (Settings.isNotifications) Spicetify.showNotification(`[AOTYfy] Scores refreshed.`);
}

async function update() {
  if (!Settings.isEnabled) {
    clearRating();
    return;
  }

  console.debug("[AOTYfy] Updating scores ...");

  // Check if there is a track playing
  if (!Spicetify.Player.data.playbackId && !Spicetify.Player.data.playback_id) return;

  // Check to see if you are replaying the same track.
  const id = Spicetify.Player.data.playbackId ?? Spicetify.Player.data.playback_id;
  console.debug(`[AOTYfy] Player id: ${id}`);

  // Fix to make it not spam #2.
  if (id == prevTrack && isRefreshing == false) return;
  isRefreshing = false;

  // Check #2 if there is a track playing, infoContainer is also used later to add the album rating text.
  // Also fix for extension not working if friends tab is closed.
  const selectors = [
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-trackInfo-container.ellipsis-one-line",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar.LibraryX > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
  ];

  infoContainer = selectors.map((selector) => document.querySelector(selector)).find((element) => element !== null);

  if (!infoContainer) return;
  clearRating();

  // Making sure the duplicate score glitch doesn't happen.
  // The cause of it was a request finishing while you have already skipped to another song.
  // This fix just makes sure there is not more than 1 score element.
  if (document.getElementsByClassName("scoreElement").length > 1) {
    clearRating();
  }
  if (document.getElementsByClassName("songScore").length > 1) {
    clearRating();
  }

  let release_type: string | undefined;
  let skip_simcheck: boolean = false;

  // Getting the track info from Spotify.
  let { title, album_title, artist_name, album_track_number, album_disc_number } =
    Spicetify.Player.data.item?.metadata ??
    // oxlint-disable-next-line no-unsafe-optional-chaining
    Spicetify.Player.data.track?.metadata;

  // Detect if no track is playing
  if (!title || !album_title || !artist_name) return;

  prevTrack = id;

  try {
    console.debug("[AOTYfy] Now Playing:");
    console.table({ title, album_title, artist_name });

    /*
    SPECIFIC FIXES
    specific fixes for artists/albums/songs.
    feel free to contibute on github if you spotted some of these.
    */
    // Removing any deluxes or remasters from album titles.
    // Made it so it would not remove the () for Weezer due to a request since almost all of
    // Weezer's albums are just named Weezer followed by (insertcolorhere album)
    // ( now a list of artists that are ignored for this )
    const IGNORE_SYMBOL_REPLACING_ARTISTS = ["Weezer", "SOPHIE", "Crystal Castles"];

    if (!IGNORE_SYMBOL_REPLACING_ARTISTS.includes(artist_name)) {
      console.log(`Artist ${artist_name} is not in the ignore list.`);
      album_title = album_title.split(" -")[0];
      album_title = album_title.split(" (")[0];
      album_title = album_title.replace('"', "");
    }
    if (album_title == "Teen Week" && artist_name == "Jane Remover") {
      album_title = "Teen Week [Abridged]";
    }
    // set release_type for SOPHIE ep
    if (album_title == "SOPHIE (EP)") {
      album_title = "SOPHIE";
      release_type = "ep";
      skip_simcheck = true;
    }
    // album is named "Wish You Well / Album" on Spotify but just "Wish You Well" on AOTY
    if (artist_name == "Invariance" && album_title == "Wish You Well / Album") {
      album_title = album_title.replace(" / Album", "");
    }
    // search for "ATIVAN COREA" with that album title returns no results (AOTY bug)
    if (artist_name == "ATIVAN COREA" && album_title.startsWith("[][][][][][][][][][][][][[][][][][][][[][[[][]][[][]")) {
      artist_name = "YAYAYI";
    }
    // other names
    switch (artist_name) {
      case "Ms. Lauryn Hill":
        artist_name = "Lauryn Hill";
        break;
      case "RÜFÜS DU SOL":
        artist_name = "RÜFÜS";
        break;
    }

    // Getting the information to search, the format is Artist Album.
    // Example would be "Marvin Gaye What's Going On"
    // Running the function to get the URL and parse it for information with the release.
    console.debug("[AOTYfy] To send: ");
    console.table({ artist_name, album_title, release_type });

    let rating: any | undefined = await getPageLink(artist_name, album_title, true, release_type, skip_simcheck);
    console.debug(`[AOTYfy] Final URL: ${rating}`);

    // Making sure there are no duplicate ratings since this was an issue before.
    if (document.getElementsByClassName("scoreElement").length >= 1) {
      for (let i = 0; i < document.getElementsByClassName("scoreElement").length; i++) {
        document.getElementsByClassName("scoreElement")[i].remove();
      }
    }

    // rating[5] is the "hasRatings", it checks if this is True before adding track ratings.
    // This is so it does not just say "undefined" on tracks that do not have it.
    if (rating[5] === "True") {
      // Song title box element so the track rating can be added to it.
      // There is currently an issue where if a track title is too long it won't show.
      // Working on a fix, I will not put the score before the track title since it looks weird.
      // Also fix #2 for glitch causing extension to not work with friends tab open.
      const songTitleSelectors = [
        "#main > div > div.Root__top-container.Root__top-container--right-sidebar-visible > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container.ellipsis-one-line > div.main-trackInfo-name.ellipsis-one-line.main-type-mesto > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar.LibraryX > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
      ];

      songTitleBox = songTitleSelectors.map((selector) => document.querySelector(selector)).find((element) => element !== null);

      // If the song has a title.
      if (songTitleBox) {
        // Creating the element that will be added.
        songRating = document.createElement("a");

        // Example JSON for rating[4] (song score JSON) would be:
        // 0: "92&83&95&94&98&90&94&"
        // 1: "78&73&82&94&94&95&"
        // This is an example for an album with two discs.
        // The data is split using the & symbol.
        // Since the first one is 0 and the first album_disc_number would be 1
        // 1 has to be subtracted.
        console.debug(`Album disc number: ${album_disc_number}`);
        console.debug(`Album track number: ${album_track_number}`);
        console.debug(rating);

        let entry = rating[4]?.[String(Number(album_disc_number) - 1)];
        if (!entry) {
          entry = rating[4]?.["0"];
        }

        let songScoreList = entry.split("&");
        if (songScoreList.length == 0) {
          console.log("[AOTY] No track ratings found.");
          return;
        }

        let songScore = songScoreList[Number(album_track_number) - 1];
        songRating.className = "songScore";

        console.log(`[AOTY] Song score: ${songScore}`);
        setAppearance(songScore, songRating);

        // Adding the URL to the text to lead to the song link.
        let trackEntry = rating[6]?.[String(Number(album_disc_number) - 1)];
        if (!trackEntry) {
          trackEntry = rating[6]?.["0"];
        }

        let trackUrl = String(trackEntry).split("/song")[Number(album_track_number)];
        songAOTYUrl = "https://albumoftheyear.org/song" + trackUrl;
        console.debug(`Song AOTY URL: ${songAOTYUrl}`);
        songRating.href = songAOTYUrl;

        // Styling.
        songRating.style.fontSize = "10px";
        songRating.style.fontWeight = "bold";

        // Adding hover text that displays the amount of users that have rated the track.
        // Works the same way as the songScoreList talked about earlier.
        let ratingEntry = rating[7]?.[String(Number(album_disc_number) - 1)];
        if (!ratingEntry) {
          ratingEntry = rating[7]?.["0"];
        }

        let ratingTitle = ratingEntry.split("&")[Number(album_track_number) - 1];

        songRating.title = ratingTitle;

        // songTitle = songTitleBox.children[0];
        // if (songScore >= 90 && ratingTitle.split("Ratings")[0] >= 25) {
        //   songTitle.style.fontWeight = "bold";
        // }

        if (songScore === null || songScore === undefined || songScore === "") {
          songRating.innerText = `[NR]`;
          songRating.title = "Not Rated";
        } else {
          songRating.innerText = `[${songScore}]`;
        }
        // Adding this element to the same area the track title is.
        songTitleBox.appendChild(songRating);
      }
    }

    // Creating the element with the album score that goes under the artist name.
    let divContainer = document.createElement("div");
    divContainer.style.gridArea = "rating";
    ratingContainer = document.createElement("a");
    divContainer.appendChild(ratingContainer);
    divContainer.className = "scoreElement";

    console.debug("[AOTYfy] Recieved data from API:");
    console.table(rating);

    // Album score just like track score changes color based on the rating.
    if (rating[0] !== null && rating[0] !== undefined) {
      console.log(`[AOTYfy] Album score: ${rating[0]}`);
      ratingContainer.innerText = `${rating[0]}`;
    }

    setAppearance(rating[0], ratingContainer);

    // If at least 1 person has rated this album it will display how many ratings it has.
    if (rating[3] > 0) {
      ratingContainer.innerText = `${rating[0]} (${rating[1]} ratings)`;
    }

    // If no one has rated this album it will display "No Ratings".
    if (rating[3] == 0) {
      ratingContainer.style.color = "var(--spice-extratext)";
      ratingContainer.innerText = `No Ratings.`;
    }

    // URL to the album on AOTY.
    if (rating[2]) ratingContainer.href = String(rating[2]);
    ratingContainer.style.fontSize = "12px";
    //ratingContainer.style.fontWeight = "bold";

    // Adding the element to the track info area.
    // Fix the grid container (genre included to allow for compatibility with spotify-genres)
    infoContainer.style.gridTemplate =
      '"title title" "badges subtitle" "rating rating" "quality quality" "genres genres" / auto 1fr auto auto';
    infoContainer.appendChild(divContainer);
  } catch (e: any) {
    // Checking for errors.
    if (e instanceof ApiError) {
      console.error("[AOTYfy] Failed to get AOTY rating (API ERROR):", e.message);
      console.debug(e);
    } else {
      console.error("[AOTYfy] Unknown error", e);
    }
  }
}

export default async function main() {
  while (!Spicetify.CosmosAsync || !Spicetify.showNotification) await new Promise((resolve) => setTimeout(resolve, 100));

  const enabledMenuItem = new Spicetify.Menu.Item("Enabled", Settings.isEnabled, (self) => {
    Settings.isEnabled = !Settings.isEnabled;
    localStorage.setItem(SETTINGS_KEY, Settings.isEnabled);
    self.setState(Settings.isEnabled);
  });

  // we dont need this anymore, extension is in much more stable state.
  // const aggressiveSearchMenuItem = new Spicetify.Menu.Item("Aggressive Search", Settings.isAggressiveSearch, (self) => {
  //   Settings.isAggressiveSearch = !Settings.isAggressiveSearch;
  //   localStorage.setItem(AGGRESSIVE_SEARCH_KEY, Settings.isAggressiveSearch);
  //   self.setState(Settings.isAggressiveSearch);
  // });

  const notificationMenuItem = new Spicetify.Menu.Item("Show Notifications", Settings.isNotifications, (self) => {
    Settings.isNotifications = !Settings.isNotifications;
    localStorage.setItem(NOTIFICATION_KEY, Settings.isNotifications);
    self.setState(Settings.isNotifications);
  });

  const showNewVersionPopupMenuItem = new Spicetify.Menu.Item("Show New Version Popup", false, () => {
    showNewVersionPopup();
  });

  let submenu = new Spicetify.Menu.SubMenu("AOTYfy", [enabledMenuItem, notificationMenuItem, showNewVersionPopupMenuItem]);

  submenu.register();

  if (Settings.isEnabled) {
    update();

    // Run the clearing and then main function if the song has changed.
    let updateTimeout;

    Player?.addEventListener("songchange", function () {
      clearRating();

      // avoid changing songs to fast and hitting rate limit
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(() => {
        update();
      }, 300);
    });
  }

  // Welcome popup for versions.
  const POPUP_TITLE = "Welcome to AOTYfy";
  const POPUP_CONTENT = `
      <p style="margin: 0;padding:0;">Welcome to another fork of AOTY addon for Spicetify.</p>
      <br>
      <h2>Changelog</h2>
      <br>
      <div>
        <p>v1.0.0 | <i>12/12/2025</i></p>
        <ul style="list-style:inherit;margin-left:1.5em;margin-top:10px;">
          <li>Initial release.</li>
        </ul>
      </div>`;

  function showNewVersionPopup() {
    Spicetify.PopupModal.display({
      title: POPUP_TITLE,
      content: POPUP_CONTENT,
      isLarge: true,
    });
  }

  if (Spicetify.LocalStorage.get(NEW_VERSION_KEY) == null) {
    showNewVersionPopup();
    Spicetify.LocalStorage.set(NEW_VERSION_KEY, "v1.0.0");
  }

  waitForElement("#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div").then((nowPlayingBar) => {
    nowPlayingBar.style.height = nowPlayingBar.offsetHeight + 5 + "px";
    update();
  });
}
