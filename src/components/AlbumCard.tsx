import { useAtomValue } from "jotai";
import { ZoomIn } from "lucide-react";
import { getAlbumCoverUrl } from "../data/album-cover-urls";
import { albumDataSelectorsAtom } from "../data/albums-pool-atoms";
import { ForceGraphNode } from "./force-graph-node";

type AlbumCardProps = {
  nodeId: string;
  albumId: string;
  onClick?: (id: string) => void;
};

export function AlbumCardReact({ albumId, nodeId, onClick }: AlbumCardProps) {
  const selectors = useAtomValue(albumDataSelectorsAtom);
  const album = selectors.byMbid(albumId);
  const coverUrl = getAlbumCoverUrl(albumId);

  return (
    <ForceGraphNode nodeId={nodeId}>
      <div className="min-h-20 min-w-20">
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
      <p className="text-center font-sans text-xs text-gray-400 hover:underline">
        {album ? album.artist : "Unknown Artist"}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(albumId);
        }}
        className="cursor-pointer rounded-full p-1 text-gray-400 shadow-lg/25 shadow-gray-950 hover:bg-gray-700"
      >
        <ZoomIn width={16} height={16} />
      </button>
    </ForceGraphNode>
  );
}
