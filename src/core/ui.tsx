const { React, ReactDOM } = Spicetify;

import { Selectors, setAppearance, waitElement } from "./dom";
import { valid } from "./utils";

import { ScoreCard } from "../components/ScoreCard";

import $ from "jquery";
import { CriticalError } from "./exceptions";

class Elements {
  public infoContainer!: JQuery<HTMLElement>;
  public songTitleBox!: JQuery<HTMLElement>;
  public playingBar!: JQuery<HTMLElement>;

  public NPWidget!: JQuery<HTMLElement> | null;

  public sidebarCardWrapper!: JQuery<HTMLElement>;
  public albumRatingContainer!: JQuery<HTMLElement>;
  public albumRating!: JQuery<HTMLElement>;
  public trackRating!: JQuery<HTMLElement>;

  async create(): Promise<void> {
    const [infoContainer, playingBar, songTitleBox, NPWidget] = await Promise.all([
      waitElement(Selectors.INFO_CONTAINER),
      waitElement(Selectors.PLAYING_BAR),
      waitElement(Selectors.SONG_TITLE_BOX),
      waitElement(Selectors.NOW_PLAYING_WIDGET),
    ]);

    if (!infoContainer || !playingBar) {
      throw new CriticalError("unable obtain required elements")
    }

    this.songTitleBox = songTitleBox;
    this.playingBar = playingBar;
    this.NPWidget = NPWidget;

    // sidebar wrapper
    this.sidebarCardWrapper = $("<div class='aotyfy-SidebarCardWrapper'></div>");

    // album rating container
    this.albumRating = $("<a class='aotyfy-AlbumRating'></a>").css({
      "font-size": "12px",
      "color": "var(--spice-extratext)"
    });

    this.albumRatingContainer = $("<div class='aotyfy-AlbumRatingContainer'></div>")
      .css({ "grid-area": "rating" })
      .append(this.albumRating);

    this.infoContainer = infoContainer.css(
      "grid-template",
      `"title title" "badges subtitle" "rating rating" "quality quality" "genres genres" / auto 1fr auto auto`
    ).append(this.albumRatingContainer);

    this.trackRating = $("<a class='aotyfy-TrackRating'></a>").css({
      "font-size": "10px",
      "font-weight": "bold",
      "padding-left": "5px"
    });
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
    const oldNode = $(Selectors.SONG_TITLE_BOX)[0];

    return new Promise<void>(resolve => {
      if (!oldNode) { resolve(); return; }

      const observer = new MutationObserver(() => {
        if (!document.contains(oldNode)) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 2000);
    });
  }

  /**
   * update track in Now Playing Bar
   */
  updateTrack(Track: AOTYFY._Track) {
    this.el.trackRating.detach();
    this.el.trackRating.show();

    if (!valid(Track.score)) {
      console.warn("[aotyfy] track score is invalid");
      return;
    }

    const songTitleBox = $(Selectors.SONG_TITLE_BOX);
    if (!songTitleBox.length) {
      console.warn("[aotyfy] unable to find song title box");
      return;
    }

    this.el.songTitleBox = songTitleBox;
    this.el.trackRating
      .text(`[${Track.score.toFixed(0)}]`)
      .attr("title", `${Track.ratings} ratings`)
      .attr("href", Track.url);

    setAppearance(Track.score, this.el.trackRating);
    this.el.songTitleBox.append(this.el.trackRating);
  }

  /**
   * update album in Now Playing Bar
   */
  updateAlbum(Album: AOTYFY._Album) {
    this.el.albumRatingContainer.show();

    if (!Album.ratings.user) {
      this.el.albumRating.text("No ratings").attr("href", "#");
      return;
    }

    this.el.albumRating
      .text(`${Album.ratings.user.score} (${Album.ratings.user.ratings} ratings)`)
      .attr("href", Album.url);

    setAppearance(Album.ratings.user.score, this.el.albumRating);
  }

  /**
   * update sidebar
   */
  updateSidebar(Album: AOTYFY._Album) {
    this.el.sidebarCardWrapper.show();

    if (!this.el.sidebarCardWrapper || !this.el.NPWidget) {
      console.warn("[aotyfy] unable to obtain sidebar");
      return;
    }

    if (document.body.contains(this.el.sidebarCardWrapper[0])) {
      console.info("[aotyfy] document contains widget, updating")
      ReactDOM.unmountComponentAtNode(this.el.sidebarCardWrapper[0])
    }

    this.el.NPWidget
      .after(this.el.sidebarCardWrapper)
      .css({
        "margin-bottom": "0"
      })

    const ScoreItem = (data: { score: number; ratings: number }): AOTYFY._ScoreItem => ({
      score: data.score,
      ratings: data.ratings,
      url: Album.url,
    });

    ReactDOM.render(
      <ScoreCard
        items={{
          critic: ScoreItem(Album.ratings.critic),
          user: ScoreItem(Album.ratings.user)
        }}
      />,
      this.el.sidebarCardWrapper[0]
    );
  }

  /**
   * hide
  */
  hideNBP() {
    this.el.trackRating.hide();
    this.el.albumRatingContainer.hide();
  }

  hideSidebar() {
    this.el.sidebarCardWrapper.hide();
  }

  hide() {
    this.el.trackRating.hide();
    this.el.albumRatingContainer.hide();
    this.el.sidebarCardWrapper.hide();
  }
}