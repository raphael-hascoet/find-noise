import * as d3 from "d3";
import { useSetAtom } from "jotai";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { D3SvgRenderer } from "../../d3/renderer";
import { AlbumCardReact } from "../AlbumCard";
import { ArtistCardReact } from "../ArtistCard";
import { GenreCardReact } from "../GenreCard";
import { ForceGraphLinks, type ForceGraphLink } from "./force-graph-links";
import { forceGraphInitNodesAtom } from "./force-graph-manager";

export type ForceGraphNode = {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  onZoomClick?: () => void;
} & ForceGraphNodeDefByType;

export type ForceGraphNodeDefBase = {
  id: string;
  children?: ForceGraphNodeDef[];
  onZoomClick?: () => void;
};

export type ForceGraphNodeDefByType =
  | {
      type: "artist";
      data: {
        name: string;
      };
    }
  | {
      type: "album";
      data: {
        title: string;
        artist: string;
      };
    }
  | {
      type: "genre";
      data: {
        name: string;
      };
    };

export type ForceGraphNodeDef = ForceGraphNodeDefByType & ForceGraphNodeDefBase;

type ForceGraphProps = {
  nodeDef: ForceGraphNodeDef;
  width?: number;
  height?: number;
  albumCardWidth?: number;
  artistCardWidth?: number;
};

