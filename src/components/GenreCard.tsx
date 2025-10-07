import { ForceGraphNode } from "./force-graph-node";

type genreCardProps = {
  nodeId: string;
  genreName: string;
};

export function GenreCardReact({ nodeId, genreName }: genreCardProps) {
  return (
    <ForceGraphNode nodeId={nodeId}>
      <span className="text-center font-sans text-sm text-gray-300">
        {genreName}
      </span>
    </ForceGraphNode>
  );
}
