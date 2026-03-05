const { React } = Spicetify;
import { ScoreItem } from "./ScoreItem";

export const ScoreCard = ({ items }: { items: Record<string, AOTYFY._ScoreItem> }) => (
  <div className="main-nowPlayingView-section main-nowPlayingView-aotyfy">
    <div className="main-nowPlayingView-sectionHeader">
      <h2 className="e-91000-text encore-text-body-medium-bold encore-internal-color-text-base" data-encore-id="text">
        <div className="main-nowPlayingView-sectionHeaderText">AOTY</div>
      </h2>
      <button
        className="Button-sc-1dqy6lx-0 Button-buttonTertiary-textSubdued-small-useBrowserDefaultFocusStyle-condensed encore-text-body-small-bold e-91000-overflow-wrap-anywhere e-91000-button-tertiary--condensed MWa0NhVSh7PShgCIptpl"
        data-encore-id="buttonTertiary"
        onClick={() => window.open(items.user.url, "_blank", "noopener,noreferrer")}
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
        <ScoreItem label="User Score" score={items.user.score} ratings={items.user.ratings} url={items.user.url} />
        <ScoreItem label="Critic Score" score={items.critic.score} ratings={items.critic.ratings} url={items.critic.url} />
      </div>
    </div>
  </div>
);
