import * as d3 from "d3";
import { atom, useSetAtom, type Atom } from "jotai";
import { albumDataSelectorsAtom } from "../../../data/albums-pool-atoms";
import {
  simpleRecommendAlbums,
  type SimpleRecommendParams,
} from "../../../data/get-albums-recommendations";
import type { Position } from "../../flowchart/flowchart-links";
import {
  addChildrenToNodeInTree,
  findNodeInTree,
  flattenNodeTreeToMap,
  removeChildrenFromNodeInTree,
  type ViewNodeDef,
} from "../../nodes/view-nodes-manager";
import {
  activeViewConfigReadOnlyAtom,
  setActiveViewAtom,
  type NodeDefWithDimensions,
  type ViewBuilder,
  type ViewConfig,
} from "../views-config";

export const flowchartView: Atom<ViewBuilder<"flowchart">> = atom({
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
          parentView: "flowchart",
          variant: "detailed",
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
      positionMap.set(albumMbid, {
        x: albumNode.dimensions.width / 2,
        y: albumNode.dimensions.height / 2,
      });
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

        const { widthRequired: childWidthRequired } = handleChildrenWidthReqs({
          node: childNode,
          depth: depth + 1,
        });
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
      yForDepth[depth + 1] = yForDepth[depth] + heightForDepth + MARGIN_Y_NODES;
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

      const totalChildrenWidth =
        nodeDef.children.reduce(
          (sum, child) => sum + (widthRequiredPerNode.get(child.id) ?? 0),
          0,
        ) +
        MARGIN_X_NODES * (nodeDef.children.length - 1);

      let nextX = originPos.x - totalChildrenWidth / 2;

      nodeDef.children?.forEach((child) => {
        const childWidthRequired = widthRequiredPerNode.get(child.id) ?? 0;

        const childOriginPos = {
          x: nextX + childWidthRequired / 2,
          y: childrenY,
        };

        handlePositionsForNodes({
          nodeDef: child,
          originPos: childOriginPos,
          depth: depth + 1,
        });

        nextX += childWidthRequired + MARGIN_X_NODES;
      });

      let centeredPosition: number;

      if (nodeDef.children.length % 2 !== 0) {
        const idx = Math.floor((nodeDef.children.length + 1) / 2 - 1);

        centeredPosition = positionMap.get(nodeDef.children[idx].id)?.x ?? 0;
      } else {
        const idx1 = Math.floor(nodeDef.children.length / 2) - 1;
        const idx2 = Math.floor(nodeDef.children.length / 2);

        const pos1 = positionMap.get(nodeDef.children[idx1].id)?.x ?? 0;
        const pos2 = positionMap.get(nodeDef.children[idx2].id)?.x ?? 0;

        centeredPosition = (pos1 + pos2) / 2;
      }
      positionMap.set(nodeDef.id, {
        x: centeredPosition,
        y: yForDepth[depth] ?? 0,
      });
    };

    handlePositionsForNodes({ nodeDef: albumNode.nodeDef });

    return positionMap;
  },

  transitionConfig: {
    duration: 800,
    ease: d3.easeCubicInOut,
  },
});

type AddRecommendationsToNodeParams = {
  albumMbid: string;
  params: Omit<SimpleRecommendParams, "seed" | "all">;
};

const flowchartViewActionsAtomGroup = {
  addRecommendationsToNode: atom(
    null,
    (get, set, { albumMbid, params }: AddRecommendationsToNodeParams) => {
      const view = get(activeViewConfigReadOnlyAtom);

      if (!view || view.key !== "flowchart") {
        throw new Error("Active view is not flowchart");
      }

      const { data } = view as ViewConfig<"flowchart">;

      const selectors = get(albumDataSelectorsAtom);

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
              parentView: "flowchart",
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
                parentView: "flowchart",
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
      const newFocusedTree = findNodeInTree(updated, albumMbid);

      const nodesInNewFocusedTree = newFocusedTree
        ? Array.from(flattenNodeTreeToMap(newFocusedTree).keys())
        : null;

      set(setActiveViewAtom, {
        key: "flowchart",
        data: { ...data, nodeTree: updated },
        rezoomNodes: nodesInNewFocusedTree ?? undefined,
      });
    },
  ),
  focusNode: atom(null, (get, set, albumMbid: string) => {
    const view = get(activeViewConfigReadOnlyAtom);

    if (!view || view.key !== "flowchart") {
      throw new Error("Active view is not flowchart");
    }

    const { data } = view as ViewConfig<"flowchart">;

    const currentNodeTree = data.nodeTree;
    if (!currentNodeTree) return;

    const focusedNode = findNodeInTree(currentNodeTree, albumMbid);
    if (!focusedNode) return;

    const nodeContext = structuredClone(focusedNode.context);
    if (nodeContext.type !== "album") return;

    nodeContext.data.variant = "detailed";

    focusedNode.context = nodeContext;

    set(setActiveViewAtom, {
      key: "flowchart",
      data: { ...data, nodeTree: { ...currentNodeTree } },
      skipRezoom: true,
      requestDimensionsForNodes: [albumMbid],
    });
  }),
  removeChildrenFromNode: atom(
    null,
    (
      get,
      set,
      { parentId, childIds }: { parentId: string; childIds: string[] },
    ) => {
      const view = get(activeViewConfigReadOnlyAtom);

      if (!view || view.key !== "flowchart") {
        throw new Error("Active view is not flowchart");
      }

      const { data } = view as ViewConfig<"flowchart">;
      if (!data.nodeTree) return;
      const updated = removeChildrenFromNodeInTree(
        data.nodeTree,
        parentId,
        childIds,
      );
      set(setActiveViewAtom, {
        key: "flowchart",
        data: { ...data, nodeTree: updated },
      });
    },
  ),
};

export const useFlowchartViewActions = () => {
  const addRecommendationsToNode = useSetAtom(
    flowchartViewActionsAtomGroup.addRecommendationsToNode,
  );
  const removeChildrenFromNode = useSetAtom(
    flowchartViewActionsAtomGroup.removeChildrenFromNode,
  );
  const focusNode = useSetAtom(flowchartViewActionsAtomGroup.focusNode);

  return {
    addRecommendationsToNode,
    removeChildrenFromNode,
    focusNode,
  };
};
