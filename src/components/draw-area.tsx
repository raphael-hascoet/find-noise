import { useAtomValue } from "jotai";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useBuilders } from "../d3/builders";
import { renderArtistWithAlbumsForce } from "../d3/force-graph";
import { D3SvgRenderer } from "../d3/renderer";
import { albumsPoolAtom } from "../data/albums-pool";

function DrawArea() {
  const svgRef = useRef<SVGSVGElement>(null);
  const rendererRef = useRef<D3SvgRenderer | null>(null);

  const albumsPool = useAtomValue(albumsPoolAtom);
  const builders = useBuilders();

  // Get a random artist and their albums
  const { artistMbid, albums } = useMemo(() => {
    const randomAlbums = albumsPool.getRandomAlbums(1);
    if (!randomAlbums.length) return { artistMbid: "", albums: [] };

    const artistMbid = randomAlbums[0]["artist-mbid"];
    const artistAlbums = albumsPool.getAlbumsByArtistMbid(artistMbid);

    return { artistMbid, albums: artistAlbums };
  }, [albumsPool]);

  console.log({ artistMbid, albums });

  useEffect(() => {
    if (!svgRef.current || !albums.length) return;

    if (!rendererRef.current) {
      rendererRef.current = new D3SvgRenderer(
        svgRef as RefObject<SVGSVGElement>
      );
    }

    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.init();

    console.log(renderer.svg);

    // Render force-directed graph with album and artist builders
    const cleanup = renderArtistWithAlbumsForce(
      renderer,
      artistMbid,
      albums,
      builders.album,
      builders.artist,
      {
        width: 800,
        height: 600,
        albumCardWidth: 100,
        artistCardWidth: 120,
      }
    );

    return cleanup;
  }, [artistMbid, albums, builders]);

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
