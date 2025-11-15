import Fuse from "fuse.js";
import { type Atom, atom } from "jotai";
import type { Position } from "../../flowchart/flowchart-links";
import type { ViewNodeDef } from "../../nodes/view-nodes-manager";
import { buildGridPositions } from "../utils/build-utils";
import { type ViewBuilder } from "../views-config";

export const searchView: Atom<ViewBuilder<"search">> = atom(() => ({
  buildNodes: ({ selectors, data }) => {
    const allAlbums = selectors.allAlbums();

    // Create Fuse instance for fuzzy search on album names
    const fuse = new Fuse(allAlbums, {
      keys: ["release", "artist"],
      threshold: 0.9,
      includeScore: true,
    });

    // Perform search if query exists, otherwise show no results
    const searchResults = data.query.trim()
      ? fuse
          .search(data.query)
          .map((result) => result.item)
          .slice(0, 30)
      : [];

    return new Map<string, ViewNodeDef>([
      [
        "search-results-title",
        {
          id: "search-results-title",
          context: {
            type: "section-title",
            data: {
              label: data.query.trim()
                ? `Search Results`
                : "Enter a search term above",
            },
          },
        } satisfies ViewNodeDef,
      ],
      ...searchResults.map((album) => {
        const id = album.mbid;
        return [
          id,
          {
            id,
            context: {
              type: "album",
              data: {
                artist: album.artist,
                title: album.release,
                parentView: "search",
              },
            },
          },
        ] satisfies [string, ViewNodeDef];
      }),
    ]);
  },

  buildNodePositions: ({ nodeDefsWithDimensions }): Map<string, Position> => {
    const searchResultsTitle = nodeDefsWithDimensions.get(
      "search-results-title",
    );
    if (!searchResultsTitle) return new Map();

    const Y_GAP = 30;
    const ALBUM_Y_GAP = 50;

    let nextY = 0;

    // Results title
    const resultsTitlePosition = { x: 0, y: 0 };
    nextY += searchResultsTitle.dimensions.height + Y_GAP;

    // Album results in grid
    const albumNodes = Array.from(nodeDefsWithDimensions.values()).filter(
      (def) => def.nodeDef.context.type === "album",
    );

    const { positions: albumPositions } = buildGridPositions({
      nodes: albumNodes.map((def) => ({
        id: def.nodeDef.id,
        dimensions: def.dimensions,
      })),
      baseY: nextY,
      maxPerRow: 10,
      yGap: ALBUM_Y_GAP,
    });

    return new Map<string, Position>([
      ["search-results-title", resultsTitlePosition],
      ...Array.from(albumPositions.entries()).map(
        ([id, { x, y }]) => [id, { x, y }] satisfies [string, Position],
      ),
    ]);
  },
}));