export const ForceGraph = function ForceGraph({
  nodeDef,
  width = 800,
  height = 600,
  albumCardWidth = 100,
  artistCardWidth = 120,
}: ForceGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const forceGraphInitNodes = useSetAtom(forceGraphInitNodesAtom);

  if (!nodeDef) {
    return null;
  }

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
    // renderer.init();

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

  const [positions, setPositions] = useState(
    () => new Map<string, { x: number; y: number }>(),
  );
  const [transform, setTransform] = useState(d3.zoomIdentity);

  const simulationRef = useRef<d3.Simulation<
    d3.SimulationNodeDatum,
    undefined
  > | null>(null);

  const simNodes = useMemo<ForceGraphNode[]>(() => {
    const { children, ...rest } = nodeDef;

    return [
      { ...rest },
      ...(children ?? []).map((child) => ({
        ...child,
      })),
    ];
  }, [nodeDef.id]);

  const simLinks = useMemo<ForceGraphLink[]>(
    () =>
      (nodeDef.children ?? []).map((a) => ({
        source: nodeDef,
        target: a,
      })),
    [nodeDef.id],
  );

  useEffect(() => {
    forceGraphInitNodes(
      simNodes.map((node) => ({ id: node.id, loaded: false })),
    );
  }, [nodeDef.id]);

  useEffect(() => {
    const simulation = d3
      .forceSimulation(simNodes as d3.SimulationNodeDatum[])
      .force(
        "link",
        d3
          .forceLink(simLinks as any)
          .id((d: any) => d.id)
          .distance(200)
          .strength(0.5),
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength((d: any) => (d.type === "artist" ? -300 : -100)),
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d: any) =>
            d.type === "artist"
              ? artistCardWidth / 2 + 20
              : albumCardWidth / 2 + 20,
          ),
      )
      .force(
        "radial",
        d3
          .forceRadial(
            (d: any) => (d.type === "artist" ? 0 : 250),
            width / 2,
            height / 2,
          )
          .strength((d: any) => (d.type === "artist" ? 0.02 : 0.3)),
      );

    simulation.alpha(1).restart();

    let raf = 0;
    const prev = new Map<string, { x: number; y: number }>();

    function ticked() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // Build next positions
        const next = new Map<string, { x: number; y: number }>();
        for (const n of simNodes) {
          next.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 });
        }
        // Skip update if movement is negligible
        let changed = prev.size !== next.size;
        if (!changed) {
          for (const [id, p] of next) {
            const q = prev.get(id);
            const dx = p.x - (q?.x ?? 0) || 0;
            const dy = p.y - (q?.y ?? 0) || 0;
            if (dx * dx + dy * dy > 0.25) {
              // > 0.5px total movement
              changed = true;
              break;
            }
          }
        }
        if (changed) {
          setPositions(next);
          prev.clear();
          for (const [k, v] of next) prev.set(k, v);
        }
      });
    }

    simulation.on("tick", ticked);
    simulationRef.current = simulation;

    return () => {
      simulation.on("tick", null);
      simulation.stop();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    simNodes, // memoized
    simLinks, // memoized
    width,
    height,
    albumCardWidth,
    artistCardWidth,
  ]);

  useEffect(() => {
    const svg = d3.select((svgRef as RefObject<SVGSVGElement>).current);
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 4])
        .on("zoom", (e) => setTransform(e.transform)),
    );
  }, []);

  const applyDrag = (el: HTMLElement | null, nodeId: string) => {
    if (!el || !svgRef.current) return;

    // Find the actual node object used in the simulation array
    // Important: this object must be the same one the simulation mutates.
    const node = simNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const svgEl = svgRef.current;
    const sel = d3.select(el as any);

    // Ensure we don't stack duplicate handlers on re-render
    sel.on(".drag", null);

    // Make the element behave well for dragging
    sel
      .style("cursor", "grab")
      .style("user-select", "none")
      .style("touch-action", "none");

    sel.call(
      d3
        .drag<HTMLElement, unknown>()
        .container(() => svgEl) // normalize pointer calculations
        .on("start", (event) => {
          // Only start if the event originated on this element
          if (
            event.sourceEvent?.target &&
            !el.contains(event.sourceEvent.target)
          ) {
            return;
          }
          sel.style("cursor", "grabbing");

          // Warm up the simulation so forces update smoothly
          simulationRef.current?.alphaTarget(0.3).restart();

          // Fix node in place at its current position
          node.fx = node.x;
          node.fy = node.y;

          // Prevent native text/image drag
          if (event.sourceEvent?.preventDefault)
            event.sourceEvent.preventDefault();
        })
        .on("drag", (event) => {
          // Use client coordinates -> SVG viewport coords -> invert zoom
          const se = event.sourceEvent as
            | MouseEvent
            | PointerEvent
            | TouchEvent;

          let clientX: number | undefined;
          let clientY: number | undefined;
          if ("clientX" in se) {
            clientX = (se as MouseEvent).clientX;
            clientY = (se as MouseEvent).clientY;
          } else {
            const t = (se as any).touches?.[0];
            clientX = t?.clientX;
            clientY = t?.clientY;
          }
          if (clientX == null || clientY == null) return;

          const rect = svgEl.getBoundingClientRect();
          const vx = clientX - rect.left;
          const vy = clientY - rect.top;

          const [wx, wy] = transform.invert([vx, vy]); // world coords (force space)

          node.fx = wx;
          node.fy = wy;
        })
        .on("end", () => {
          sel.style("cursor", "grab");
          node.fx = null;
          node.fy = null;
          simulationRef.current?.alphaTarget(0);
        }) as any,
    );
  };

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
        <ForceGraphLinks
          links={simLinks}
          transform={transform}
          positions={positions}
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      >
        {simNodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const screen = toScreen(p);
          return (
            <div
              key={n.id}
              ref={(el) => applyDrag(el, n.id)}
              style={{
                position: "absolute",
                left: screen.left,
                top: screen.top,
                transform: `translate(-50%, -50%) scale(${transform.k})`,
                pointerEvents: "auto",
                userSelect: "none",
                touchAction: "none",
                cursor: "grab",
              }}
            >
              {n.type === "artist" ? (
                <ArtistCardReact artistName={n.data.name} nodeId={n.id} />
              ) : n.type === "album" ? (
                <AlbumCardReact
                  albumId={n.id}
                  nodeId={n.id}
                  onClick={n.onZoomClick}
                />
              ) : n.type === "genre" ? (
                <GenreCardReact genreName={n.data.name} nodeId={n.id} />
              ) : null}
            </div>
          );
        })}
      </div>
    </>
  );
};
