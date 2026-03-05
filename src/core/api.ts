import { similarity, isNumeric, extractStr } from "./utils";
import { APIError } from "./exceptions";
import { Settings } from "./settings";
import { Selectors } from "./dom";

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * anti-cors proxy
 *
 * TODO: host own instance at woid.world for security and perfomance reasons.
 */
const PROXY_URL = "https://proxy.life23243.workers.dev/";

/**
 * fetches from a url using a CORS proxy.
 *
 * @param url - the url to fetch content from
 * @returns promise resolving to the response data
 */
export async function request(url: string) {
  return axios.get(`${PROXY_URL}?${encodeURIComponent(url)}`);
}

/**
 * parse and scrap the album page
 */
async function parse(url: string) {
  try {
    // album response
    const Album: AOTYFY._Album = {
      valid: false,
      ratings: {
        user: {
          score: -1,
          ratings: -1,
        },
        critic: {
          score: -1,
          ratings: -1,
        },
      },
      format: "null",
      year: -1,
      label: "null",
      url: "null",
      verified: false,
      tracks: [],
    };

    // fetching
    const res = await request(url);
    const $ = cheerio.load(res.data);

    // album artist
    const albumArtist = $(".albumHeadline .artist a")
      .map((_, el) => $(el).text().trim())
      .get();

    // album rating count
    let userRatingsCount: string | number = $(Selectors.ALBUM_USER_RATINGS_COUNT).text() || "-1";
    let criticRatingsCount: string | number = $(Selectors.ALBUM_CRITIC_RATINGS_COUNT).attr("content") || "-1";

    // if track ratings are enabled
    const checkIfTrackRatings = $(Selectors.TRACKLIST_VERIFIED_TRACK_RATINGS).text();
    const verified = isNumeric(checkIfTrackRatings);

    // track data storage
    const Tracks: AOTYFY._Track[] = [];

    // parse tracklist if verified
    if (verified) {
      const numOfDiscs = $(".discNumber").length;
      const discCount = numOfDiscs > 0 ? numOfDiscs : 1;

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
          const URLElement = $(trackListTable).find(`tr:nth-child(${trackNumber}) td.trackTitle a:first`);
          const trackTitle = URLElement.text();

          const featuredArtists = $(trackListTable)
            .find(`tr:nth-child(${trackNumber}) td.trackTitle .featuredArtists a`)
            .map((_, el) => $(el).text().trim())
            .get();

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

          const artists = [...albumArtist, ...featuredArtists];

          // create track object
          const Track: AOTYFY._Track = {
            id: trackId++,
            title: trackTitle,
            artist: artists,
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
      return value ? Number(parseFloat(value).toFixed(1)) : -1;
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

    // response
    Album.ratings = {
      user: {
        score: userScore,
        ratings: userRatingsCount,
      },
      critic: {
        score: criticScore,
        ratings: criticRatingsCount,
      },
    }
    Album.format = format
    Album.year = year
    Album.label = labels
    Album.url = url
    Album.verified = verified
    Album.tracks = Tracks
    Album.valid = true

    console.log(`[aotyfy] api response:`, Album);
    return Album;
  } catch (e: any) {
    throw e;
  }
}

/**
 * fetches AOTY page URL and parses album/track API
 */
export async function getAPI(meta: AOTYFY._Meta, firstIteration: boolean = true): Promise<AOTYFY._Album> {
  /**
   * caching albums in local storage
   */
  const SAID = extractStr(/^spotify:album:(.+)$/, meta.album.uri);
  const Storage = Settings.storage.get()

  if (SAID && Storage) {
    const cachedAOTYID = Storage[SAID];
    const cachedUrl = `https://www.albumoftheyear.org/album/${cachedAOTYID}.php`;

    console.debug("[aotyfy] cached release", cachedAOTYID);

    try {
      return await parse(cachedUrl);
    } catch (e) {
      const map = Settings.storage.get();

      delete map[SAID];
      Settings.storage.set(map);

      console.warn("[aotyfy] cached release is broken, removed: ", cachedAOTYID);
    }
  }

  const url = firstIteration
    ? `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(meta.artist.name + " " + meta.album.title)}`
    : `https://www.albumoftheyear.org/search/albums/?q=${encodeURIComponent(meta.album.title)}`;

  const res = await request(url);
  const $$ = cheerio.load(res.data);

  // select album blocks with optional type filter
  const $albumBlocks = $$(meta.type ? `div.albumBlock[data-type='${meta.type}']` : "div.albumBlock");

  // parse all releases into structured object
  const releases: AOTYFY._Release[] = $albumBlocks
    .map((_, el) => {
      const albumBlock = $$(el);
      const albumTitle = albumBlock.find(".albumTitle").text().trim();
      const artistName = albumBlock.find(".artistTitle").text().trim();
      const typeText = albumBlock.find(".type").text().trim().toLowerCase();
      const href = albumBlock.find("a:has(.albumTitle)").attr("href");

      const [yearStr, type] = typeText.split(" • ");
      const year = parseInt(yearStr ?? "", 10);

      if (!href) return null;

      return {
        title: albumTitle,
        artist: artistName,
        type: type ?? "",
        year: Number.isNaN(year) ? -1 : year,
        url: "https://www.albumoftheyear.org" + href,
      };
    })
    .get()
    .filter((r): r is AOTYFY._Release => r != null);

  // handle no results
  if (releases.length === 0) {
    throw new APIError("unable to find anything on AOTY for this release");
  }

  let aotyURL: string = "";

  if (meta.skipSimcheck) {
    // skip similarity check
    aotyURL = releases[0].url;
  } else if (releases.length === 1) {
    // single result - use it directly
    console.debug("[aotyfy] only one release found");
    aotyURL = releases[0].url;
  } else {
    // multiple results - find best match
    console.debug(`[aotyfy] multiple results (${releases.length}) found`);

    const albumLower = meta.album.title.toLowerCase();
    const artistLower = meta.artist.name.toLowerCase();

    // check if first result is exact match (most common case)
    if (releases[0].title.toLowerCase() === albumLower) {
      console.debug("[AOTYfy] exact match found at first result");
      aotyURL = releases[0].url;
    } else {
      console.debug("[AOTYfy] no exact match found at first result, checking similarities...");

      // calculate similarities for all releases
      const releasesWithSimilarity = releases.map((release) => ({
        ...release,
        artistSimilarity: similarity(release.artist.toLowerCase(), artistLower),
        albumSimilarity: similarity(release.title.toLowerCase(), albumLower),
      }));

      // find the most similar artist
      const mostSimilarByArtist = releasesWithSimilarity.reduce((best, current) =>
        current.artistSimilarity > best.artistSimilarity ? current : best,
      );

      console.debug(`[AOTYfy] most similar artist: ${mostSimilarByArtist.artist} (${mostSimilarByArtist.artistSimilarity})`);

      // group releases by artist to handle multiple albums from same artist
      const releasesByArtist = new Map<string, AOTYFY._Release[]>();
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
        console.debug(`[aotyfy] multiple albums from artist, best match: ${bestAlbumMatch.title}`);
        aotyURL = bestAlbumMatch.url;
      }
      // single album from most similar artist - check if similarity is sufficient (>30%)
      else if (mostSimilarByArtist.artistSimilarity > 0.3) {
        console.debug(`[aotyfy] found match with ${mostSimilarByArtist.artistSimilarity} similarity`);
        aotyURL = mostSimilarByArtist.url;
      } else {
        throw new APIError("no sufficient match found (similarity < 0.3)");
      }
    }
  }

  // invalid url & error handling
  if (!aotyURL || aotyURL === "https://www.albumoftheyear.orgundefined") {
    let msg: string;

    switch (res.status) {
      case 500:
        msg = "AOTY or proxy is down, extension is probably outdated.";
        break;
      case 403:
        msg = `request forbidden`;
        break;
      default:
        msg = "unknown error";
        break;
    }

    throw new APIError(msg);
  }

  const album = await parse(aotyURL);

  // save mapping
  if (SAID) {
    const aotyId = extractStr(/\/album\/(\d+)/, aotyURL);

    if (aotyId) {
      const map = Settings.storage.get();
      map[SAID] = aotyId;
      Settings.storage.set(map);

      console.debug("[aotyfy] cached release: ", SAID, "->", aotyId);
    } else {
      console.warn(`[aotyfy] can't extract 'aotyId': ${aotyId}`)
    }
  }

  return album;
}

/**
 * get track from cached album data
 */
export function getTrack(meta: AOTYFY._Meta, album: AOTYFY._Album): AOTYFY._Track | null {
  if (!album.tracks || album.tracks.length === 0) {
    console.warn("[aotyfy] release doesn't contain any tracks")
    return null;
  }

  const discIndex = (meta.track.disc ?? 1) - 1;
  const trackIndex = meta.track.number - 1;

  const discs = album.tracks.reduce<Record<number, typeof album.tracks>>((acc, t: AOTYFY._Track) => {
    (acc[t.discNumber] ??= []).push(t);
    return acc;
  }, {});

  const discTracks = discs[discIndex];
  if (!discTracks || !discTracks[trackIndex]) {
    throw new APIError("unable to find this track")
  }

  return discTracks[trackIndex] ?? album.tracks.find((t) => t.title.toLowerCase() === meta.track.title.toLowerCase());
}
