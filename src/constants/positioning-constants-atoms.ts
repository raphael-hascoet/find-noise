import { atom } from "jotai";
import { isMobileAtom } from "../utils/is-mobile";

export type ZoomConstants = {
  zoomPadding: number;
  minZoom: number;
  maxZoom: number;
};

export const zoomConstantsAtom = atom<ZoomConstants>((get) => {
  const isMobile = get(isMobileAtom);

  return !isMobile
    ? {
        zoomPadding: 100,
        minZoom: 0.1,
        maxZoom: 2,
      }
    : {
        zoomPadding: 25,
        minZoom: 0.2,
        maxZoom: 1.5,
      };
});

export type ViewsConstants = {
  search: {
    searchCount: number;
    maxPerRow: number;
  };
  home: {
    recsCount: number;
    maxPerRow: number;
  };
  albumsForArtist: {
    maxPerRow: number;
  };
  flowchart: {
    childrenPerExpand: number;
  };
};

export const viewsConstantsAtom = atom<ViewsConstants>((get) => {
  const isMobile = get(isMobileAtom);

  return !isMobile
    ? {
        search: {
          searchCount: 14,
          maxPerRow: 7,
        },
        home: {
          recsCount: 5,
          maxPerRow: 5,
        },
        albumsForArtist: {
          maxPerRow: 5,
        },
        flowchart: {
          childrenPerExpand: 5,
        },
      }
    : {
        search: {
          searchCount: 12,
          maxPerRow: 3,
        },
        home: {
          recsCount: 6,
          maxPerRow: 3,
        },
        albumsForArtist: {
          maxPerRow: 3,
        },
        flowchart: {
          childrenPerExpand: 3,
        },
      };
});
