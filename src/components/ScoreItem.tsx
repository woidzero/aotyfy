// oxlint-disable no-unused-vars
const { React } = Spicetify;

import { _ScoreItem } from "../types/global";
import { setAppearance } from "../utils";

export const ScoreItem = ({ label, score, ratings, url }: _ScoreItem) => (
  <div
    className="e-91000-box e-91000-baseline e-91000-box--naked e-91000-box--browser-default-focus e-91000-box--padding-custom e-91000-box--min-size e-91000-Box-sc-8t9c76-0 Box-group-naked-listRow-minBlockSize_32px Box-sc-8t9c76-0 Box-group-naked-listRow-minBlockSize_32px"
    data-encore-id="listRow"
    role="group"
    style={{
      padding: "15px",
      width: "100%",
      textAlign: "center",
      backgroundColor: "var(--background-base)",
      borderRadius: "8px",
    }}
  >
    <div className="Areas__HeaderArea-sc-8gfrea-3 HeaderArea" style={{ justifyContent: "center" }}>
      <div className="Areas__InteractiveArea-sc-8gfrea-0 Areas__Column-sc-8gfrea-5 bJSfgC Column-sm">
        <span
          className="e-91000-text encore-text-body-small encore-internal-color-text-subdued"
          data-encore-id="text"
          style={{ textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.05rem" }}
        >
          {label + " "}
        </span>
        <a
          role="link"
          tabIndex={0}
          href={url}
          className="e-91000-text encore-text-body-medium"
          data-encore-id="text"
          style={{
            color: setAppearance(score),
            cursor: "pointer",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            width: "100%",
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontSize: "2.2rem",
            }}
          >
            {score === -1 ? "NR" : score}
          </span>
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
                width: score + "%",
                height: "4px",
                backgroundColor: setAppearance(score),
                left: "0",
              }}
            ></span>
          </div>
        </a>
        <span
          className="e-91000-text encore-text-body-small encore-internal-color-text-subdued"
          data-encore-id="text"
          style={{
            textTransform: "uppercase",
            fontSize: "0.7rem",
            letterSpacing: "0.05rem",
            marginTop: "5px",
            width: "100%",
            opacity: "0.6",
          }}
        >
          <small>({ratings === -1 ? "No" : ratings} ratings)</small>
        </span>
      </div>
    </div>
  </div>
);
