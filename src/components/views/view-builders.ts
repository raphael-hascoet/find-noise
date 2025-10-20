import { albumsForArtistView } from "./builders/albums-for-artist-view";
import { flowchartView } from "./builders/flowchart-view";
import type { ViewBuilder, ViewKey } from "./views-config";

export const viewBuilders = {
  albumsForArtist: albumsForArtistView,
  flowchart: flowchartView,
} as const satisfies {
  [K in ViewKey]: ViewBuilder<K>;
};
