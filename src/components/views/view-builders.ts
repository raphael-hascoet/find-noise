import * as d3 from "d3";
import {
  simpleRecommendAlbums,
  type SimpleRecommendParams,
} from "../../data/get-albums-recommendations";
import type { Position } from "./flowchart/flowchart-links";
import { type NodeDimensions } from "./nodes/view-node-dimensions";
import {
  addChildrenToNodeInTree,
  flattenNodeTreeToMap,
  removeChildrenFromNodeInTree,
  type ViewNodeDef,
} from "./nodes/view-nodes-manager";
import type { ViewBuilder, ViewKey } from "./views-config";

type NodeDefWithDimensions = {
  nodeDef: ViewNodeDef;
  dimensions: NodeDimensions;
};

export const viewBuilders = {
  albumsForArtist: {
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
  },
  flowchart: {
    buildNodes: ({ data, selectors }) => {
      const { albumMbid, nodeTree } = data;

      if (nodeTree) {
        return flattenNodeTreeToMap(nodeTree);
      }

      const album = selectors.byMbid(albumMbid);
      if (!album) return new Map();
      const root: ViewNodeDef = {
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

    buildNodePositions: ({
      data,
      nodeDefsWithDimensions,
    }): Map<string, Position> => {
      const MARGIN_X_NODES = 100;
      const MARGIN_Y_NODES = 350;

      const { albumMbid } = data;
      const positionMap = new Map<string, Position>();

      const albumNode = nodeDefsWithDimensions.get(albumMbid);

      if (!albumNode) {
        console.warn(`No node found for album MBID: ${albumMbid}`);
        return positionMap;
      }

      if (!albumNode.nodeDef.children?.length) {
        positionMap.set(albumMbid, { x: 0, y: 0 });
        return positionMap;
      }

      const widthRequiredPerNode = new Map<string, number>();
      const heightPerDepth: number[] = [];

      const handleChildrenWidthReqs = ({
        node,
        depth = 0,
      }: {
        node: NodeDefWithDimensions;
        depth?: number;
      }): {
        widthRequired: number;
      } => {
        if (!node.nodeDef.children?.length) {
          const extremityWidthRequired = node.dimensions.width ?? 0;
          widthRequiredPerNode.set(node.nodeDef.id, extremityWidthRequired);
          return { widthRequired: extremityWidthRequired };
        }

        heightPerDepth[depth] = Math.max(
          heightPerDepth[depth] ?? 0,
          node.dimensions?.height ?? 0,
        );

        let widthRequired = 0;
        node.nodeDef.children.forEach((child) => {
          const childNode = nodeDefsWithDimensions.get(child.id);
          if (!childNode)
            throw new Error(`Child node missing in defs: ${child.id}`);

          const { widthRequired: childWidthRequired } = handleChildrenWidthReqs(
            { node: childNode, depth: depth + 1 },
          );
          widthRequired += childWidthRequired;
        });

        widthRequired += MARGIN_X_NODES * (node.nodeDef.children.length - 1);

        widthRequiredPerNode.set(node.nodeDef.id, widthRequired);

        return { widthRequired };
      };

      handleChildrenWidthReqs({
        node: albumNode,
      });

      let yForDepth: number[] = [0];

      heightPerDepth.forEach((heightForDepth, depth) => {
        yForDepth[depth + 1] =
          yForDepth[depth] + heightForDepth + MARGIN_Y_NODES;
      });
      const handlePositionsForNodes = ({
        nodeDef,
        originPos = { x: 0, y: 0 },
        depth = 0,
      }: {
        nodeDef: ViewNodeDef;
        originPos?: Position;
        depth?: number;
      }) => {
        if (!nodeDef.children?.length) {
          positionMap.set(nodeDef.id, originPos);
          return;
        }

        const childrenY = yForDepth[depth + 1] ?? 0;

        let nextX = originPos.x;

        nodeDef.children?.forEach((child) => {
          const childOriginPos = {
            x: nextX,
            y: childrenY,
          };

          handlePositionsForNodes({
            nodeDef: child,
            originPos: childOriginPos,
            depth: depth + 1,
          });

          nextX += (widthRequiredPerNode.get(child.id) ?? 0) + MARGIN_X_NODES;
        });

        let centeredPosition: number;

        if (nodeDef.children.length % 2 !== 0) {
          const idx = Math.floor((nodeDef.children.length + 1) / 2 - 1);

          centeredPosition = positionMap.get(nodeDef.children[idx].id)?.x ?? 0;
        } else {
          const idx1 = Math.floor(nodeDef.children.length / 2);
          const idx2 = idx1 + 1;

          const width1 =
            nodeDefsWithDimensions.get(nodeDef.children[idx1].id)?.dimensions
              .width ?? 0;
          const width2 =
            nodeDefsWithDimensions.get(nodeDef.children[idx2].id)?.dimensions
              .width ?? 0;

          const pos1 = positionMap.get(nodeDef.children[idx1].id)?.x ?? 0;
          const pos2 = positionMap.get(nodeDef.children[idx2].id)?.x ?? 0;

          const center1 = pos1 + width1 / 2;
          const center2 = pos2 + width2 / 2;

          centeredPosition = (center1 + center2) / 2;
        }
        positionMap.set(nodeDef.id, {
          x: centeredPosition,
          y: yForDepth[depth] ?? 0,
        });
      };

      handlePositionsForNodes({ nodeDef: albumNode.nodeDef });

      return positionMap;
    },

    buildActions: ({ changeView, selectors, data }) => {
      return {
        transitionToAlbumsForArtist: ({ artistId }: { artistId: string }) => {
          changeView("albumsForArtist", { artistId });
        },
        addRecommendationsToNode: ({
          albumMbid,
          params,
        }: {
          albumMbid: string;
          params: Omit<SimpleRecommendParams, "seed" | "all">;
        }) => {
          const seed = selectors.byMbid(albumMbid);
          if (!seed) return;

          let existingIds: string[] | undefined = undefined;
          if (data.nodeTree) {
            const flattenedTree = flattenNodeTreeToMap(data.nodeTree);
            existingIds = Array.from(flattenedTree.keys());
          }

          const albums = selectors.allAlbums();

          const recommendations = simpleRecommendAlbums({
            ...params,
            seed,
            all: albums,
            excludedIds: existingIds,
          });
          const currentRoot: ViewNodeDef =
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
            } as ViewNodeDef);

          const newChildren: ViewNodeDef[] = recommendations.map(
            (rec) =>
              ({
                id: rec.album.mbid,
                context: {
                  type: "album",
                  data: {
                    artist: rec.album["artist-mbid"],
                    title: rec.album.release,
                    variant: "flowchart",
                    recommendation: {
                      reason: rec.reason,
                      score: rec.score,
                    },
                  },
                },
              }) as ViewNodeDef,
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
