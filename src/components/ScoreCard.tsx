// oxlint-disable no-unused-vars
const { React } = Spicetify;

import { _ScoreBox, _ScoreCard } from "../types/global";

import { ScoreItem } from "./ScoreItem";
import { TrackItem } from "./TrackItem";

export const ScoreCard = ({ critic, user, track, meta }: _ScoreCard) => (
  <div className="main-nowPlayingView-section main-nowPlayingView-aotyfy">
    <div className="main-nowPlayingView-sectionHeader">
      <h2 className="e-91000-text encore-text-body-medium-bold encore-internal-color-text-base" data-encore-id="text">
        <div className="main-nowPlayingView-sectionHeaderText">AOTY</div>
      </h2>
      <button
        className="Button-sc-1dqy6lx-0 Button-buttonTertiary-textSubdued-small-useBrowserDefaultFocusStyle-condensed encore-text-body-small-bold e-91000-overflow-wrap-anywhere e-91000-button-tertiary--condensed MWa0NhVSh7PShgCIptpl"
        data-encore-id="buttonTertiary"
        onClick={() => window.open(user.url, "_blank", "noopener,noreferrer")}
        style={
          {
            background: "transparent",
            outline: "none",
            border: "none",
            boxShadow: "none",
          } as React.CSSProperties
        }
      >
        Open Album
      </button>
    </div>
    <div
      className="main-nowPlayingView-sectionContent"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "15px",
        marginTop: "10px",
      }}
    >
      <div
        className="aotyfy-Content"
        style={{
          display: "flex",
          alignItems: "center",
          flexDirection: "row",
          gap: "15px",
        }}
      >
        <ScoreItem label="User Score" score={user.score} ratings={user.ratings} url={user.url} />
        <ScoreItem label="Critic Score" score={critic.score} ratings={critic.ratings} url={critic.url} />
      </div>
      {track && (
        <div className="aotyfy-Content">
          <TrackItem track={track} meta={meta} />
        </div>
      )}
    </div>
  </div>
);
