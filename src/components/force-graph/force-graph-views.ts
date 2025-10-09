import * as d3 from "d3";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import {
  albumDataSelectorsAtom,
  type Album,
} from "../../data/albums-pool-atoms";
import {
  forceGraphAllDimensionsLoadedAtom,
  type ForceGraphDimensionsLoaded,
} from "./force-graph-dimensions";
import { type ForceGraphNodeDef } from "./force-graph-nodes-manager";

// Album selectors type helper
type AlbumSelectors = {
  byMbid: (mbid: string) => Album | undefined;
  byArtistMbid: (artistMbid: string) => Album[];
  byGenre: (genre: string) => Album[];
  byDescriptor: (d: string) => Album[];
  genresForAlbum: (mbid: string) => string[];
  allArtistKeys: () => string[];
  allGenres: () => string[];
  allDescriptors: () => string[];
  randomN: (n: number) => Album[];
};

type ViewKeyToDefinition = {
  albumsForArtist: {
    data: {
      artistId: string;
    };
    actions: {
      transitionToFlowchart: ({ albumId }: { albumId: string }) => void;
    };
  };
  flowchart: {
    data: {
      albumMbid: string;
    };
    actions: {
      transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => void;
    };
  };
};

export type ViewKey = keyof ViewKeyToDefinition;

export type ViewData<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["data"]
  : never;

export type ViewActions<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["actions"]
  : never;

// View builder owns BOTH node creation and layout
export type ViewBuilder<Key extends ViewKey> = {
  buildNodes: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
  }) => Map<string, ForceGraphNodeDef>;

  buildNodePositions: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    dimensions: Map<string, ForceGraphDimensionsLoaded>;
  }) => Map<string, { x: number; y: number }>;

  buildActions: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => void;
  }) => ViewActions<Key>;

  transitionConfig?: {
    duration: number;
    ease?: (t: number) => number;
  };
};

// View builders registry
export const viewBuilders = {
  albumsForArtist: {
    // Build node definitions for this view
    buildNodes: ({ data: { artistId }, selectors }) => {
      const albums = selectors.byArtistMbid(artistId);
      const artistName = albums[0]?.artist || "";

      return new Map([
        // Artist node
        [
          artistId,
          {
            id: artistId,
            context: {
              type: "artist",
              data: { name: artistName },
            },
          } as ForceGraphNodeDef,
        ],
        // Album nodes
        ...albums.map((album): [string, ForceGraphNodeDef] => [
          album.mbid,
          {
            id: album.mbid,
            context: {
              type: "album",
              data: {
                artist: album["artist-mbid"],
                title: album.release,
                variant: "albumsForArtist",
              },
            },
          },
        ]),
      ]);
    },

    // Build layout positions for this view
    buildNodePositions: ({ data: { artistId }, selectors, dimensions }) => {
      const X_GAP = 50;
      const Y_GAP = 50;

      const albums = selectors.byArtistMbid(artistId);

      if (dimensions.size === 0) return new Map();

      const MAX_ALBUMS_PER_ROW = 6;

      let nextX = 0;
      let nextY = 0;

      const positionMap = new Map<string, { x: number; y: number }>();
      positionMap.set(artistId, { x: 0, y: 0 }); // Center the artist

      nextY += (dimensions.get(artistId)?.height || 0) + Y_GAP;

      const albumsDimensions = albums
        .sort((a, b) => a["release-date"].localeCompare(b["release-date"]))
        .map(({ mbid }) => ({
          albumId: mbid,
          dimensions: dimensions.get(mbid),
        }))
        .filter(
          (
            d,
          ): d is { albumId: string; dimensions: ForceGraphDimensionsLoaded } =>
            !!d.dimensions,
        );

      let maxHeightOnRow = 0;

      albumsDimensions.forEach(({ albumId, dimensions }, index) => {
        positionMap.set(albumId, {
          x: nextX,
          y: nextY,
        });
        if ((index + 1) % MAX_ALBUMS_PER_ROW === 0) {
          nextY += maxHeightOnRow + Y_GAP; // Move down for the next row
          nextX = 0; // Reset X position
          maxHeightOnRow = dimensions.height;
        } else {
          nextX += dimensions.width + X_GAP; // Add width of the album card + margin
          maxHeightOnRow = Math.max(maxHeightOnRow, dimensions.height);
        }
      });

      return positionMap;
    },

    buildActions: ({ changeView }) => {
      return {
        transitionToFlowchart: ({ albumId }: { albumId: string }) => {
          changeView("flowchart", { albumMbid: albumId });
        },
      };
    },

    transitionConfig: {
      duration: 800,
      ease: d3.easeCubicInOut,
    },
  },
  flowchart: {
    buildNodes: ({ data, selectors }) => {
      const { albumMbid } = data;

      const album = selectors.byMbid(albumMbid);
      if (!album) return new Map();

      const nodeMap = new Map<string, ForceGraphNodeDef>();
      nodeMap.set(albumMbid, {
        id: albumMbid,
        context: {
          type: "album",
          data: {
            artist: album["artist-mbid"],
            title: album.release,
            variant: "flowchart",
          },
        },
      });

      return nodeMap;
    },

    buildNodePositions: ({ data, dimensions }) => {
      const { albumMbid } = data;
      const positionMap = new Map<string, { x: number; y: number }>();

      // Center the album at (0, 0)
      positionMap.set(albumMbid, { x: 0, y: 0 });

      return positionMap;
    },

    buildActions: ({ changeView }) => {
      return {
        transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => {
          changeView("albumsForArtist", { artistId });
        },
      };
    },

    transitionConfig: {
      duration: 800,
      ease: d3.easeCubicInOut,
    },
  },
} as const satisfies {
  [K in ViewKey]: ViewBuilder<K>;
};

