import type { SimpleRecommendation } from "../../data/get-albums-recommendations";
import type { AlbumCardVariant } from "./content/album-card-node-content";

type ViewNodeDefBase = {
  id: string;
  children?: ViewNodeDef[];
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
    recommendation?: Omit<SimpleRecommendation, "album">;
  };
};

type GenreContext = {
  type: "genre";
  data: {
    name: string;
  };
};

export type ViewNodeDefByType = ArtistContext | AlbumContext | GenreContext;

export type ViewNodeDef = ViewNodeDefBase & {
  context: ViewNodeDefByType;
};

// Pure utilities for recursive trees (immutable)
export function flattenNodeTreeToMap(
  root: ViewNodeDef,
  map: Map<string, ViewNodeDef> = new Map(),
): Map<string, ViewNodeDef> {
  map.set(root.id, root);
  root.children?.forEach((child) => flattenNodeTreeToMap(child, map));
  return map;
}

export function addChildrenToNodeInTree(
  root: ViewNodeDef,
  parentId: string,
  newChildren: ViewNodeDef[],
): ViewNodeDef {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...(root.children || []), ...newChildren],
    };
  }
  if (!root.children || root.children.length === 0) return root;
  return {
    ...root,
    children: root.children.map((c) =>
      addChildrenToNodeInTree(c, parentId, newChildren),
    ),
  };
}

export function removeChildrenFromNodeInTree(
  root: ViewNodeDef,
  parentId: string,
  childIdsToRemove: string[],
): ViewNodeDef {
  if (root.id === parentId) {
    return {
      ...root,
      children: root.children?.filter((c) => !childIdsToRemove.includes(c.id)),
    };
  }
  if (!root.children || root.children.length === 0) return root;
  return {
    ...root,
    children: root.children.map((c) =>
      removeChildrenFromNodeInTree(c, parentId, childIdsToRemove),
    ),
  };
}

export function findNodeInTree(
  root: ViewNodeDef,
  nodeId: string,
): ViewNodeDef | null {
  if (root.id === nodeId) return root;
  for (const c of root.children || []) {
    const found = findNodeInTree(c, nodeId);
    if (found) return found;
  }
  return null;
}
