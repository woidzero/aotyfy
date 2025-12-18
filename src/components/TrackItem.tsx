// oxlint-disable no-unused-vars
const { React } = Spicetify;

import { _TrackItem } from "../types/global";
import { setAppearance } from "../utils";

export const TrackItem = ({ meta, track }: _TrackItem) => (
  <div
    className="aotyfy-SongItem"
    style={{
      display: "grid",
      backgroundColor: "var(--background-base)",
      gridTemplateColumns: "60px 1fr 60px",
      gridTemplateRows: "60px",
      alignItems: "center",
      padding: "15px",
      gap: "15px",
    }}
  >
    <div
      className="aotyfy-SongItem_cover"
      style={{
        height: "60px",
      }}
    >
      <img
        src={meta.cover}
        style={{
          borderRadius: "8px",
          width: "60px",
          height: "60px",
        }}
      />
    </div>
    <div
      className="aotyfy-SongItem-details"
      style={{
        width: "100%",
        display: "flex",
        flexWrap: "wrap",
        flexDirection: "column",
        alignItems: "start",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
    >
      <span
        id="title"
        style={{
          width: "100%",
          fontSize: "1rem",
          color: "var(--text-base)",
          fontWeight: "bold",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {track.title}
      </span>
      <span
        id="artist"
        style={{
          width: "100%",
          fontWeight: "bold",
          textOverflow: "ellipsis",
          overflow: "hidden",
        }}
      >
        {track.artist}
      </span>
    </div>
    <div
      className="aotyfy-SongItem-rating"
      onClick={() => window.open(track.url, "_blank", "noopener,noreferrer")}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "60px",
        alignItems: "center",
      }}
    >
      <div
        className="aotyfy-ScoreItem-score"
        style={{
          width: "60%",
        }}
      >
        <a
          id="score"
          style={{
            color: setAppearance(track.score),
            cursor: "pointer",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            textDecoration: "none",
            fontSize: "1.2rem",
          }}
        >
          {track.score === -1 ? "NR" : track.score}
        </a>
        <div
          id="bar"
          style={{
            position: "relative",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            width: "100%",
            height: "4px",
          }}
        >
          <span
            className="progress"
            style={{
              position: "absolute",
              width: track.score + "%",
              height: "4px",
              backgroundColor: setAppearance(track.score),
              left: "0",
            }}
          ></span>
        </div>
      </div>
      <span
        id="ratings"
        style={{
          textTransform: "uppercase",
          textAlign: "center",
          fontSize: "0.7rem",
          letterSpacing: "0.05rem",
          marginTop: "5px",
          width: "100%",
          opacity: "0.6",
        }}
      >
        ({track.ratings})
      </span>
    </div>
  </div>
);
