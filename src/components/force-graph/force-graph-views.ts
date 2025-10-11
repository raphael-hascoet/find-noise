import * as d3 from "d3";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import {
  albumDataSelectorsAtom,
  type Album,
} from "../../data/albums-pool-atoms";
import {
  simpleRecommendAlbums,
  type SimpleRecommendParams,
} from "../../data/get-albums-recommendations";
import {
  forceGraphAllDimensionsLoadedAtom,
  type ForceGraphDimensionsLoaded,
} from "./force-graph-dimensions";
import {
  addChildrenToNodeInTree,
  flattenNodeTreeToMap,
  removeChildrenFromNodeInTree,
  type ForceGraphNodeDef,
} from "./force-graph-nodes-manager";

// Album selectors type helper
export type AlbumSelectors = {
  byMbid: (mbid: string) => Album | undefined;
  byArtistMbid: (artistMbid: string) => Album[];
  byGenre: (genre: string) => Album[];
  byDescriptor: (d: string) => Album[];
  genresForAlbum: (mbid: string) => string[];
  allArtistKeys: () => string[];
  allGenres: () => string[];
  allDescriptors: () => string[];
  randomN: (n: number) => Album[];
  allAlbums: () => Album[];
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
      nodeTree?: ForceGraphNodeDef;
    };
    actions: {
      transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => void;
      addRecommendationsToNode?: ({
        albumMbid,
        params,
      }: {
        albumMbid: string;
        params: Omit<SimpleRecommendParams, "seed" | "all">;
      }) => void;
      removeChildrenFromNode?: ({
        parentId,
        childIds,
      }: {
        parentId: string;
        childIds: string[];
      }) => void;
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
    nodeDefs: Map<string, ForceGraphNodeDef>;
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
      const { albumMbid, nodeTree } = data;
      // If we already have a tree in state, flatten and return
      if (nodeTree) {
        return flattenNodeTreeToMap(nodeTree);
      }
      // Otherwise create initial root-only tree
      const album = selectors.byMbid(albumMbid);
      if (!album) return new Map();
      const root: ForceGraphNodeDef = {
        id: albumMbid,
        context: {
          type: "album",
          data: {
            artist: album["artist-mbid"],
            title: album.release,
            variant: "flowchart",
          },
        },
      };
      return flattenNodeTreeToMap(root);
    },

    buildNodePositions: ({ data, dimensions, nodeDefs }) => {
      const { albumMbid } = data;
      const positionMap = new Map<string, { x: number; y: number }>();

      const albumNode = nodeDefs.get(albumMbid);

      const albumDimensions = dimensions.get(albumMbid);

      if (!albumNode) {
        console.warn(`No node found for album MBID: ${albumMbid}`);
        return positionMap;
      }
      if (!albumDimensions) {
        console.warn(`No dimensions found for album MBID: ${albumMbid}`);
        return positionMap;
      }

      if (albumNode.children?.length === 0) {
        positionMap.set(albumMbid, { x: 0, y: 0 });
      }

      let lastX = 0;

      let y = (dimensions.get(albumMbid)?.height || 0) + 20;
      albumNode.children?.forEach(({ id }) => {
        const childDimensions = dimensions.get(id);
        if (childDimensions) {
          positionMap.set(id, {
            x: lastX,
            y,
          });
          lastX += childDimensions.width + 20; // Add width + margin
        }
      });

      const centeredPosition = (lastX - 20) / 2 - albumDimensions.width / 2; // Remove last margin

      positionMap.set(albumMbid, { x: centeredPosition, y: 0 });

      return positionMap;
    },

    buildActions: ({ changeView, selectors, data }) => {
      return {
        transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => {
          console.log("changeView: albumsForArtist", { artistId });
          changeView("albumsForArtist", { artistId });
        },
        addRecommendationsToNode: ({ albumMbid, params }) => {
          const seed = selectors.byMbid(albumMbid);
          if (!seed) return;

          const albums = selectors.allAlbums();

          const recommendations = simpleRecommendAlbums({
            ...params,
            seed,
            all: albums,
          });
          const currentRoot: ForceGraphNodeDef =
            data.nodeTree ??
            ({
              id: data.albumMbid,
              context: {
                type: "album",
                data: {
                  artist: seed["artist-mbid"],
                  title: seed.release,
                  variant: "flowchart",
                },
              },
            } as ForceGraphNodeDef);

          const newChildren: ForceGraphNodeDef[] = recommendations.map(
            (rec) =>
              ({
                id: rec.album.mbid,
                context: {
                  type: "album",
                  data: {
                    artist: rec.album["artist-mbid"],
                    title: rec.album.release,
                    variant: "flowchart",
                  },
                },
              }) as ForceGraphNodeDef,
          );

          const updated = addChildrenToNodeInTree(
            currentRoot,
            albumMbid,
            newChildren,
          );
          changeView("flowchart", { ...data, nodeTree: updated });
        },
        removeChildrenFromNode: ({ parentId, childIds }) => {
          if (!data.nodeTree) return;
          const updated = removeChildrenFromNodeInTree(
            data.nodeTree,
            parentId,
            childIds,
          );
          changeView("flowchart", { ...data, nodeTree: updated });
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
  const nodeDefs = get(calculatedNodeDefsAtom);

  if (!dimensions || !viewConfig || !nodeDefs) return null;

  const builder = viewBuilders[viewConfig.key];
  if (!builder) return null;

  return builder.buildNodePositions({
    data: viewConfig.data as any,
    selectors,
    dimensions,
    nodeDefs,
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
export const createViewActionsAtom = ({
  changeView,
}: {
  changeView: <K extends ViewKey>(key: K, data: ViewData<K>) => void;
}) => {
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
