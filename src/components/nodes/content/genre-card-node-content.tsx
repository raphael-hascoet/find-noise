import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

type genreCardProps = {
  genreName: string;
} & NodeContentWrapperPropsBase;

export function GenreCardNodeContent({
  nodeId,
  genreName,
  positioned,
}: genreCardProps) {
  return (
    <NodeContentWrapper nodeId={nodeId} positioned={positioned}>
      <span className="text-center font-sans text-sm text-gray-300">
        {genreName}
      </span>
    </NodeContentWrapper>
  );
}
