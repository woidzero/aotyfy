// oxlint-disable no-unused-vars
import { __VERSION__, __CHANGELOG__ } from "./generated/meta";

import type { _Album, _ScoreBox, _TrackItem, _Track, ReleaseObject, _Meta } from "./types/global";

import * as cheerio from "cheerio";

import { fetch, waitForElement, similarity, isNumeric, getLocalStorageDataFromKey, setAppearance, d } from "./utils";

import { RefreshIcon, TrashIcon } from "./components/Icons";
import { ScoreCard } from "./components/ScoreCard";
import { AOTYError, APIError } from "./exceptions";

const { Player, React, ReactDOM } = Spicetify;

let prevTrack: string;
let prevRequest: number = 0;
let isRefreshing: boolean = false;

// button cooldown is set to 5 seconds to avoid hitting rate limit
const RATE_LIMIT = 5000;

// defining Topbar buttons
new Spicetify.Topbar.Button("[AOTYfy] Refresh score", RefreshIcon, refreshRequest, false);
new Spicetify.Topbar.Button("[AOTYfy] Clear score", TrashIcon, clearRating, false);

// setting up HTML elements vars and settings object
let ratingContainer: HTMLAnchorElement | any = null;
let scoreCardContainer: HTMLDivElement | any = null;
let songTitleBox: HTMLAnchorElement | any = null;
let infoContainer: HTMLElement | any = null;

const SETTINGS_KEY = "aotyfy:enabled";
const NOTIFICATION_KEY = "aotyfy:notifications";
const STORED_VERSION_KEY = "aotyfy:storedVersion";
const SHOW_IN_SIDEBAR_KEY = "aotyfy:showInSidebar";
const SHOW_IN_NOW_PLAYING_KEY = "aotyfy:showInNPV";

const Settings = {
  isEnabled: getLocalStorageDataFromKey(SETTINGS_KEY, true),
  isNotifications: getLocalStorageDataFromKey(NOTIFICATION_KEY, false),
  storedVersion: getLocalStorageDataFromKey(STORED_VERSION_KEY, undefined),
  showInSidebar: getLocalStorageDataFromKey(SHOW_IN_SIDEBAR_KEY, true),
  showInNowPlaying: getLocalStorageDataFromKey(SHOW_IN_NOW_PLAYING_KEY, true),
};

/**
 * clearing the ratings from dom
 */
function clearRating() {
  if (!infoContainer || !ratingContainer) return;

  console.debug("[AOTYfy] Clearing ratings ...");

  try {
    if (songTitleBox) {
      document.querySelectorAll(".aotyfy-TrackRating").forEach((el) => el.remove());

      if (songTitleBox.children.length) {
        const firstChild = songTitleBox.children[0] as HTMLElement;
        firstChild.style.fontWeight = "400";
      }
    }

    document.querySelectorAll(".aotyfy-AlbumRating").forEach((el) => el.remove());

    // unmount React component and remove container
    if (scoreCardContainer && document.body.contains(scoreCardContainer)) {
      Spicetify.ReactDOM.unmountComponentAtNode(scoreCardContainer);
      scoreCardContainer.remove();
      scoreCardContainer = null;
    }
  } catch (e) {
    console.error("[AOTYfy] Error clearing ratings:", e);
  }
}

/**
 * fetches AOTY page URL and parses album/track API
 */
async function refreshRequest() {
  const now = Date.now();

  // enforce 5 second cooldown to avoid rate limiting
  if (now - prevRequest < RATE_LIMIT) {
    if (Settings.isNotifications) {
      Spicetify.showNotification(
        `[AOTYfy] You are on cooldown. Please wait ${
          (RATE_LIMIT - (now - prevRequest)) / 1000
        } seconds to avoid hitting the rate limit.`,
      );
    }
    return;
  }

  isRefreshing = true;
  prevRequest = Date.now();

  console.log("[AOTYfy] Refreshing scores ...");
  update();
  if (Settings.isNotifications) Spicetify.showNotification(`[AOTYfy] Scores refreshed.`);
}

/**
 * fetches AOTY page URL and parses album/track API
 */
