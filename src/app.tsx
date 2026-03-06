import { __VERSION__ } from "./generated/extras";

import { UI } from "./core/ui";

import { AOTYFYError, CriticalError, RateLimitError } from "./core/exceptions";

import { getAPI, getTrack } from "./core/api";
import { getMeta } from "./core/metadata";
import { Settings } from "./core/settings";
import { showChangelog } from "./core/utils";

const { Player } = Spicetify;

/**
 * UI initialization
 */
let ui: UI;

/**
 * extension states
 */
const State: Record<string, any> = {
  lock: false,
  cache: {
    uri: null,
    album: null,
  },
  prev: {
    track: null,
    request: 0
  }
}

/**
 * button cooldown
 */
const RATE_LIMIT = 5000;

/**
 * refreshing scores
 */
async function refresh() {
  const now = Date.now();

  if (now - State.prev.request < RATE_LIMIT || State.lock) {
    throw new RateLimitError(`you're on cooldown. please wait ${(RATE_LIMIT - (now - State.prev.request)) / 1000} seconds.`);
  }

  State.prev.request = Date.now();
  State.prev.track = null;

  await update(true)
    .then(() => {
      Spicetify.showNotification("[aotyfy] Scores refreshed", false);
    });

  console.info("[aotyfy] scores refreshed");
}

/**
 * updating scores
 *
 * @param force defaults to true, will force to call new api request
 */
async function update(force: boolean = true) {
  // block parallel execution
  if (State.lock) return;
  State.lock = true;

  try {
    if (!Settings.isEnabled.value) {
      State.prev.track = null;
      ui.hide();
      return;
    }

    // collecting metadata from player
    const data = Spicetify.Player.data;
    if (!data) throw new Error("unable to retrieve player metadata");

    // fetch
    const Meta: AOTYFY._Meta = getMeta(data);
    console.debug("[aotyfy] fetched meta", Meta)

    // globals
    let Album: AOTYFY._Album;

    if (State.cache.uri === Meta.album.uri && !force) {
      Album = State.cache.album;
      console.debug("[aotyfy] cache", Album)
    } else {
      try {
        Album = await getAPI(Meta, true, force);

        if (!Album.valid && Settings.strict.value) {
          console.debug("[aotyfy] unable to find, trying again ...")
          Album = await getAPI(Meta, false)
        }

        // set album in cache
        State.cache.album = Album;
        State.cache.uri = Meta.album.uri;
      } catch (e: any) {
        ui.hide();
        State.cache.uri = null;
        State.cache.album = null;
        throw e instanceof AOTYFYError ? e : new CriticalError(`search failed: ${e.message}`);
      }
    }

    if (Settings.showNPB.value) {
      console.debug("[aotyfy] showing npb");
      ui.updateAlbum(Album);

      const Track = getTrack(Meta, Album);

      if (Track) {
        console.debug("[aotyfy] showing track npb");
        ui.updateTrack(Track);
      }
    } else {
      ui.hideNBP();
    }

    if (Settings.showSidebar.value) {
      console.debug("[aotyfy] showing sidebar")
      ui.updateSidebar(Album);
    } else {
      ui.hideSidebar()
    }
  } catch (e: any) {
    if (e instanceof AOTYFYError) throw e;
    throw new CriticalError(`updating failed: ${e.message}`);
  } finally {
    State.lock = false;
    console.info("[aotyfy] scores updated")
  }
}

export default async function main() {
  while (!Spicetify.CosmosAsync || !Spicetify.showNotification || !Spicetify.Player.data) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  new Spicetify.Menu.SubMenu("AOTYfy", [
    new Spicetify.Menu.Item("Enabled", Settings.isEnabled.get(), async (i) => {
      Settings.isEnabled.toggle(i);
      await update()
      Spicetify.showNotification("[aotyfy] Extension: " + (Settings.isEnabled.get() ? "enabled" : "disabled"));
    }),
    new Spicetify.Menu.Item("Show In Sidebar", Settings.showSidebar.get(), async (i) => {
      Settings.showSidebar.toggle(i);
      await update()
      Spicetify.showNotification("[aotyfy] Showing in sidebar: " + (Settings.showSidebar.get() ? "enabled" : "disabled"));
    }),
    new Spicetify.Menu.Item("Show In Now Playing Bar", Settings.showNPB.get(), async (i) => {
      Settings.showNPB.toggle(i);
      await update()
      Spicetify.showNotification("[aotyfy] Showing in now playing bar: " + (Settings.showNPB.get() ? "enabled" : "disabled"));
    }),
    new Spicetify.Menu.Item("Strict Search", Settings.strict.get(), async (i) => {
      Settings.strict.toggle(i);
      await update()
      Spicetify.showNotification("[aotyfy] Strict search: " + (Settings.strict.get() ? "enabled" : "disabled. Disabling this setting will allow extension to use only title instead of `title - artist` to search release."));
    }),
    new Spicetify.Menu.Item("Show Notifications", Settings.notifications.get(), (i) => {
      Settings.notifications.toggle(i);
      Spicetify.showNotification("[aotyfy] Notifications: " + (Settings.notifications.get() ? "enabled" : "disabled"));
    }),
    new Spicetify.Menu.Item("Refresh Scores", false, async () => {
      await refresh();
    }),
    new Spicetify.Menu.Item("Changelog", false, () => {
      showChangelog();
    }),
  ]).register();

  ui = new UI();
  await ui.init().catch((reason) => {
    throw new AOTYFYError(`something went wrong: ${reason}`, { show: true });
  });

  Player.addEventListener("songchange", async () => {
    if (!Settings.isEnabled.value) return;
    await ui!.waitForRerender();
    await update(false).catch((e) => {
      console.error("[aotyfy] songchange update failed:", e);
    });
  });

  if (Settings.isEnabled.value) {
    await update();
  } else {
    ui.hide();
  }

  // show changelog and apply new version in localstorage on start
  // if installed extensions and stored version is different
  if (Settings.version.get() !== __VERSION__) {
    Settings.version.set(__VERSION__);
    showChangelog();
  }
}
