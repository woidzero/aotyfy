const s = (v: unknown) => (v ?? "") as string;
const n = (v: unknown, fallback: any = 0) => (v != null && v !== "" ? Number(v) : fallback);

/**
 * build normalized metadata for a AOTY from raw spotify metadata
 * cleans and corrects artist and album information.
 *
 * @param raw Spicetify.Player.data
 */
export function getMeta(data: Record<string, any>): AOTYFY._Meta {
  const ctx = data?.context;
  const item = data?.item;
  const md = item?.metadata;

  const Meta: AOTYFY._Meta = {
    ctx: { uri: s(ctx?.uri) },
    artist: { uri: s(md?.artist_uri), name: s(md?.artist_name) },
    album: { uri: s(md?.album_uri), title: s(md?.album_title) },
    track: {
      uri: s(item?.uri),
      disc: n(md?.album_disc_number, null),
      number: n(md?.album_track_number),
      title: s(md?.title),
    },
    type: null,
    skipSimcheck: false
  };

  const IGNORE_ARTISTS = ["Weezer", "SOPHIE", "Crystal Castles", "underscores", "Ninajirachi", "slayr"];

  if (!IGNORE_ARTISTS.includes(Meta.artist.name)) {
    Meta.album.title = Meta.album.title.split(" -")[0];
    Meta.album.title = Meta.album.title.split(" (")[0];
    Meta.album.title = Meta.album.title.replace(/"/g, "");
  }

  if (Meta.album.title.endsWith(" / Album")) {
    Meta.album.title = Meta.album.title.replace(" / Album", "");
  }

  if (Meta.artist.name === "ATIVAN COREA" && Meta.album.title.startsWith("[][][][][][][][]")) {
    Meta.artist.name = "YAYAYI";
  }

  if (Meta.artist.name === "M.I.A." && Meta.album.title.startsWith("/\\/\\ /\\ Y /\\")) {
    Meta.album.title = "ΛΛ Λ Y Λ";
  }

  // fix by album uri
  switch (Meta.album.uri) {
    // JPEGMAFIA's 'LP! (Offline Version)' mismatch with 'OFFLINE!' ep
    case "spotify:album:3STQHyw2nOlIbb1FSgPse8":
      Meta.type = "lp";
      break;
    // McKinley Dixon's 'Beloved! Paradise! Jazz!?' mismatch with ep and song with same name
    case "spotify:album:3RDAqHBWBHXRwVSJF9T8VW":
      Meta.type = "lp";
      break;
    default:
      break;
  }

  // fix by artist name + album title
  switch (Meta.artist.name) {
    case "Tapir!":
      switch (Meta.album.title) {
        case "The Pilgrim, Their God and The King of My Decrepit Mountain":
          Meta.album.title = "The Pilgrim, Their God & The King Of My Decrepit Mountain";
          break;
      }
      break;
    case "Jane Remover":
      switch (Meta.album.title) {
        case "Teen Week":
          Meta.album.title = "Teen Week [Abridged]";
          break;
      }
      break;
    case "SOPHIE":
      switch (Meta.album.title) {
        case "SOPHIE (EP)":
          Meta.album.title = "SOPHIE";
          Meta.skipSimcheck = true;
          Meta.type = "ep";
          break;
      }
      switch (Meta.album.uri) {
        // product spotify reissue
        case "spotify:album:0JB2T1lOZ03obXXun0CLzY":
          Meta.type = "reissue";
          break;
      }
      break;
    case "David Bowie":
      switch (Meta.album.title) {
        case "Blackstar":
          Meta.type = "lp";
          break;
      }
      break;
    case "Car Seat Headrest":
      switch (Meta.album.title) {
        case "Twin Fantasy":
          Meta.album.title = "Twin Fantasy (Face to Face)";
          break;
      }
      break;
    case "Charli xcx":
      switch (Meta.album.title) {
        case "Vroom Vroom EP":
          Meta.album.title = "Vroom Vroom";
          break;
      }
      break;
    case "Radiohead":
      switch (Meta.album.title) {
        case "High & Dry / Planet Telex":
          Meta.album.title = "High & Dry";
          Meta.type = "single";
          break;
      }
      break;
    case "Ms. Lauryn Hill":
      Meta.artist.name = "Lauryn Hill";
      break;
    case "RÜFÜS DU SOL":
      Meta.artist.name = "RÜFÜS";
      break;
    case "slayr chive":
      Meta.artist.name = "slayr";
      break;
    case "лори.":
      Meta.artist.name = "lorie";
      break;
    case "dj galen":
      Meta.artist.name = "galen tipton";
      break;
  }

  return Meta;
}
