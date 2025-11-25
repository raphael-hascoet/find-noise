import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { GitGraph, ZoomIn } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, memo } from "react";
import { COLORS } from "../../../constants/colors";
import {
  albumDataSelectorsAtom,
  type Album,
} from "../../../data/albums-pool-atoms";
import type { SimpleRecommendation } from "../../../data/get-albums-recommendations";
import { rgbWithOpacity } from "../../../utils/colors";
import { useFlowchartViewActions } from "../../views/builders/flowchart-view";
import { setActiveViewAtom } from "../../views/views-config";
import type { AlbumContext } from "../view-nodes-manager";
import { AlbumCardCoverImage } from "./album-card-cover-image";
import { NodeCard } from "./node-card";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

type AlbumCardProps = {
  context: AlbumContext;
  hasChildren?: boolean;
} & NodeContentWrapperPropsBase;

export type AlbumCardVariant = "compact" | "detailed";

export type AlbumCardContextData = {
  title: string;
  artist: string;
  parentView: AlbumCardParentView;
  variant?: AlbumCardVariant;
  recommendation?: Omit<SimpleRecommendation, "album">;
};

export type AlbumCardParentView =
  | "flowchart"
  | "albumsForArtist"
  | "home"
  | "search";

type AlbumCardContentOptions = {
  showArtistName: boolean;
  showAddRecommendationsButton: boolean;
  showReleaseYear: boolean;
  showZoomInButton: boolean;
  showDetailedGenresAndDescriptors: boolean;
};

export const AlbumCardNodeContent = memo(function AlbumCardNodeContent({
  context,
  ...graphNodeProps
}: AlbumCardProps) {
  const { addRecommendationsToNode, focusNode } = useFlowchartViewActions();

  const selectors = useAtomValue(albumDataSelectorsAtom);

  const setActiveView = useSetAtom(setActiveViewAtom);

  const album = selectors.byMbid(graphNodeProps.nodeId);

  if (context.type !== "album" || !album) {
    return null;
  }

  const { parentView, variant = "compact" } = context.data;

  const {
    showArtistName,
    showAddRecommendationsButton,
    showReleaseYear,
    showZoomInButton,
    showDetailedGenresAndDescriptors,
  } = useContentOptionsForAlbumCard({
    parentView,
    variant,
    hasChildren: graphNodeProps.hasChildren,
  });

  return (
    <NodeContentWrapper {...graphNodeProps} variant={variant}>
      <NodeCard positioned={graphNodeProps.positioned}>
        <motion.div
          className="flex min-h-20 flex-1 flex-col items-center gap-4"
          animate={variant}
          initial={false}
          variants={{
            compact: {
              width: "8rem",
              maxWidth: "8rem",
            },
            detailed: {
              width: "24rem",
              maxWidth: "24rem",
            },
          }}
        >
          <div className="flex w-full min-w-0 flex-col items-center gap-2">
            <motion.div
              className="flex overflow-hidden"
              initial={false}
              variants={{
                compact: { width: "8rem", height: "8rem", maxWidth: "8rem" },
                detailed: {
                  width: "12rem",
                  height: "12rem",
                  maxWidth: "12rem",
                },
              }}
            >
              <AlbumCardCoverImage
                nodeId={graphNodeProps.nodeId}
                albumName={album ? album.release : "Unknown Album"}
              />
            </motion.div>
            <div className="flex w-full min-w-0 flex-col items-center gap-2 pt-1">
              <motion.p
                className="max-w-full text-center font-sans break-words text-gray-300"
                variants={{
                  compact: { fontSize: "var(--text-xs)" },
                  detailed: { fontSize: "var(--text-sm)" },
                }}
              >
                {album ? album.release : "Unknown Album"}
              </motion.p>
              <div
                className={`flex items-center gap-1 ${clsx({ "flex-col": variant === "compact", "flex-row": variant === "detailed" })}`}
              >
                {showArtistName && (
                  <motion.p
                    className="pointer-events-auto max-w-full text-center font-sans break-words text-gray-400 hover:cursor-pointer hover:underline"
                    variants={{
                      compact: { fontSize: "var(--text-xs)" },
                      detailed: { fontSize: "var(--text-sm)" },
                    }}
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
                  </motion.p>
                )}
                {variant === "detailed" &&
                  showArtistName &&
                  showReleaseYear && (
                    <motion.span
                      className="text-gray-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      -
                    </motion.span>
                  )}
                {variant === "compact" && showReleaseYear && (
                  <p className="text-center font-sans text-xs text-gray-400">
                    {album
                      ? album["release-date"].split("-")[0]
                      : "Unknown Release Date"}
                  </p>
                )}
                {variant === "detailed" && showReleaseYear && (
                  <motion.p
                    className="text-center font-sans text-sm text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ overflow: "hidden" }}
                  >
                    {album
                      ? album["release-date"].split("-")[0]
                      : "Unknown Release Date"}
                  </motion.p>
                )}
              </div>
            </div>
          </div>
          <AnimatePresence>
            {showDetailedGenresAndDescriptors && (
              <motion.div
                className="flex flex-col items-center gap-2"
                initial="hidden"
                animate="show"
                exit="hide"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { delay: 0.5, duration: 0.3 },
                  },
                  hide: { opacity: 0, transition: { duration: 0.1 } },
                }}
                style={{ overflow: "hidden" }}
              >
                <AlbumCardDetailedGenresAndDescriptors album={album} />
              </motion.div>
            )}
          </AnimatePresence>

          {showZoomInButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (parentView === "flowchart") {
                  focusNode(graphNodeProps.nodeId);
                  return;
                }
                setActiveView({
                  key: "flowchart",
                  data: {
                    albumMbid: graphNodeProps.nodeId,
                  },
                });
              }}
              className="pointer-events-auto cursor-pointer rounded-full bg-slate-700 p-1.5 text-gray-300/90 shadow-sm/25 shadow-gray-950 transition-colors hover:bg-slate-700/70 active:bg-slate-700/50"
            >
              <ZoomIn width={16} height={16} />
            </button>
          )}
          {showAddRecommendationsButton && (
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
              className="pointer-events-auto cursor-pointer rounded-full bg-slate-700 p-1.5 text-gray-300/90 shadow-sm/25 shadow-gray-950 transition-colors hover:bg-slate-700/70 active:bg-slate-700/50"
            >
              <GitGraph width={16} height={16} />
            </button>
          )}
        </motion.div>
      </NodeCard>
    </NodeContentWrapper>
  );
});