async function getAPI(
  meta: _Meta,
  firstIteration: boolean,
  type?: string | undefined,
  skipSimcheck: boolean = false,
): Promise<_Album | any> {
  // build search url
  const url = firstIteration
    ? `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(meta.artist.name + " " + meta.album.title)}`
    : `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(meta.album.title)}`;

  console.debug(`[AOTYfy] Fetching URL: ${url}`);

  const res = await fetch(url);
  const $$ = cheerio.load(res);

  // select album blocks with optional type filter
  const $albumBlocks = $$(type ? `div.albumBlock[data-type='${type}']` : "div.albumBlock");

  // parse all releases into structured objects
  const releases: ReleaseObject[] = $albumBlocks
    .map((_, el) => {
      const albumBlock = $$(el);
      const albumTitle = albumBlock.find(".albumTitle").text().trim() || "-1";
      const artistName = albumBlock.find(".artistTitle").text().trim() || "-1";
      const meta = albumBlock.find(".type").text().trim().toLowerCase() || "-1";
      const url = albumBlock.find("a:has(.albumTitle)").attr("href") || "-1";

      const [year, type] = meta.split(" • ");

      return {
        title: albumTitle,
        artist: artistName,
        type: type || "-1",
        year: parseInt(year, 10) || -1,
        url: url ? "https://www.albumoftheyear.org" + url : "-1",
      };
    })
    .get();

  console.debug(`[AOTYfy] Collected ${releases.length} releases:`);
  console.table(releases);

  // handle no results
  if (releases.length === 0) throw new APIError("[AOTYfy] Can't find anything on AOTY (not added on website/search failed)");

  let aotyUrl: string = "";

  if (skipSimcheck) {
    // skip similarity check
    aotyUrl = releases[0].url;
  } else if (releases.length === 1) {
    // single result - use it directly
    console.debug("[AOTYfy] Only one release found.");
    aotyUrl = releases[0].url;
  } else {
    // multiple results - find best match
    console.debug(`[AOTYfy] Multiple results (${releases.length}) found.`);

    const albumLower = meta.album.title.toLowerCase();
    const artistLower = meta.album.title.toLowerCase();

    // check if first result is exact match (most common case)
    if (releases[0].title.toLowerCase() === albumLower) {
      console.debug("[AOTYfy] Exact match found at first result");
      aotyUrl = releases[0].url;
    } else {
      console.debug("[AOTYfy] No exact match found at first result, checking similarities...");

      // calculate similarities for all releases
      const releasesWithSimilarity = releases.map((release) => ({
        ...release,
        artistSimilarity: similarity(release.artist.toLowerCase(), artistLower),
        albumSimilarity: similarity(release.title.toLowerCase(), albumLower),
      }));

      console.debug("[AOTYfy] Calculated similarities:");
      console.table(releasesWithSimilarity);

      // find the most similar artist
      const mostSimilarByArtist = releasesWithSimilarity.reduce((best, current) =>
        current.artistSimilarity > best.artistSimilarity ? current : best,
      );

      console.debug(`[AOTYfy] Most similar artist: ${mostSimilarByArtist.artist} (${mostSimilarByArtist.artistSimilarity})`);

      // group releases by artist to handle multiple albums from same artist
      const releasesByArtist = new Map<string, ReleaseObject[]>();
      for (const release of releasesWithSimilarity) {
        if (!releasesByArtist.has(release.artist)) {
          releasesByArtist.set(release.artist, []);
        }
        releasesByArtist.get(release.artist)!.push(release);
      }

      const artistReleases = releasesByArtist.get(mostSimilarByArtist.artist) || [];

      // if artist has multiple albums, find the most similar album
      if (artistReleases.length > 1) {
        const bestAlbumMatch = artistReleases.reduce((best, current) =>
          current.albumSimilarity! > best.albumSimilarity! ? current : best,
        );
        console.debug(`[AOTYfy] Multiple albums from artist, best match: ${bestAlbumMatch.title}`);
        aotyUrl = bestAlbumMatch.url;
      }
      // single album from most similar artist - check if similarity is sufficient (>30%)
      else if (mostSimilarByArtist.artistSimilarity > 0.3) {
        console.debug(`[AOTYfy] Found match with ${mostSimilarByArtist.artistSimilarity} similarity`);
        aotyUrl = mostSimilarByArtist.url;
      } else {
        console.error("[AOTYfy] No sufficient match found (similarity < 0.3)");
        throw new AOTYError("[AOTYfy] No close match found on AOTY.");
      }
    }
  }

  // validate url was found
  if (!aotyUrl || aotyUrl === "https://www.albumoftheyear.orgundefined") {
    // handle error cases based on response status
    switch (res.status) {
      case 500:
        throw new APIError(`[AOTYfy] AOTY or Proxy is down.`);
      case 200:
      case 530:
        throw new APIError("[AOTYfy] No release found on AOTY.");
      case 429:
        throw new APIError(`[AOTYfy] Request failed.`);
      default:
        throw new APIError(`[AOTYfy] Request failed.`);
    }
  }

  // fetch and parse the album page
  console.debug("[AOTYfy] Parsing URL: " + aotyUrl);
  const res2 = await fetch(aotyUrl);
  const $ = cheerio.load(res2);

  // album artist
  const albumArtist = $(`.albumHeadline .artist a`).text();

  // album rating count
  let userRatingsCount: any = $(`div.albumUserScoreBox > .numReviews > a > strong`).text() || "-1";
  let criticRatingsCount: any = $(`div.albumCriticScoreBox > span > meta[itemprop="reviewCount"]`).attr("content") || "-1";

  // if track ratings are enabled
  const checkIfTrackRatings = $("#tracklist .trackList td.trackRating:first > span").text();
  const verified = isNumeric(checkIfTrackRatings);

  // track data storage
  const Tracks: _Track[] = [];

  // parse tracklist if verified
  if (verified) {
    const numOfDiscs = $(".discNumber").length;
    const discCount = numOfDiscs > 0 ? numOfDiscs : 1;
    console.debug({ numOfDiscs, discCount });

    // find the longest disc to determine iteration count
    let longestDiscLength = 0;
    for (let i = 0; i < discCount; i++) {
      const trackListTable = $(".rightBox").find(".trackListTable").get(i);
      if (trackListTable) {
        const trackCount = $(trackListTable).children("tbody").children("tr").length;
        longestDiscLength = Math.max(longestDiscLength, trackCount);
      }
    }

    // process each disc
    let trackId = 0;
    for (let discIndex = 0; discIndex < discCount; discIndex++) {
      const trackListTable = $(".rightBox").find(".trackListTable").get(discIndex);
      if (!trackListTable) continue;

      const tracksInDisc = $(trackListTable).children("tbody").children("tr").length;

      // process each track in the disc
      for (let trackIndex = 0; trackIndex < tracksInDisc; trackIndex++) {
        const trackNumber = trackIndex + 1;

        // get track url element
        const URLElement = $(trackListTable).find(`tr:nth-child(${trackNumber}) td.trackTitle a`);
        const trackTitle = URLElement.text();

        const href = URLElement.attr("href");
        const trackURL = href ? `https://www.albumoftheyear.org${href}` : "https://www.albumoftheyear.org/song/undefined";

        // get rating element for this track
        const ratingElement = $(trackListTable).find(`tr:nth-child(${trackNumber}) > td.trackRating > span`);

        // parse rating and rating count
        const scoreText = ratingElement.text().trim();
        const score = scoreText ? parseFloat(scoreText) : -1;

        const ratingCountText = ratingElement.attr("title") || "0 Ratings";
        const ratingMatch = ratingCountText.match(/\d+/);
        const ratings = ratingMatch ? parseInt(ratingMatch[0], 10) : -1;

        // create track object
        const Track: _Track = {
          id: trackId++,
          title: trackTitle,
          artist: albumArtist,
          score: isNaN(score) ? -1 : score,
          ratings: isNaN(ratings) ? -1 : ratings,
          discNumber: discIndex,
          url: trackURL,
        };

        Tracks.push(Track);
      }
    }
  }

  // get album score
  userRatingsCount = Number(userRatingsCount.replace(",", ""));
  criticRatingsCount = Number(criticRatingsCount);

  const parseScore = (selector: string): number => {
    const value = $(selector).attr("title");
    return value ? parseFloat(parseFloat(value).toFixed(1)) : -1;
  };

  const userScore = parseScore(".albumUserScore a");
  const criticScore = parseScore('a[href="#critics"]');

  const albumInfoBox = $("div.albumTopBox.info");

  const yearRow = albumInfoBox
    .find(".detailRow")
    .filter((_, el) => {
      return $(el).text().includes("Release Date");
    })
    .first();

  const yearMatch = yearRow.text().match(/\b(\d{4})\b/);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : -1;

  const labelRow = albumInfoBox
    .find(".detailRow")
    .filter((_, el) => {
      return $(el).text().includes("Label");
    })
    .first();
  const labels: string[] = labelRow
    .find("a")
    .map((_, el) => $(el).text().trim())
    .get();

  const formatRow = albumInfoBox
    .find(".detailRow")
    .filter((_, el) => {
      return $(el).text().includes("Format");
    })
    .first();
  const format = formatRow.clone().children("span").remove().end().text().trim();

  // return response
  const Album: _Album = {
    ratings: {
      user: {
        score: userScore,
        ratings: userRatingsCount,
      },
      critic: {
        score: criticScore,
        ratings: criticRatingsCount,
      },
    },
    format: format,
    year: year,
    label: labels,
    url: aotyUrl,
    verified: verified,
    tracks: Tracks,
  };

  console.log(`[AOTYfy] API Response:`);
  console.log(Album);

  return Album;
}

