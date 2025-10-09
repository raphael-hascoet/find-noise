import { atom } from "jotai";
import type { AlbumCardVariant } from "../AlbumCard";

export type ForceGraphNodeDefBase = {
  id: string;
  children?: ForceGraphNodeDef[];
  onZoomClick?: () => void;
};

export type ArtistContext = {
  type: "artist";
  data: {
    name: string;
  };
};

export type AlbumContext = {
  type: "album";
  data: {
    title: string;
    artist: string;
    variant: AlbumCardVariant;
  };
};

export type GenreContext = {
  type: "genre";
  data: {
    name: string;
  };
};

export type ForceGraphNodeDefByType =
  | ArtistContext
  | AlbumContext
  | GenreContext;

export type ForceGraphNodeDef = ForceGraphNodeDefBase & {
  context: ForceGraphNodeDefByType;
};

type ForceGraphNodeDefWithParent = Omit<ForceGraphNodeDef, "children"> & {
  parentId: string | null;
  children?: string[];
};

const forceGraphDisplayedNodeDefsAtom = atom<
  Map<string, ForceGraphNodeDefWithParent>
>(new Map());

const forceGraphRootNodeDefIdAtom = atom<string | null>(null);

export const forceGraphGetRootNodeDefAtom = atom((get) => {
  const rootNodeId = get(forceGraphRootNodeDefIdAtom);

  if (!rootNodeId) {
    return null;
  }

  return resolveNodeDefForDisplay({
    nodeId: rootNodeId,
    map: get(forceGraphDisplayedNodeDefsAtom),
  });
});

export const forceGraphSetRootNodeDefAtom = atom(
  null,
  (_, set, update: ForceGraphNodeDef) => {
    set(forceGraphRootNodeDefIdAtom, update.id);
    if (update) {
      const newDisplayedNodeDefs = new Map();
      createDisplayNodeDefsRecursive({
        node: update,
        map: newDisplayedNodeDefs,
        parentId: null,
      });
      set(forceGraphDisplayedNodeDefsAtom, newDisplayedNodeDefs);
    }
  },
);

export const forceGraphClearRootNodeDefAtom = atom(null, (_, set) => {
  set(forceGraphRootNodeDefIdAtom, null);
  set(forceGraphDisplayedNodeDefsAtom, new Map());
});

export const forceGraphAddChildrenToNodeDefAtom = atom(
  null,
  (get, set, update: { parentId: string; children: ForceGraphNodeDef[] }) => {
    const { parentId, children } = update;
    const displayedNodeDefs = new Map(get(forceGraphDisplayedNodeDefsAtom));

    const parentNodeDef = displayedNodeDefs.get(parentId);

    if (!parentNodeDef) {
      console.warn("Parent node not found");
      return;
    }

    children.forEach((child) => {
      createDisplayNodeDefsRecursive({
        node: child,
        map: displayedNodeDefs,
        parentId,
      });
    });

    displayedNodeDefs.set(parentId, {
      ...parentNodeDef,
      children: [
        ...(parentNodeDef?.children || []),
        ...children.map((child) => child.id),
      ],
    });

    console.log(displayedNodeDefs);

    set(forceGraphDisplayedNodeDefsAtom, displayedNodeDefs);
  },
);

const resolveNodeDefForDisplay = ({
  nodeId,
  map,
}: {
  nodeId: string;
  map: Map<string, ForceGraphNodeDefWithParent>;
}): ForceGraphNodeDef => {
  const node = map.get(nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }
  return {
    ...node,
    children: node.children?.map((childId) =>
      resolveNodeDefForDisplay({ nodeId: childId, map }),
    ),
  };
};

const createDisplayNodeDefsRecursive = ({
  node,
  map,
  parentId,
}: {
  node: ForceGraphNodeDef;
  map: Map<string, ForceGraphNodeDefWithParent>;
  parentId: string | null;
}) => {
  node.children?.forEach((child) =>
    createDisplayNodeDefsRecursive({ node: child, map, parentId: node.id }),
  );
  map.set(node.id, {
    ...node,
    parentId,
    children: node.children?.map((child) => child.id),
  });
};

const deleteDisplayNodeDefsRecursive = ({
  nodeId,
  map,
}: {
  nodeId: string;
  map: Map<string, ForceGraphNodeDefWithParent>;
}) => {
  const node = map.get(nodeId);
  node?.children?.forEach((child) =>
    deleteDisplayNodeDefsRecursive({ nodeId: child, map }),
  );
  if (node?.parentId) {
    const parentNodeDef = map.get(node.parentId);
    if (parentNodeDef) {
      map.set(node.parentId, {
        ...parentNodeDef,
        children: parentNodeDef.children?.filter((id) => id !== nodeId),
      });
    }
  }
  map.delete(nodeId);
};
