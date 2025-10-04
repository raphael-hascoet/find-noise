import * as d3 from "d3";
import type { Album } from "../data/albums-pool";
import type { D3ElementBuilder, D3SvgRenderer } from "./renderer";

type ArtistNode = {
  id: string; // artist-mbid
  type: "artist";
  label: string; // artist name
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type AlbumNode = {
  id: string; // album mbid
  type: "album";
  label: string; // album title
  avg?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type Node = ArtistNode | AlbumNode;

type Link = {
  source: string | Node; // album mbid
  target: string | Node; // artist-mbid
};

export function renderArtistWithAlbumsForce(
  renderer: D3SvgRenderer,
  artistMbid: string,
  albums: Album[],
  albumBuilder: (params: {
    albumId: string;
    x: number;
    y: number;
    width: number;
  }) => D3ElementBuilder,
  opts?: {
    width?: number;
    height?: number;
    albumCardWidth?: number;
  }
) {
  if (!albums.length) return () => {};

  const width = opts?.width ?? 800;
  const height = opts?.height ?? 600;
  const albumCardWidth = opts?.albumCardWidth ?? 150;

  // Build nodes/links
  const artistName = albums[0].artist; // all albums share the same artist
  const artistNode: ArtistNode = {
    id: artistMbid,
    type: "artist",
    label: artistName,
  };

  const albumNodes: AlbumNode[] = albums.map((a) => ({
    id: a.mbid,
    type: "album",
    label: a.release,
    avg: a["avg-rating"],
  }));

  const nodes: Node[] = [artistNode, ...albumNodes];

  const links: Link[] = albumNodes.map((n) => ({
    source: n.id,
    target: artistNode.id,
  }));

  // Use the existing SVG from renderer
  const svg = renderer.svg;

  // Create container groups that will hold the builders
  const albumGroups = new Map<
    string,
    d3.Selection<SVGGElement, unknown, null, undefined>
  >();

  // Lines for links
  const linkGroup = svg.append("g");
  const link = linkGroup
    .selectAll<SVGLineElement, Link>("line")
    .data(links)
    .join("line")
    .attr("stroke", "rgba(255,255,255,0.25)")
    .attr("stroke-width", 1);

  // Artist node (simple circle)
  const artistGroup = svg
    .append("g")
    .attr("class", "artist-node")
    .style("cursor", "pointer");

  artistGroup
    .append("circle")
    .attr("r", 18)
    .attr("fill", "#ffcc00")
    .attr("stroke", "rgba(0,0,0,0.6)")
    .attr("stroke-width", 1.2);

  artistGroup
    .append("text")
    .text(artistName)
    .attr("fill", "#eee")
    .attr("font-size", 13)
    .attr("text-anchor", "middle")
    .attr("dy", 4)
    .style("pointer-events", "none");

  // Store album card heights for proper centering
  const albumCardHeights = new Map<string, number>();

  // Create album cards at initial positions (will be updated by simulation)
  albumNodes.forEach((albumNode) => {
    // Use the album builder to create the card at position 0,0
    // We'll update its transform directly in the tick function
    albumBuilder({
      albumId: albumNode.id,
      x: 0,
      y: 0,
      width: albumCardWidth,
    })(renderer);

    // Find the position group that the builder just created
    const positionGroup = svg.select(`#position-album-${albumNode.id}`);
    const groupNode = positionGroup.node();
    if (groupNode) {
      albumGroups.set(albumNode.id, positionGroup as any);

      // Get the actual height of the album card for proper centering
      if (groupNode instanceof SVGGraphicsElement) {
        const bbox = groupNode.getBBox();
        albumCardHeights.set(albumNode.id, bbox.height);
      }
    }
  });

  function ticked() {
    // Update links
    link
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    // Update artist position
    if (artistNode.x !== undefined && artistNode.y !== undefined) {
      artistGroup.attr(
        "transform",
        `translate(${artistNode.x},${artistNode.y})`
      );
    }

    // Update album positions
    albumNodes.forEach((albumNode) => {
      if (albumNode.x !== undefined && albumNode.y !== undefined) {
        const group = albumGroups.get(albumNode.id);
        if (group) {
          // Translate to position, but also offset by half the card size to center it
          const cardHeight =
            albumCardHeights.get(albumNode.id) || albumCardWidth;
          group.attr(
            "transform",
            `translate(${albumNode.x - albumCardWidth / 2},${
              albumNode.y - cardHeight / 2
            })`
          );
        }
      }
    });
  }

  // Simulation - start after creating visual elements
  const sim = d3
    .forceSimulation(nodes as any)
    .force(
      "link",
      d3
        .forceLink(links as any)
        .id((d: any) => d.id)
        .distance(200)
        .strength(0.5)
    )
    .force(
      "charge",
      d3
        .forceManyBody()
        .strength((d: any) => (d.type === "artist" ? -300 : -100))
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d: any) =>
          d.type === "artist" ? 30 : albumCardWidth / 2 + 20
        )
    )
    .force(
      "radial",
      d3
        .forceRadial(
          (d: any) => (d.type === "artist" ? 0 : 250),
          width / 2,
          height / 2
        )
        .strength((d: any) => (d.type === "artist" ? 0.02 : 0.3))
    )
    .on("tick", ticked);

  // Cleanup helper for React useEffect
  return () => {
    sim.stop();
  };
}
