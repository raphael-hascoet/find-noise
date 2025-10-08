import { ForceGraphNode } from "./force-graph-node";

type ArtistCardProps = {
  nodeId: string;
  artistName: string;
};

export function ArtistCardReact({
  artistName,

  nodeId,
}: ArtistCardProps) {
  return (
    <ForceGraphNode nodeId={nodeId}>
      <span className="text-center font-sans text-sm text-gray-300">
        {artistName}
      </span>
    </ForceGraphNode>
  );
}