async function update() {
  if (!Settings.isEnabled) {
    clearRating();
    return;
  }

  if (!Spicetify?.Player?.data) return;

  const playbackId = Spicetify.Player.data.playback_id ?? (Spicetify.Player.data as any).playbackId;
  if (!playbackId) return;

  const id = Spicetify.Player.data.playback_id ?? (Spicetify.Player.data as any).playbackId;

  // prevent duplicate requests for same track
  if (id === prevTrack && !isRefreshing) return;
  isRefreshing = false;

  // find info container element (try multiple selectors for compatibility)
  const infoContainerSelectors = [
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-trackInfo-container.ellipsis-one-line",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar.LibraryX > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
    "#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container",
  ];

  infoContainer = infoContainerSelectors
    .map((selector) => document.querySelector(selector))
    .find((element): element is HTMLElement => element instanceof HTMLElement);

  if (!infoContainer) return;
  clearRating();

  // prevent duplicate score elements bug
  if (document.getElementsByClassName("aotyfy-AlbumRating").length > 1) {
    clearRating();
  }
  if (document.getElementsByClassName("aotyfy-TrackRating").length > 1) {
    clearRating();
  }

  // parser arguments
  let releaseType: string | undefined;
  let skipSimcheck: boolean = false;
  let firstIteration: boolean = true;

  const raw = Spicetify.Player.data?.item?.metadata ?? Spicetify.Player.data?.track?.metadata;

  if (!raw) {
    throw new APIError(
      "Unable to retrieve player metadata. The version of the extension/Spotify you're using is outdated or broken.",
    );
  }

  // metadata object
  const Meta: _Meta = {
    uri: d(raw.entity_uri),
    cover: d(raw.image_url),
    duration: d(raw.duration),
    artist: {
      uri: d(raw.artist_uri),
      name: d(raw.artist_name),
    },
    album: {
      uri: d(raw.album_uri),
      title: d(raw.album_title),
      track: { number: d(raw.album_track_number) },
      disc: { number: d(raw.album_disc_number) },
    },
    track: {
      uri: d(raw.uri),
      title: d(raw.title),
    },
  };

  console.debug("[AOTYfy] Now Playing:");
  console.table([Meta.track.title, Meta.artist.name, Meta.album.title]);

  prevTrack = id;

  try {
    /*
     * SPECIFIC FIXES
     * artist/album/song specific fixes for edge cases.
     * feel free to contribute on github if you spot more of these.
     */

    // remove deluxe/remaster suffixes from album titles (with exceptions)
    const IGNORE_ARTISTS = ["Weezer", "SOPHIE", "Crystal Castles"];

    if (!IGNORE_ARTISTS.includes(Meta.artist.name)) {
      Meta.album.title = Meta.album.title.split(" -")[0];
      Meta.album.title = Meta.album.title.split(" (")[0];
      Meta.album.title = Meta.album.title.replace('"', "");
    }

    // specific album fixes
    if (Meta.album.title === "Teen Week" && Meta.artist.name === "Jane Remover") {
      Meta.album.title = "Teen Week [Abridged]";
    }

    if (Meta.album.title === "SOPHIE (EP)") {
      Meta.album.title = "SOPHIE";
      releaseType = "ep";
      skipSimcheck = true;
    }

    if (Meta.artist.name === "Invariance" && Meta.album.title === "Wish You Well / Album") {
      Meta.artist.name = Meta.album.title.replace(" / Album", "");
    }

    if (Meta.artist.name === "ATIVAN COREA" && Meta.album.title.startsWith("[][][][][][][][]")) {
      Meta.artist.name = "YAYAYI";
    }

    switch (Meta.artist.name) {
      case "Ms. Lauryn Hill":
        Meta.artist.name = "Lauryn Hill";
        break;
      case "RÜFÜS DU SOL":
        Meta.artist.name = "RÜFÜS";
        break;
    }

    // fetch AOTY data
    let Album: _Album = await getAPI(Meta, firstIteration, releaseType, skipSimcheck);
    let Track: _Track | undefined;

    // remove any duplicate rating elements
    ["aotyfy-AlbumRating", "aotyfy-TrackRating"].forEach((className) => {
      const elements = document.getElementsByClassName(className);
      Array.from(elements).forEach((element) => element.remove());
    });

    // add track ratings if available
    if (Album.verified && Album.tracks) {
      // find song title element (try multiple selectors for compatibility)
      const songTitleSelectors = [
        "#main > div > div.Root__top-container.Root__top-container--right-sidebar-visible > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > footer > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container.ellipsis-one-line > div.main-trackInfo-name.ellipsis-one-line.main-type-mesto > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar.LibraryX > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
        "#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div > div.main-nowPlayingBar-left > div > div.main-nowPlayingWidget-trackInfo.main-trackInfo-container > div.main-trackInfo-name > div > span > span > div > span",
      ];

      songTitleBox = songTitleSelectors
        .map((selector) => document.querySelector(selector))
        .find((element): element is HTMLElement => element instanceof HTMLElement);

      const discIndex = Number(Meta.album.disc.number) - 1;
      const trackIndex = Number(Meta.album.track.number) - 1;

      Track = Album.tracks?.find((t) => {
        // try multi-disc id only if not on first disc
        if (discIndex !== 0 && t.id === discIndex * 100 + trackIndex) return true;

        // try track index
        if (t.id === trackIndex) return true;

        // fallback to title match
        return t.title.toLowerCase() === Meta.track.title.toLowerCase();
      });

      if (songTitleBox) {
        if (Track) {
          const trackElement = document.createElement("a");
          trackElement.className = "aotyfy-TrackRating";
          setAppearance(Track.score, trackElement);

          trackElement.style.fontSize = "10px";
          trackElement.style.fontWeight = "bold";
          trackElement.style.paddingLeft = "5px";

          if (Track.score !== -1) {
            trackElement.title = `${Track.ratings} ratings`;
            trackElement.innerText = `[${Track.score.toFixed(0)}]`;
            trackElement.href = Track.url;

            songTitleBox.appendChild(trackElement);
          }
        } else {
          console.debug("[AOTYfy] Can't find song playing on the album tracklist.");
        }
      } else {
        throw new AOTYError(
          "[AOTYfy] Can't find NPV song element, probably an extension version you're using is outdated/broken.",
        );
      }
    }

    // render score card in Now Playing view
    if (Settings.showInSidebar) {
      waitForElement(".main-nowPlayingView-nowPlayingWidget")
        .then(async (el) => {
          let NPWidget = el as HTMLElement;

          if (!scoreCardContainer || !document.body.contains(scoreCardContainer)) {
            scoreCardContainer = document.createElement("div");
            NPWidget.insertAdjacentElement("afterend", scoreCardContainer);
          }

          const ScoreItem = (data: { score: number; ratings: number }) => ({
            score: data.score,
            ratings: data.ratings,
            url: Album.url,
          });

          ReactDOM.render(
            <ScoreCard
              critic={ScoreItem(Album.ratings.critic)}
              user={ScoreItem(Album.ratings.user)}
              album={Album}
              track={Track}
              meta={Meta}
            />,
            scoreCardContainer,
          );
        })
        .catch((e: Error) => {
          throw new AOTYError("[AOTYfy] Failed to find NPV Widget:\n" + e.message);
        });
    }

    // create score elements in Now Playing bar
    if (Settings.showInNowPlaying) {
      ratingContainer = document.createElement("a");

      const divContainer = document.createElement("div");
      divContainer.style.gridArea = "rating";
      divContainer.className = "aotyfy-AlbumRating";
      divContainer.appendChild(ratingContainer);

      let UserRating = Album.ratings.user;

      console.log(`[AOTYfy] Album: ${UserRating.score} / ${UserRating.ratings}`);
      ratingContainer.innerText = `${UserRating.score} (${UserRating.ratings} ratings)`;

      setAppearance(UserRating.score, ratingContainer);

      if (Album.ratings.user.ratings == 0) {
        ratingContainer.style.color = "var(--spice-extratext)";
        ratingContainer.innerText = `No Ratings.`;
      }

      ratingContainer.href = String(Album.url);
      ratingContainer.style.fontSize = "12px";

      infoContainer.style.gridTemplate =
        '"title title" "badges subtitle" "rating rating" "quality quality" "genres genres" / auto 1fr auto auto';

      infoContainer.appendChild(divContainer);
    }
  } catch (e: any) {
    throw new AOTYError(e.message);
  }
}

