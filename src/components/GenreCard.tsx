import { ForceGraphNode, type ForceGraphNodeBase } from "./force-graph-node";

type genreCardProps = {
  genreName: string;
} & ForceGraphNodeBase;

export function GenreCardReact({ nodeId, genreName, positioned }: genreCardProps) {
  return (
    <ForceGraphNode nodeId={nodeId} positioned={positioned}>
      <span className="text-center font-sans text-sm text-gray-300">
        {genreName}
      </span>
    </ForceGraphNode>
  );
}
