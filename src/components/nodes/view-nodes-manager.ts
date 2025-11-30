import type { AlbumCardContextData } from "./content/album-card-node-content";
import type { IconButtonContextData } from "./content/icon-button-node-content";
import type { SectionTitleContextData } from "./content/section-title-node-content";

type ViewNodeDefBase = {
  id: string;
  children?: ViewNodeDef[];
  onZoomClick?: () => void;
  appearanceDelay?: number;
};

export type AppTitleContext = {
  type: "app-title";
  data: {};
};

export type ArtistContext = {
  type: "artist";
  data: {
    name: string;
  };
};

export type AlbumContext = {
  type: "album";
  data: AlbumCardContextData;
};

export type SectionTitleContext = {
  type: "section-title";
  data: SectionTitleContextData;
};

export type IconButtonContext = {
  type: "icon-button";
  data: IconButtonContextData;
};

export type ViewNodeDefByType =
  | AppTitleContext
  | ArtistContext
  | AlbumContext
  | SectionTitleContext
  | IconButtonContext;

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
