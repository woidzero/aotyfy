const { Spicetify } = Spicetify;

export interface _Album {
  [_: any]: any;
  ratings: {
    user: {
      score: number;
      ratings: number;
    };
    critic: {
      score: number;
      ratings: number;
    };
  };
  format: string;
  year: number;
  label: any[] | string;
  url: string;
  verified: boolean;
  tracks?: Array<_Track>;
}

export interface _Meta {
  uri: string;
  cover: string;
  duration: string;
  artist: {
    uri: string;
    name: string;
  };
  album: {
    uri: string;
    title: string;
    track: {
      number: string;
    };
    disc: {
      number: string;
    };
  };
  track: {
    uri: string;
    title: string;
  };
}

export interface _Track {
  id: number;
  title: string;
  artist: string;
  score: number;
  ratings: number;
  discNumber: number;
  url: string;
}

export interface _TrackItem {
  meta: _Meta;
  track: _Track;
}

export interface _ScoreBox {
  score: number;
  ratings: number;
  url: string;
}

export interface _ScoreItem {
  label: string;
  score: number;
  ratings: number;
  url: string;
}

export interface _ScoreCard {
  critic: Dict<number, number>;
  user: Dict<number, number>;
  track: _Track | undefined;
  album: _Album;
  meta: _Meta;
}

export interface _TrackData {
  ratings: Map<number, string[]>;
  urls: Map<number, string[]>;
  ratingCounts: Map<number, string[]>;
}

export interface ReleaseObject {
  title: string;
  artist: string;
  type: string;
  year: number;
  url: string;
  artistSimilarity?: number;
  albumSimilarity?: number;
}
