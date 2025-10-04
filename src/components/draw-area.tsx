import { useAtomValue } from "jotai";
import { useEffect, useRef, type RefObject } from "react";
import { useBuilders } from "../d3/builders";
import { D3SvgRenderer } from "../d3/renderer";
import { albumsPoolAtom } from "../data/albums-pool";

function DrawArea() {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const albums = useAtomValue(albumsPoolAtom).getRandomAlbums(5);

  const builders = useBuilders();

  console.log(albums);

  useEffect(() => {
    if (!svgRef.current) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>
      );
    }

    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.init();

    console.log(renderer.svg);

    // Add first album
    renderer.add(
      builders.album({
        albumId: albums[0].mbid,
        x: 100,
        y: 100,
        width: 150,
      })
    );

    // Add second album
    renderer.add(
      builders.album({
        albumId: albums[1].mbid,
        x: 400,
        y: 100,
        width: 150,
      })
    );

    // Add connecting line with arrow
    //   svg
    //     .append("svg:line")
    //     .attr("x1", 200)
    //     .attr("y1", 150)
    //     .attr("x2", 300 - 15)
    //     .attr("y2", 150)
    //     .attr("stroke", "white")
    //     .attr("stroke-width", 2)
    //     .attr("marker-end", `url(#${defs.markers.triangle.id})`);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <svg
        ref={svgRef}
        width={800}
        height={600}
        style={{ border: "1px solid #333" }}
      ></svg>
    </div>
  );
}

export default DrawArea;
