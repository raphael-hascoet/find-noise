import { ViewNode, type ViewNodeBase } from "./view-node";

type genreCardProps = {
  genreName: string;
} & ViewNodeBase;

export function GenreCardReact({ nodeId, genreName, positioned }: genreCardProps) {
  return (
    <ViewNode nodeId={nodeId} positioned={positioned}>
      <span className="text-center font-sans text-sm text-gray-300">
        {genreName}
      </span>
    </ViewNode>
  );
}
