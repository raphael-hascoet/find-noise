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

// View builder owns BOTH node creation and layout
export type ViewBuilder<TData = unknown> = {
  buildNodes: (params: {
    data: TData;
    selectors: AlbumSelectors;
  }) => Map<string, ForceGraphNodeDef>;

  buildNodePositions: (params: {
    data: TData;
    dimensions: Map<string, ForceGraphDimensionsLoaded>;
  }) => Map<string, { x: number; y: number }>;
};

// View builders registry
export const viewBuilders = {
  albumsForArtist: {
    // Build node definitions for this view
    buildNodes: ({ data, selectors }) => {
      const { artistId, artistName } = data;
      const albums = selectors.byArtistMbid(artistId);

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
                variant: "no-artist",
              },
            },
          },
        ]),
      ]);
    },

    // Build layout positions for this view
    buildNodePositions: ({ data, dimensions }) => {
      const X_GAP = 50;
      const Y_GAP = 50;

      const MAX_ALBUMS_PER_ROW = 6;

      let nextX = 0;
      let nextY = 0;

      const positionMap = new Map<string, { x: number; y: number }>();
      positionMap.set(data.artistId, { x: 0, y: 0 }); // Center the artist

      nextY += (dimensions.get(data.artistId)?.height || 0) + Y_GAP;

      const albumsDimensions = data.albums
        .sort((a, b) => a.releaseYear.localeCompare(b.releaseYear))
        .map(({ id }) => ({ albumId: id, dimensions: dimensions.get(id) }))
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
  } satisfies ViewBuilder<{
    artistId: string;
    artistName: string;
    albums: {
      id: string;
      releaseYear: string;
    }[];
  }>,

  // Easy to add more views here:
  // circular: { ... },
  // grid: { ... },
  // forceDirected: { ... },
} as const;

// Active view configuration
export type ViewConfig<
  TKey extends keyof typeof viewBuilders = keyof typeof viewBuilders,
> = {
  key: TKey;
  data: Parameters<(typeof viewBuilders)[TKey]["buildNodes"]>[0]["data"];
};

const activeViewConfigAtom = atom<ViewConfig | null>(null);

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
  });
});

// Derived positions atom - automatically recalculates when dimensions or view changes
export const calculatedNodePositionsAtom = atom((get) => {
  const dimensions = get(forceGraphAllDimensionsLoadedAtom);
  const viewConfig = get(activeViewConfigAtom);

  if (!dimensions || !viewConfig) return null;

  const builder = viewBuilders[viewConfig.key];
  if (!builder) return null;

  return builder.buildNodePositions({
    data: viewConfig.data as any,
    dimensions,
  });
});

// Setter for changing the active view (drives both nodes and positions)
export const setActiveViewAtom = atom(null, (_get, set, config: ViewConfig) => {
  set(activeViewConfigAtom, config);
});

// Atom family for accessing node context by ID
export const nodeContextFamily = atomFamily((id: string) => {
  return atom((get) => {
    const nodeDefs = get(calculatedNodeDefsAtom);
    return nodeDefs?.get(id)?.context;
  });
});
