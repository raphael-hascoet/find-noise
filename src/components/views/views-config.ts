import type { Atom } from "jotai";
import { atom } from "jotai";
import { atomFamily } from "jotai/utils";
import { frame } from "motion";
import {
  viewsConstantsAtom,
  type ViewsConstants,
} from "../../constants/positioning-constants-atoms";
import {
  albumDataSelectorsAtom,
  type AlbumSelectors,
} from "../../data/albums-pool-atoms";
import type { Position } from "../flowchart/flowchart-links";
import {
  loadedNodeDimensionsAtom,
  requestNodeDimensionsUpdateAtom,
  type NodeDimensions,
} from "../nodes/view-node-dimensions";
import { type ViewNodeDef } from "../nodes/view-nodes-manager";
import { updateZoomStatusOnViewChange } from "../zoom-manager";
import { viewBuilders } from "./view-builders";

export type ViewKeyToDefinition = {
  home: {
    data: {
      seed: string;
    };
  };
  albumsForArtist: {
    data: {
      artistId: string;
    };
  };
  flowchart: {
    data: {
      albumMbid: string;
      nodeTree?: ViewNodeDef;
    };
  };
  search: {
    data: {
      query: string;
    };
  };
};

export type ViewKey = keyof ViewKeyToDefinition;

export type ViewData<T extends ViewKey> = T extends keyof ViewKeyToDefinition
  ? ViewKeyToDefinition[T]["data"]
  : never;

export type ViewBuilder<Key extends ViewKey> = {
  buildNodes: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    constants: ViewsConstants;
  }) => Map<string, ViewNodeDef>;

  buildNodePositions: (params: {
    data: ViewData<Key>;
    selectors: AlbumSelectors;
    nodeDefsWithDimensions: Map<string, NodeDefWithDimensions>;
    constants: ViewsConstants;
  }) => Map<string, Position>;

  transitionConfig?: {
    duration: number;
    ease?: (t: number) => number;
  };
};

export type ViewConfig<TKey extends ViewKey = ViewKey> = {
  key: TKey;
  data: ViewData<TKey>;
};

export type NodeDefWithDimensions = {
  nodeDef: ViewNodeDef;
  dimensions: NodeDimensions;
};

export type PositionedNode = NodeDefWithDimensions & {
  position: Position;
};

export type NodePositioningState =
  | { state: "init" }
  | {
      state: "in-progress";
      transitionNodes?: Map<string, PositionedNode>;
      targetNodeDefs: Map<string, ViewNodeDef>;
      triggeredAt: string;
    }
  | {
      state: "ready";
      positionedNodes: Map<string, PositionedNode>;
    };

export const nodePositioningStateAtom = atom((get): NodePositioningState => {
  const constants = get(viewsConstantsAtom);
  const nodeDefs = get(calculatedNodeDefsAtom);

  if (!nodeDefs?.size) return { state: "init" };

  const dimensions = get(loadedNodeDimensionsAtom);

  console.log({ dimensions });

  const nodeDefsWithDimensions = new Map<string, NodeDefWithDimensions>();
  const nodeDefsNeedingDimensions = new Map<string, ViewNodeDef>();

  for (const [id, nodeDef] of nodeDefs) {
    let dimensionKey = id;
    if (nodeDef.context?.type === "album") {
      const variant = nodeDef.context.data?.variant || "compact";
      dimensionKey = `${id}_${variant}`;
    }

    const nodeDimensions = dimensions.get(dimensionKey);
    if (!nodeDimensions || nodeDimensions.updateRequested) {
      console.log("not loaded", { nodeDimensions, nodeDefs });
      nodeDefsNeedingDimensions.set(id, nodeDef);
      continue;
    }
    nodeDefsWithDimensions.set(id, { dimensions: nodeDimensions, nodeDef });
  }

  if (nodeDefsNeedingDimensions.size > 0) {
    const transitionNodes = get(transitioningNodesAtom);

    return {
      state: "in-progress",
      transitionNodes,
      targetNodeDefs: nodeDefsNeedingDimensions,
      triggeredAt: new Date().toISOString(),
    };
  }

  const viewConfig = get(activeViewConfigAtom);

  if (!viewConfig) throw new Error("No view config found on active view");
  const selectors = get(albumDataSelectorsAtom);

  const builder = get(viewBuilders[viewConfig.key] as Atom<ViewBuilder<any>>);

  const positions = builder.buildNodePositions({
    data: viewConfig.data as any,
    selectors,
    nodeDefsWithDimensions,
    constants,
  });

  const positionedNodes = new Map<string, PositionedNode>();

  for (const [id, nodeDefWithDimension] of nodeDefsWithDimensions) {
    const position = positions.get(id);

    if (!position) throw new Error(`No position generated for node def ${id}`);

    positionedNodes.set(id, { ...nodeDefWithDimension, position });
  }

  return {
    state: "ready",
    positionedNodes,
  };
});

