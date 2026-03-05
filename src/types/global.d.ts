declare namespace AOTYFY {
  interface _Elements {
    RatingContainer: JQuery<HTMLElement> | null
    ScoreCardContainer: JQuery<HTMLElement> | null
    SongTitleBox: JQuery<HTMLElement> | null
    InfoContainer: JQuery<HTMLElement> | null
  }

  interface _Album {
    valid: boolean
    ratings: {
      user: {
        score: number
        ratings: number
      };
      critic: {
        score: number
        ratings: number
      };
    };
    format: string
    year: number
    label: any[] | string
    url: string
    verified: boolean
    tracks?: Array<_Track>
  }

  interface _State {
    lock: boolean;
    cache: { uri: string | null; album: _Album | null };
    prev: { track: string | null; request: number };
  }

  interface _Meta {
    ctx: {
      uri: string;
    }
    artist: {
      uri: string;
      name: string;
    };
    album: {
      uri: string;
      title: string;
    };
    track: {
      uri: string;
      disc: number | null;
      number: number;
      title: string;
    };
    type: string | null;
    skipSimcheck: boolean;
  }

  interface _Track {
    id: number;
    title: string;
    artist: string[];
    score: number;
    ratings: number;
    discNumber: number;
    url: string;
  }

  interface _ScoreItem {
    score: number;
    ratings: number;
    url: string;
  }

  interface _TrackData {
    ratings: Map<number, string[]>;
    urls: Map<number, string[]>;
    ratingCounts: Map<number, string[]>;
  }

  interface _Release {
    title: string;
    artist: string;
    type: string;
    year: number;
    url: string;
    artistSimilarity?: number;
    albumSimilarity?: number;
  }
}