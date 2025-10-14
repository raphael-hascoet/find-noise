import type { SimpleRecommendation } from "../../data/get-albums-recommendations";
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
    recommendation?: Omit<SimpleRecommendation, "album">;
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

// Pure utilities for recursive trees (immutable)
export function flattenNodeTreeToMap(
  root: ForceGraphNodeDef,
  map: Map<string, ForceGraphNodeDef> = new Map(),
): Map<string, ForceGraphNodeDef> {
  map.set(root.id, root);
  root.children?.forEach((child) => flattenNodeTreeToMap(child, map));
  return map;
}

export function addChildrenToNodeInTree(
  root: ForceGraphNodeDef,
  parentId: string,
  newChildren: ForceGraphNodeDef[],
): ForceGraphNodeDef {
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
  root: ForceGraphNodeDef,
  parentId: string,
  childIdsToRemove: string[],
): ForceGraphNodeDef {
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
  root: ForceGraphNodeDef,
  nodeId: string,
): ForceGraphNodeDef | null {
  if (root.id === nodeId) return root;
  for (const c of root.children || []) {
    const found = findNodeInTree(c, nodeId);
    if (found) return found;
  }
  return null;
}
