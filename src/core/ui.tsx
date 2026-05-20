const { React, ReactDOM } = Spicetify;

import { Selectors, setAppearance, waitElement } from "./dom";
import { valid } from "./utils";

import { ScoreCard } from "../components/ScoreCard";

import { CriticalError } from "./exceptions";
import log from "./logger";

class Elements {
  public infoContainer!: HTMLElement;
  public songTitleBox!: HTMLElement;
  public playingBar!: HTMLElement;

  public NPWidget!: HTMLElement | null;

  public sidebarCardWrapper!: HTMLDivElement;
  public albumRatingContainer!: HTMLDivElement;
  public albumRating!: HTMLAnchorElement;
  public trackRating!: HTMLAnchorElement;

  async create(): Promise<void> {
    const [infoContainer, playingBar, songTitleBox, NPWidget] = await Promise.all([
      waitElement(Selectors.INFO_CONTAINER),
      waitElement(Selectors.PLAYING_BAR),
      waitElement(Selectors.SONG_TITLE_BOX),
      waitElement(Selectors.NOW_PLAYING_WIDGET),
    ]);

    if (!infoContainer || !playingBar) {
      throw new CriticalError("unable obtain required elements");
    }

    this.songTitleBox = songTitleBox;
    this.playingBar = playingBar;
    this.NPWidget = NPWidget;

    // sidebar wrapper
    this.sidebarCardWrapper = document.createElement("div");
    this.sidebarCardWrapper.className = "aotyfy-SidebarCardWrapper";
    this.sidebarCardWrapper.style.zIndex = "9999";

    // album rating
    this.albumRating = document.createElement("a");
    this.albumRating.className = "aotyfy-AlbumRating";
    this.albumRating.style.fontSize = "12px";
    this.albumRating.style.color = "var(--spice-extratext)";

    // album rating container
    this.albumRatingContainer = document.createElement("div");
    this.albumRatingContainer.className = "aotyfy-AlbumRatingContainer";
    this.albumRatingContainer.style.gridArea = "rating";
    this.albumRatingContainer.append(this.albumRating);

    this.infoContainer = infoContainer;
    this.infoContainer.style.gridTemplate =
      `"title title" "badges subtitle" "rating rating" "quality quality" "genres genres" / auto 1fr auto auto`;

    this.infoContainer.append(this.albumRatingContainer);

    // track rating
    this.trackRating = document.createElement("a");
    this.trackRating.className = "aotyfy-TrackRating";
    this.trackRating.style.fontSize = "10px";
    this.trackRating.style.fontWeight = "bold";
    this.trackRating.style.paddingLeft = "5px";
  }
}

export class UI {
  public el: Elements = new Elements();

  async init() {
    await this.el.create();
  }

  /**
   * waits for spotify to finish re-rendering the now playing bar
   * by observing the removal of the current song title node
   */
  async waitForRerender(): Promise<void> {
    const oldNode = document.querySelector(Selectors.SONG_TITLE_BOX);

    return new Promise<void>((resolve) => {
      if (!oldNode) {
        resolve();
        return;
      }

      const observer = new MutationObserver(() => {
        if (!document.contains(oldNode)) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 2000);
    });
  }

  /**
   * update track in Now Playing Bar
   */
  updateTrack(Track: AOTYFY._Track) {
    this.el.trackRating.remove();
    this.el.trackRating.style.display = "";

    if (!valid(Track.score)) {
      log.warn("track score is invalid");
      this.el.trackRating.style.display = "none";
      return;
    }

    const songTitleBox = document.querySelector<HTMLElement>(Selectors.SONG_TITLE_BOX);

    if (!songTitleBox) {
      log.warn("unable to find song title box");
      return;
    }

    this.el.songTitleBox = songTitleBox;

    this.el.trackRating.textContent = `[${Track.score.toFixed(0)}]`;
    this.el.trackRating.title = `${Track.ratings} ratings`;
    this.el.trackRating.href = Track.url;

    setAppearance(Track.score, this.el.trackRating);

    this.el.songTitleBox.append(this.el.trackRating);
  }

  /**
   * update album in Now Playing Bar
   */
  updateAlbum(Album: AOTYFY._Album) {
    this.el.albumRatingContainer.style.display = "";

    if (!valid(Album.ratings.user.ratings)) {
      this.el.albumRating.textContent = "No ratings";
      this.el.albumRating.href = "#";

      log.warn("no ratings for this release");
      return;
    }

    this.el.albumRating.textContent =
      `${Album.ratings.user.score} (${Album.ratings.user.ratings} ratings)`;

    this.el.albumRating.href = Album.url;

    setAppearance(Album.ratings.user.score, this.el.albumRating);
  }

  /**
   * update sidebar
   */
  updateSidebar(Album: AOTYFY._Album) {
    this.el.sidebarCardWrapper.style.display = "";

    if (!this.el.sidebarCardWrapper || !this.el.NPWidget) {
      log.warn("unable to obtain sidebar");
      return;
    }

    if (document.body.contains(this.el.sidebarCardWrapper)) {
      log.info("document contains widget, updating");
      ReactDOM.unmountComponentAtNode(this.el.sidebarCardWrapper);
    }

    this.el.NPWidget.insertAdjacentElement("afterend", this.el.sidebarCardWrapper);
    this.el.NPWidget.style.marginBottom = "0";

    const ScoreItem = (data: { score: number; ratings: number }): AOTYFY._ScoreItem => ({
      score: data.score,
      ratings: data.ratings,
      url: Album.url,
    });

    ReactDOM.render(
      <ScoreCard
        items={{
          critic: ScoreItem(Album.ratings.critic),
          user: ScoreItem(Album.ratings.user),
        }}
      />,
      this.el.sidebarCardWrapper,
    );
  }

  hideNBP() {
    this.el.trackRating.style.display = "none";
    this.el.albumRatingContainer.style.display = "none";
  }

  hideSidebar() {
    this.el.sidebarCardWrapper.style.display = "none";
  }

  hide() {
    this.el.trackRating.style.display = "none";
    this.el.albumRatingContainer.style.display = "none";
    this.el.sidebarCardWrapper.style.display = "none";
  }
}