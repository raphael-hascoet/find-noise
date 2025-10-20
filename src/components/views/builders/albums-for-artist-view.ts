import * as d3 from "d3";
import type { Position } from "../../flowchart/flowchart-links";
import { type NodeDimensions } from "../../nodes/view-node-dimensions";
import { type ViewNodeDef } from "../../nodes/view-nodes-manager";
import type { ViewBuilder } from "../views-config";

export const albumsForArtistView: ViewBuilder<"albumsForArtist"> = {
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
        } as ViewNodeDef,
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

    let nextX = 0;
    let nextY = 0;

    const positionMap = new Map<string, Position>();
    positionMap.set(artistId, { x: 0, y: 0 });

    nextY +=
      (nodeDefsWithDimensions.get(artistId)?.dimensions.height || 0) + Y_GAP;

    const albumsDimensions = albums
      .sort((a, b) => a["release-date"].localeCompare(b["release-date"]))
      .map(({ mbid }) => ({
        albumId: mbid,
        dimensions: nodeDefsWithDimensions.get(mbid)?.dimensions,
      }))
      .filter(
        (d): d is { albumId: string; dimensions: NodeDimensions } =>
          !!d.dimensions,
      );

    let maxHeightOnRow = 0;

    albumsDimensions.forEach(({ albumId, dimensions }, index) => {
      positionMap.set(albumId, {
        x: nextX,
        y: nextY,
      });
      if ((index + 1) % MAX_ALBUMS_PER_ROW === 0) {
        nextY += maxHeightOnRow + Y_GAP;
        nextX = 0;
        maxHeightOnRow = dimensions.height;
      } else {
        nextX += dimensions.width + X_GAP;
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
};
