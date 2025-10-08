import { ForceGraphNode, type ForceGraphNodeBase } from "./force-graph-node";

type ArtistCardProps = {
  artistName: string;
} & ForceGraphNodeBase;

export function ArtistCardReact({
  artistName,
  ...graphNodeProps
}: ArtistCardProps) {
  return (
    <ForceGraphNode {...graphNodeProps}>
      <span className="text-center font-sans text-sm text-gray-300">
        {artistName}
      </span>
    </ForceGraphNode>
  );
}