const useContentOptionsForAlbumCard = ({
  parentView,
  variant,
  hasChildren,
}: {
  parentView: AlbumCardParentView;
  variant?: AlbumCardVariant;
  hasChildren?: boolean;
}) => {
  const options: AlbumCardContentOptions = {
    showArtistName: variant === "detailed" || parentView !== "albumsForArtist",
    showAddRecommendationsButton: parentView === "flowchart" && !hasChildren,
    showReleaseYear: variant === "detailed" || parentView === "albumsForArtist",
    showZoomInButton:
      parentView === "home" ||
      parentView === "search" ||
      parentView === "albumsForArtist" ||
      variant === "compact",
    showDetailedGenresAndDescriptors: variant === "detailed",
  };

  return options;
};

const AlbumCardDetailedGenresAndDescriptors = ({ album }: { album: Album }) => {
  return (
    <>
      <motion.div
        className="grid w-full gap-2"
        style={{
          gridTemplateColumns: "1fr 1fr",
        }}
      >
        {!!album["primary-genres"].length && (
          <div className="flex flex-col gap-2 pr-2">
            <span className="font-sans text-xs font-semibold text-gray-200">
              Primary Genres
            </span>
            <div
              style={{
                borderColor: COLORS.tagsPrimaryGenre,
                borderWidth: 1,
                backgroundColor: rgbWithOpacity(COLORS.tagsPrimaryGenre, 0.1),
              }}
              className="rounded-lg p-2 text-xs"
            >
              {album["primary-genres"].map((genre, index) => (
                <Fragment key={genre}>
                  <span className="text-nowrap">{genre}</span>
                  {index < album["primary-genres"].length - 1 ? (
                    <span>, </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
        )}
        {!!album["secondary-genres"].length && (
          <div className="flex flex-col gap-2 pr-2">
            <span className="font-sans text-xs font-semibold text-gray-200">
              Secondary Genres
            </span>
            <div
              style={{
                borderColor: COLORS.tagsSecondaryGenre,
                borderWidth: 1,
                backgroundColor: rgbWithOpacity(COLORS.tagsSecondaryGenre, 0.1),
              }}
              className="rounded-lg p-2 text-xs"
            >
              {album["secondary-genres"].map((genre, index) => (
                <Fragment key={genre}>
                  <span className="text-nowrap">{genre}</span>
                  {index < album["secondary-genres"].length - 1 ? (
                    <span>, </span>
                  ) : null}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </motion.div>
      {!!album.descriptors.length && (
        <div className="flex w-full flex-col gap-2">
          <span className="font-sans text-xs font-semibold text-gray-200">
            Descriptors
          </span>
          <div
            style={{
              borderColor: COLORS.tagsDescriptor,
              borderWidth: 1,
              backgroundColor: rgbWithOpacity(COLORS.tagsDescriptor, 0.1),
            }}
            className="rounded-lg p-2 text-xs"
          >
            {album.descriptors.join(", ")}
          </div>
        </div>
      )}
    </>
  );
};
