import * as d3 from "d3";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState, type RefObject } from "react";
import { D3SvgRenderer } from "../../d3/renderer";
import { albumDataSelectorsAtom } from "../../data/albums-pool-atoms";
import { AlbumCardReact } from "../AlbumCard";
import { ArtistCardReact } from "../ArtistCard";
import { GenreCardReact } from "../GenreCard";
import { initForceGraphDimensionsAtom } from "./force-graph-dimensions";
import {
  forceGraphGetRootNodeDefAtom,
  type ForceGraphNodeDef,
  type ForceGraphNodeDefByType,
} from "./force-graph-nodes-manager";
import {
  calculatedNodeDefsAtom,
  calculatedNodePositionsAtom,
  setActiveViewAtom,
} from "./force-graph-views";

export type ForceGraphNode = {
  id: string;
  onZoomClick?: () => void;
  context: ForceGraphNodeDefByType;
};

type ForceGraphProps = {
  // positions: Map<string, { x: number; y: number }>;
  width?: number;
  height?: number;
  nodeDefs: Map<string, ForceGraphNodeDef>;
};

export const ForceGraph = function (
  props: Omit<ForceGraphProps, "positions" | "nodeDefs">,
) {
  const nodeDef = useAtomValue(forceGraphGetRootNodeDefAtom);
  const selectors = useAtomValue(albumDataSelectorsAtom);
  const setActiveView = useSetAtom(setActiveViewAtom);
  const nodeDefs = useAtomValue(calculatedNodeDefsAtom);

  // Set the view configuration - nodes are built automatically
  useEffect(() => {
    if (!nodeDef || nodeDef.context.type !== "artist") return;

    const albums = selectors.byArtistMbid(nodeDef.id);

    setActiveView({
      key: "albumsForArtist",
      data: {
        artistId: nodeDef.id,
        artistName: nodeDef.context.data.name,
        albums: albums.map((a) => ({
          id: a.mbid,
          releaseYear: a["release-date"].split("-")[0] || "Unknown",
        })),
      },
    });
  }, [nodeDef, selectors, setActiveView]);

  if (!nodeDef || !nodeDefs) {
    return null;
  }

  return <ForceGraphContent nodeDefs={nodeDefs} {...props} />;
};

const ForceGraphContent = function ({
  nodeDefs,
  width = 800,
  height = 600,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const initForceGraphDimensions = useSetAtom(initForceGraphDimensionsAtom);
  const positions = useAtomValue(calculatedNodePositionsAtom);

  // Initialize renderer for defs (filters, markers, etc.)
  useEffect(() => {
    if (!svgRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>,
      );
    }

    const renderer = rendererRef.current;
    if (!renderer) return;

    // Add arrow marker for links
    renderer.defs
      .append("marker")
      .attr("id", "link-arrow")
      .attr("viewBox", "0 0 10 10")
      .attr("refX", 9)
      .attr("refY", 5)
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("orient", "auto")
      .selectAll("line")
      .data([
        { x1: 3, y1: 2, x2: 10, y2: 5 },
        { x1: 3, y1: 8, x2: 10, y2: 5 },
      ])
      .join("line")
      .attr("x1", (d) => d.x1)
      .attr("y1", (d) => d.y1)
      .attr("x2", (d) => d.x2)
      .attr("y2", (d) => d.y2)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2);
  }, []);

  const [transform, setTransform] = useState(d3.zoomIdentity.scale(0.5));

  // Initialize dimensions for all nodes
  useEffect(() => {
    initForceGraphDimensions(
      Array.from(nodeDefs.keys()).map((id) => ({ id, loaded: false })),
    );
  }, [nodeDefs, initForceGraphDimensions]);

  useEffect(() => {
    const svg = d3.select((svgRef as RefObject<SVGSVGElement>).current);
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()

        .scaleExtent([0.2, 4])
        .on("zoom", (e) => setTransform(e.transform)),
    );
  }, []);

  const t = transform;
  const toScreen = (p: { x: number; y: number }) => ({
    left: p.x * t.k + t.x,
    top: p.y * t.k + t.y,
  });

  return (
    <>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        style={{ border: "1px solid #333" }}
      >
        {/* <ForceGraphLinks
          links={simLinks}
          transform={transform}
          positions={positions}
        /> */}
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {Array.from(nodeDefs.values()).map((n) => {
          const p = positions?.get(n.id);

          const screen = p ? toScreen(p) : { left: 0, top: 0 };
          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: screen.left,
                top: screen.top,
                transform: `scale(${transform.k})`,
                pointerEvents: "auto",
                transformOrigin: "top left",
              }}
            >
              {n.context.type === "artist" ? (
                <ArtistCardReact
                  artistName={n.context.data.name}
                  nodeId={n.id}
                  positioned={!!p}
                />
              ) : n.context.type === "album" ? (
                <AlbumCardReact
                  nodeId={n.id}
                  positioned={!!p}
                  onClick={n.onZoomClick}
                />
              ) : n.context.type === "genre" ? (
                <GenreCardReact genreName={n.context.data.name} nodeId={n.id} />
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};
