import { type Atom, atom, useSetAtom } from "jotai";
import { RefreshCw } from "lucide-react";
import { ulid } from "ulid";
import type { Position } from "../../flowchart/flowchart-links";
import type { ViewNodeDef } from "../../nodes/view-nodes-manager";
import { buildGridPositions } from "../utils/build-utils";
import { type ViewBuilder, setActiveViewAtom } from "../views-config";

export const homeView: Atom<ViewBuilder<"home">> = atom(() => ({
  buildNodes: ({ selectors, data }) => {
    console.log("Building home view nodes with seed:", data.seed);
    const randomAlbums = selectors?.randomN(5, data.seed);

    return new Map<string, ViewNodeDef>([
      [
        "random-picks",
        {
          id: "random-picks",
          context: {
            type: "section-title",
            data: {
              label: "Random Picks",
            },
          },
        } satisfies ViewNodeDef,
      ],
      [
        "refresh-random-picks-button",
        {
          id: "refresh-random-picks-button",
          context: {
            type: "icon-button",
            data: {
              ariaLabel: "Refresh Random Picks",
              icon: <RefreshCw />,
              onClick: homeViewActionsAtomGroup.refreshRandomPicks,
            },
          },
        } satisfies ViewNodeDef,
      ],
      ...randomAlbums.map((album) => {
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
                variant: "home",
              },
            },
          },
        ] satisfies [string, ViewNodeDef];
      }),
    ]);
  },

  buildNodePositions: ({ nodeDefsWithDimensions }): Map<string, Position> => {
    const randomPicksTitle = nodeDefsWithDimensions.get("random-picks");
    if (!randomPicksTitle) return new Map();

    const randomPicks = Array.from(nodeDefsWithDimensions.values()).filter(
      (def) => def.nodeDef.context.type === "album",
    );

    const randomPicksY = randomPicksTitle.dimensions.height + 20;

    const { positions: albumPositions } = buildGridPositions({
      nodes: randomPicks.map((def) => ({
        id: def.nodeDef.id,
        dimensions: def.dimensions,
      })),
      baseY: randomPicksY,
    });

    return new Map<string, Position>([
      [
        "random-picks",
        {
          x: 0,
          y: 0,
        },
      ],
      [
        "refresh-random-picks-button",
        {
          x: randomPicksTitle.dimensions.width + 20,
          y: 0,
        },
      ],
      ...Array.from(albumPositions.entries()).map(
        ([id, { x, y }]) => [id, { x, y }] satisfies [string, Position],
      ),
    ]);
  },
}));

const homeViewActionsAtomGroup = {
  refreshRandomPicks: atom(null, (_, set) => {
    console.log("Refreshing random picks");
    set(setActiveViewAtom, { key: "home", data: { seed: ulid() } });
  }),
};

export const useHomeViewActions = () => {
  const refreshRandomPicks = useSetAtom(
    homeViewActionsAtomGroup.refreshRandomPicks,
  );

  return {
    refreshRandomPicks,
  };
};