const activeViewConfigAtom = atom<ViewConfig | null>(null);
export const activeViewConfigReadOnlyAtom = atom((get) =>
  get(activeViewConfigAtom),
);

const calculatedNodeDefsAtom = atom((get) => {
  const constants = get(viewsConstantsAtom);
  const viewConfig = get(activeViewConfigAtom);
  const selectors = get(albumDataSelectorsAtom);

  if (!viewConfig || !selectors) return null;

  const builder = get(viewBuilders[viewConfig.key] as Atom<ViewBuilder<any>>);
  if (!builder) return null;

  return builder.buildNodes({
    data: viewConfig.data as any,
    selectors,
    constants,
  });
});

type SetActiveViewParams = ViewConfig & {
  skipRezoom?: boolean;
  rezoomNodes?: string[];
  skipAlbumDimensionsUpdate?: boolean | { exceptIds?: string[] };
};

export const setActiveViewAtom = atom(
  null,
  (get, set, config: SetActiveViewParams) => {
    frame.render(() => {
      const currentPositioningState = get(nodePositioningStateAtom);
      if (currentPositioningState.state === "in-progress") {
        console.warn("New active view while positioning is in progress");
      }
      if (currentPositioningState.state === "ready") {
        const posNodes = new Map(currentPositioningState.positionedNodes);
        set(transitioningNodesAtom, posNodes);

        if (
          !config.skipAlbumDimensionsUpdate ||
          typeof config.skipAlbumDimensionsUpdate === "object"
        ) {
          const dimensionUpdateRequests = Array.from(
            currentPositioningState.positionedNodes.entries(),
          )
            .filter(
              ([_, node]) =>
                node.nodeDef.context.type === "album" &&
                (typeof config.skipAlbumDimensionsUpdate === "object"
                  ? config.skipAlbumDimensionsUpdate.exceptIds?.includes(
                      node.nodeDef.id,
                    )
                  : true),
            )
            .flatMap(([id]) => [`${id}_compact`, `${id}_detailed`]);

          if (dimensionUpdateRequests.length) {
            set(requestNodeDimensionsUpdateAtom, dimensionUpdateRequests);
          }
        }
      }
      set(activeViewConfigAtom, config);

      set(updateZoomStatusOnViewChange, {
        status: config.skipRezoom ? "resizing-pending" : "rezooming-pending",
        rezoomNodes: config.rezoomNodes || null,
      });
    });
  },
);

export const transitioningNodesAtom = atom<Map<string, PositionedNode>>(
  new Map(),
);

export const transitioningNodesFamily = atomFamily((id: string) => {
  return atom((get) => {
    const transitioningNodes = get(transitioningNodesAtom);
    return transitioningNodes?.get(id);
  });
});

export const clearTransitioningNodesAtom = atom(null, (get, set) => {
  const loadedNodeDimensions = get(loadedNodeDimensionsAtom);

  const positioningState = get(nodePositioningStateAtom);

  if (positioningState.state === "ready") {
    const positionedNodes = Array.from(positioningState.positionedNodes.keys());

    const dimensionsToClear = Array.from(loadedNodeDimensions?.keys()).filter(
      (id) => !positionedNodes.includes(id.split("_")[0]),
    );

    if (dimensionsToClear.length) {
      const updatedDimensions = new Map(loadedNodeDimensions);
      dimensionsToClear.forEach((id) => updatedDimensions.delete(id));
      set(loadedNodeDimensionsAtom, updatedDimensions);
    }
  }

  set(transitioningNodesAtom, new Map());
});

export const calculatedLinksAtom = atom((get) => {
  const positioningState = get(nodePositioningStateAtom);
  const viewConfig = get(activeViewConfigReadOnlyAtom);

  if (viewConfig?.key !== "flowchart") return [];

  const visiblePositionedNodes =
    positioningState.state === "ready"
      ? positioningState.positionedNodes
      : positioningState.state === "in-progress"
        ? (positioningState.transitionNodes ?? null)
        : null;

  const links: Array<{ source: string; targets: string[] }> = [];

  visiblePositionedNodes?.forEach(({ nodeDef }) => {
    if (nodeDef.children && nodeDef.children.length > 0) {
      links.push({
        source: nodeDef.id,
        targets: nodeDef.children.map((child) => child.id),
      });
    }
  });

  return links;
});
