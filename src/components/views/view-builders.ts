import type { Atom } from "jotai";
import { albumsForArtistView } from "./builders/albums-for-artist-view";
import { flowchartView } from "./builders/flowchart-view";
import { homeView } from "./builders/home-view";
import { searchView } from "./builders/search-view";
import type { ViewBuilder, ViewKey } from "./views-config";

export const viewBuilders = {
  albumsForArtist: albumsForArtistView,
  flowchart: flowchartView,
  home: homeView,
  search: searchView,
} as const satisfies {
  [K in ViewKey]: Atom<ViewBuilder<K>>;
};