export default async function main() {
  while (!Spicetify.CosmosAsync || !Spicetify.showNotification) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  new Spicetify.Menu.SubMenu("AOTYfy", [
    new Spicetify.Menu.Item("Enabled", Settings.isEnabled, (self) => {
      Settings.isEnabled = !Settings.isEnabled;
      localStorage.setItem(SETTINGS_KEY, Settings.isEnabled);
      self.setState(Settings.isEnabled);
    }),
    new Spicetify.Menu.Item("Show In Sidebar", Settings.isNotifications, (self) => {
      Settings.showInSidebar = !Settings.showInSidebar;
      localStorage.setItem(SHOW_IN_SIDEBAR_KEY, Settings.showInSidebar);
      self.setState(Settings.showInSidebar);
    }),
    new Spicetify.Menu.Item("Show In Sidebar", Settings.isNotifications, (self) => {
      Settings.showInSidebar = !Settings.showInSidebar;
      localStorage.setItem(SHOW_IN_SIDEBAR_KEY, Settings.showInSidebar);
      self.setState(Settings.showInSidebar);
    }),
    new Spicetify.Menu.Item("Show Notifications", Settings.isNotifications, (self) => {
      Settings.isNotifications = !Settings.isNotifications;
      localStorage.setItem(NOTIFICATION_KEY, Settings.isNotifications);
      self.setState(Settings.isNotifications);
    }),
    new Spicetify.Menu.Item("Changelog", false, (self) => {
      showChangelog();
    }),
  ]).register();

  if (Settings.isEnabled) {
    let updateTimeout: number;
    let startupInterval: number;

    const tryUpdateUntilReady = () => {
      update().then(() => {
        if (document.querySelector(".scoreElement") || document.querySelector(".songScore")) {
          clearInterval(startupInterval);
        }
      });
    };

    await update();

    startupInterval = window.setInterval(tryUpdateUntilReady, 200);

    Player?.addEventListener("songchange", async () => {
      clearRating();

      clearTimeout(updateTimeout);
      updateTimeout = window.setTimeout(async () => {
        await update();
      }, 300);
    });
  }

  function showChangelog() {
    Spicetify.PopupModal.display({
      title: "[AOTYfy] Changelog",
      content: __CHANGELOG__,
      isLarge: true,
    });
  }

  // show changelog and apply new version in localstorage on start if installed extensions and stored version is different
  if (Settings.storedVersion !== __VERSION__) {
    showChangelog();
    Spicetify.LocalStorage.set(STORED_VERSION_KEY, __VERSION__);
    Settings.storedVersion = __VERSION__;
  }

  // adjust now playing bar height when loaded
  waitForElement("#main > div > div.Root__top-container > div.Root__now-playing-bar > aside > div").then((nowPlayingBar: any) => {
    nowPlayingBar.style.height = nowPlayingBar.offsetHeight + 5 + "px";
  });
}
