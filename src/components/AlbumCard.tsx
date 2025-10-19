import { useAtomValue } from "jotai";
import { GitGraph, ZoomIn } from "lucide-react";
import { memo } from "react";
import { getAlbumCoverUrl } from "../data/album-cover-urls";
import { albumDataSelectorsAtom } from "../data/albums-pool-atoms";
import { ForceGraphNode, type ForceGraphNodeBase } from "./force-graph-node";
import type { AlbumContext } from "./force-graph/force-graph-nodes-manager";
import {
  isViewActionsForKey,
  transitioningNodesFamily,
  type ViewActionsAtomOutput,
  type ViewKey,
} from "./force-graph/force-graph-views";

type AlbumCardProps = {
  viewActions: ViewActionsAtomOutput<ViewKey> | null;
  context: AlbumContext;
} & ForceGraphNodeBase;

export type AlbumCardVariant = "flowchart" | "albumsForArtist";

export const AlbumCard = memo(function AlbumCard({
  viewActions,
  context,
  ...graphNodeProps
}: AlbumCardProps) {
  console.log("render");

  const transitioningNode = useAtomValue(
    transitioningNodesFamily(graphNodeProps.nodeId),
  );
  const selectors = useAtomValue(albumDataSelectorsAtom);

  const contextWithBackup = context ?? transitioningNode?.nodeDef.context;

  if (!contextWithBackup || contextWithBackup.type !== "album") return null;

  const album = selectors.byMbid(graphNodeProps.nodeId);
  const coverUrl = getAlbumCoverUrl(graphNodeProps.nodeId);

  const { variant } = contextWithBackup.data;

  return (
    <ForceGraphNode {...graphNodeProps}>
      <div className="flex min-h-20 w-32 min-w-32 flex-col items-center gap-2">
        <div className="h-32 max-h-32 overflow-hidden">
          <img
            className="h-auto w-full"
            src={coverUrl}
            alt={album ? album.release : "Unknown Album"}
            draggable={false}
          />
        </div>
        <span className="text-center font-sans text-sm text-gray-300">
          {album ? album.release : "Unknown Album"}
        </span>
        {variant !== "albumsForArtist" && (
          <p
            className="text-center font-sans text-xs text-gray-400 hover:cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              if (isViewActionsForKey(viewActions, "flowchart") && album) {
                viewActions.actions.transitionToAlbumsForArtist({
                  artistId: album?.["artist-mbid"],
                });
              }
            }}
          >
            {album ? album.artist : "Unknown Artist"}
          </p>
        )}
        {variant === "flowchart" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isViewActionsForKey(viewActions, "flowchart")) {
                viewActions.actions.addRecommendationsToNode?.({
                  albumMbid: graphNodeProps.nodeId,
                  params: {
                    topX: 5,
                    opts: {
                      excludeSameArtist: true,
                      excludeDoubledArtist: true,
                    },
                    weights: {
                      genrePP: 0.9,
                      genrePS: 0.8,
                      genreSS: 0.6,
                      descriptors: 0.6,
                      rating: 1.2,
                    },
                  },
                });
              }
            }}
            className="cursor-pointer rounded-full bg-gray-700/60 p-1.5 text-gray-400 shadow-sm/25 shadow-gray-950 hover:bg-gray-700"
          >
            <GitGraph width={16} height={16} />
          </button>
        )}
        {variant === "albumsForArtist" && (
          <>
            <p className="text-center font-sans text-xs text-gray-400">
              {album
                ? album["release-date"].split("-")[0]
                : "Unknown Release Date"}
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isViewActionsForKey(viewActions, "albumsForArtist")) {
                  viewActions.actions.transitionToFlowchart({
                    albumId: graphNodeProps.nodeId,
                  });
                }
              }}
              className="cursor-pointer rounded-full bg-gray-700/60 p-1.5 text-gray-400 shadow-sm/25 shadow-gray-950"
            >
              <ZoomIn width={16} height={16} />
            </button>
          </>
        )}
      </div>
    </ForceGraphNode>
  );
});
