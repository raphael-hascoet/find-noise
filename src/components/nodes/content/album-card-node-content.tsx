import { useAtomValue, useSetAtom } from "jotai";
import { GitGraph, ZoomIn } from "lucide-react";
import { memo } from "react";
import { getAlbumCoverUrl } from "../../../data/album-cover-urls";
import { albumDataSelectorsAtom } from "../../../data/albums-pool-atoms";
import type { SimpleRecommendation } from "../../../data/get-albums-recommendations";
import { useFlowchartViewActions } from "../../views/builders/flowchart-view";
import { setActiveViewAtom } from "../../views/views-config";
import type { AlbumContext } from "../view-nodes-manager";
import { NodeCard } from "./node-card";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

type AlbumCardProps = {
  context: AlbumContext;
} & NodeContentWrapperPropsBase;

export type AlbumCardContextData = {
  title: string;
  artist: string;
  variant: AlbumCardVariant;
  recommendation?: Omit<SimpleRecommendation, "album">;
};

export type AlbumCardVariant =
  | "flowchart"
  | "albumsForArtist"
  | "home"
  | "search";

export const AlbumCardNodeContent = memo(function AlbumCardNodeContent({
  context,
  ...graphNodeProps
}: AlbumCardProps) {
  const { addRecommendationsToNode } = useFlowchartViewActions();

  const selectors = useAtomValue(albumDataSelectorsAtom);

  const setActiveView = useSetAtom(setActiveViewAtom);

  const album = selectors.byMbid(graphNodeProps.nodeId);

  if (context.type !== "album" || !album) {
    return null;
  }

  const coverUrl = getAlbumCoverUrl(graphNodeProps.nodeId);

  const { variant } = context.data;

  return (
    <NodeContentWrapper {...graphNodeProps}>
      <NodeCard>
        <div className="flex min-h-20 w-32 min-w-32 flex-col items-center gap-2">
          <div className="h-32 max-h-32 overflow-hidden">
            <img
              className="h-auto w-full"
              src={coverUrl}
              alt={album ? album.release : "Unknown Album"}
              draggable={false}
            />
          </div>
          <p className="max-w-full text-center font-sans text-sm break-words text-gray-300">
            {album ? album.release : "Unknown Album"}
          </p>
          {variant !== "albumsForArtist" && (
            <p
              className="max-w-fulltext-center pointer-events-auto text-center font-sans text-xs break-words text-gray-400 hover:cursor-pointer hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                setActiveView({
                  key: "albumsForArtist",
                  data: {
                    artistId: album?.["artist-mbid"],
                  },
                });
              }}
            >
              {album ? album.artist : "Unknown Artist"}
            </p>
          )}
          {variant === "flowchart" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                addRecommendationsToNode?.({
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
              }}
              className="pointer-events-auto cursor-pointer rounded-full bg-gray-700/60 p-1.5 text-gray-400 shadow-sm/25 shadow-gray-950 hover:bg-gray-700"
            >
              <GitGraph width={16} height={16} />
            </button>
          )}
          {variant === "albumsForArtist" && (
            <p className="text-center font-sans text-xs text-gray-400">
              {album
                ? album["release-date"].split("-")[0]
                : "Unknown Release Date"}
            </p>
          )}
          {variant !== "flowchart" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveView({
                  key: "flowchart",
                  data: {
                    albumMbid: graphNodeProps.nodeId,
                  },
                });
              }}
              className="pointer-events-auto cursor-pointer rounded-full bg-gray-700/60 p-1.5 text-gray-400 shadow-sm/25 shadow-gray-950"
            >
              <ZoomIn width={16} height={16} />
            </button>
          )}
        </div>
      </NodeCard>
    </NodeContentWrapper>
  );
});
