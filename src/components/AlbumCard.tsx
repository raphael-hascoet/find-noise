import { useAtomValue, useSetAtom } from "jotai";
import { ZoomIn } from "lucide-react";
import { getAlbumCoverUrl } from "../data/album-cover-urls";
import { albumDataSelectorsAtom } from "../data/albums-pool-atoms";
import { ForceGraphNode, type ForceGraphNodeBase } from "./force-graph-node";
import { forceGraphAddChildrenToNodeDefAtom } from "./force-graph/force-graph-nodes-manager";
import { nodeContextFamily } from "./force-graph/force-graph-views";

type AlbumCardProps = {
  onClick?: (id: string) => void;
} & ForceGraphNodeBase;

export type AlbumCardVariant = "full" | "no-artist";

export function AlbumCardReact({ onClick, ...graphNodeProps }: AlbumCardProps) {
  const nodeContext = useAtomValue(nodeContextFamily(graphNodeProps.nodeId));

  if (!nodeContext || nodeContext.type !== "album") return null;

  const selectors = useAtomValue(albumDataSelectorsAtom);
  const album = selectors.byMbid(graphNodeProps.nodeId);
  const coverUrl = getAlbumCoverUrl(graphNodeProps.nodeId);

  const genres = selectors.genresForAlbum(graphNodeProps.nodeId);

  const { variant } = nodeContext.data;

  const addChildren = useSetAtom(forceGraphAddChildrenToNodeDefAtom);

  const handleZoomClick = () => {
    addChildren({
      parentId: graphNodeProps.nodeId,
      children: genres.map((id) => ({
        id,
        context: {
          data: {
            name: id,
          },
          type: "genre",
        },
      })),
    });
  };

  return (
    <ForceGraphNode {...graphNodeProps}>
      <div className="flex min-h-20 w-32 min-w-32 flex-col items-center gap-2">
        <div className="h-32">
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
        {variant !== "no-artist" && (
          <p className="text-center font-sans text-xs text-gray-400 hover:underline">
            {album ? album.artist : "Unknown Artist"}
          </p>
        )}
        {variant === "no-artist" && (
          <p className="text-center font-sans text-xs text-gray-400 hover:underline">
            {album
              ? album["release-date"].split("-")[0]
              : "Unknown Release Date"}
          </p>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleZoomClick();
          }}
          className="cursor-pointer rounded-full p-1 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
        >
          <ZoomIn width={16} height={16} />
        </button>
      </div>
    </ForceGraphNode>
  );
}
