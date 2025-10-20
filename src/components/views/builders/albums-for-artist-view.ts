import * as d3 from "d3";
import { atom, type Atom } from "jotai";
import type { Position } from "../../flowchart/flowchart-links";
import { type ViewNodeDef } from "../../nodes/view-nodes-manager";
import {
  buildGridPositions,
  type GridPositionsNodeInput,
} from "../utils/build-utils";
import type { ViewBuilder } from "../views-config";

export const albumsForArtistView: Atom<ViewBuilder<"albumsForArtist">> = atom(
  () => ({
    buildNodes: ({ data: { artistId }, selectors }) => {
      const albums = selectors.byArtistMbid(artistId);
      const artistName = albums[0]?.artist || "";

      return new Map([
        [
          artistId,
          {
            id: artistId,
            context: {
              type: "artist",
              data: { name: artistName },
            },
          } satisfies ViewNodeDef,
        ],

        ...albums.map((album): [string, ViewNodeDef] => [
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

    buildNodePositions: ({
      data: { artistId },
      selectors,
      nodeDefsWithDimensions,
    }): Map<string, Position> => {
      const X_GAP = 50;
      const Y_GAP = 50;

      const albums = selectors.byArtistMbid(artistId);

      if (nodeDefsWithDimensions.size === 0) return new Map();

      const MAX_ALBUMS_PER_ROW = 6;

      let nextY = 0;

      let positionMap = new Map<string, Position>();
      positionMap.set(artistId, { x: 0, y: 0 });

      nextY +=
        (nodeDefsWithDimensions.get(artistId)?.dimensions.height || 0) + Y_GAP;

      const albumsDimensions = albums
        .sort((a, b) => a["release-date"].localeCompare(b["release-date"]))
        .map(({ mbid }) => ({
          id: mbid,
          dimensions: nodeDefsWithDimensions.get(mbid)?.dimensions,
        }))
        .filter((d): d is GridPositionsNodeInput => !!d.dimensions);

      const { positions: gridPositions } = buildGridPositions({
        nodes: albumsDimensions,
        maxPerRow: MAX_ALBUMS_PER_ROW,
        baseY: nextY,
        xGap: X_GAP,
        yGap: Y_GAP,
      });

      positionMap = new Map([...positionMap, ...gridPositions]);

      return positionMap;
    },

    buildActions: () => {
      return {};
    },

    transitionConfig: {
      duration: 800,
      ease: d3.easeCubicInOut,
    },
  }),
);
