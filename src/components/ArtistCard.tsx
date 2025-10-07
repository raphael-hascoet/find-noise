import { useSetAtom } from "jotai";
import { useLayoutEffect, useRef } from "react";
import { ForceGraphNode } from "./force-graph-node";
import { registerForceGraphNodeAtom } from "./force-graph/force-graph-manager";

type ArtistCardProps = {
  nodeId: string;
  artistName: string;
};

export function ArtistCardReact({
  artistName,

  nodeId,
}: ArtistCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const registerForceGraphNode = useSetAtom(registerForceGraphNodeAtom);

  useLayoutEffect(() => {
    if (!ref.current) return;

    registerForceGraphNode({
      id: nodeId,
      loaded: true,
      width: ref.current.offsetWidth,
      height: ref.current.offsetHeight,
    });
  }, [nodeId, registerForceGraphNode]);

  return (
    <ForceGraphNode nodeId={nodeId}>
      <span className="text-center font-sans text-sm text-gray-300">
        {artistName}
      </span>
    </ForceGraphNode>
  );
}