// Active view configuration
export type ViewConfig<TKey extends ViewKey = ViewKey> = {
  key: TKey;
  data: ViewData<TKey>;
};

const activeViewConfigAtom = atom<ViewConfig | null>(null);
export const activeViewConfigReadOnlyAtom = atom((get) =>
  get(activeViewConfigAtom),
);

// Derived node defs - automatically rebuilds when view changes
export const calculatedNodeDefsAtom = atom((get) => {
  const viewConfig = get(activeViewConfigAtom);
  const selectors = get(albumDataSelectorsAtom);

  if (!viewConfig || !selectors) return null;

  const builder = viewBuilders[viewConfig.key];
  if (!builder) return null;

  return builder.buildNodes({
    data: viewConfig.data as any,
    selectors,
  }) as Map<string, ForceGraphNodeDef>;
});

// Derived positions atom - automatically recalculates when dimensions or view changes
export const calculatedNodePositionsAtom = atom((get) => {
  const selectors = get(albumDataSelectorsAtom);
  const dimensions = get(forceGraphAllDimensionsLoadedAtom);
  const viewConfig = get(activeViewConfigAtom);

  if (!dimensions || !viewConfig) return null;

  const builder = viewBuilders[viewConfig.key];
  if (!builder) return null;

  return builder.buildNodePositions({
    data: viewConfig.data as any,
    selectors,
    dimensions,
  });
});

export type ViewActionsAtomOutput<K extends ViewKey> = {
  key: K;
  actions: K extends keyof ViewKeyToDefinition
    ? ViewKeyToDefinition[K]["actions"]
    : never;
};

export const isViewActionsForKey = <K extends ViewKey>(
  obj: ViewActionsAtomOutput<ViewKey> | null | undefined,
  key: K,
): obj is ViewActionsAtomOutput<K> => {
  return obj?.key === key;
};

// Factory to create view actions with proper changeView callback
export const createViewActionsAtom = (
  changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => void,
) => {
  return atom((get) => {
    const viewConfig = get(activeViewConfigAtom);
    if (!viewConfig) return null;

    const builder = viewBuilders[viewConfig.key];
    if (!builder) return null;

    return {
      key: viewConfig.key,
      actions: builder.buildActions({
        data: viewConfig.data as any,
        selectors: get(albumDataSelectorsAtom),
        changeView,
      }),
    } as ViewActionsAtomOutput<ViewKey>;
  });
};

// Setter for changing the active view (drives both nodes and positions)
export const setActiveViewAtom = atom(null, (get, set, config: ViewConfig) => {
  const currentNodeDefs = get(calculatedNodeDefsAtom);
  if (currentNodeDefs) {
    set(transitioningNodesAtom, currentNodeDefs);
  }
  set(activeViewConfigAtom, config);
});

// Atom family for accessing node context by ID
export const nodeContextFamily = atomFamily((id: string) => {
  return atom((get) => {
    const nodeDefs = get(calculatedNodeDefsAtom);
    return nodeDefs?.get(id)?.context;
  });
});

export const transitioningNodesAtom = atom<Map<string, ForceGraphNodeDef>>();

export const transitioningNodesFamily = atomFamily((id: string) => {
  return atom((get) => {
    const transitioningNodes = get(transitioningNodesAtom);
    return transitioningNodes?.get(id);
  });
});
