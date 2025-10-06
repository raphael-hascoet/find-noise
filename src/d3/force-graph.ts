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
  artistBuilder: (params: {
    artistMbid: string;
    artistName: string;
    x: number;
    y: number;
    width: number;
  }) => D3ElementBuilder,
  opts?: {
    width?: number;
    height?: number;
    albumCardWidth?: number;
    artistCardWidth?: number;
  }
) {
  if (!albums.length) return () => {};

  const width = opts?.width ?? 800;
  const height = opts?.height ?? 600;
  const albumCardWidth = opts?.albumCardWidth ?? 150;
  const artistCardWidth = opts?.artistCardWidth ?? 120;

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

  // Create a hand-drawn style arrow marker (stroked, not filled)
  const arrowMarker = renderer.defs
    .append("marker")
    .attr("id", "link-arrow")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", 9)
    .attr("refY", 5)
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("orient", "auto");

  // Two lines forming a > shape
  arrowMarker
    .append("line")
    .attr("x1", 3)
    .attr("y1", 2)
    .attr("x2", 10)
    .attr("y2", 5)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.2);

  arrowMarker
    .append("line")
    .attr("x1", 3)
    .attr("y1", 8)
    .attr("x2", 10)
    .attr("y2", 5)
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.2);

  // Create container groups that will hold the builders
  const albumGroups = new Map<
    string,
    d3.Selection<SVGGElement, unknown, null, undefined>
  >();

  // Create artist card using the builder
  artistBuilder({
    artistMbid,
    artistName,
    x: 0,
    y: 0,
    width: artistCardWidth,
  })(renderer);

  // Store card dimensions for proper centering and link calculations
  const albumCardBBoxes = new Map<string, DOMRect>();
  const artistCardBBox: { bbox: DOMRect | null } = { bbox: null };

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

      // Get the actual bounding box of the album card
      if (groupNode instanceof SVGGraphicsElement) {
        const bbox = groupNode.getBBox();
        albumCardBBoxes.set(albumNode.id, bbox);
      }
    }
  });

  // Get artist card bounding box
  const artistPositionGroup = svg.select(`#position-artist-${artistMbid}`);
  const artistGroupNode = artistPositionGroup.node();
  if (artistGroupNode && artistGroupNode instanceof SVGGraphicsElement) {
    artistCardBBox.bbox = artistGroupNode.getBBox();
  }

  // Lines for links - wrap each in a group for animation
  // Render AFTER album cards so they appear above the shadows
  const linkGroup = svg.append("g");
  const linkGroups = linkGroup
    .selectAll<SVGGElement, Link>("g")
    .data(links)
    .join("g")
    .attr("filter", "url(#floatShadow)"); // Apply shadow to the group so it includes the arrow marker

  // Add floating animation to each link group
  linkGroups.each(function () {
    const group = d3.select(this);
    const groupNode = group.node();
    if (!groupNode) return;

    // Clone vertical float animation
    const floatAnimTemplate = renderer.defs.select("#floatAnimTemplate");
    const floatAnim = floatAnimTemplate.select("animateTransform").node();
    if (floatAnim) {
      groupNode.appendChild((floatAnim as SVGAnimateElement).cloneNode(true));
    }
  });

  const link = linkGroups
    .append("line")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("marker-end", "url(#link-arrow)")
    .style("pointer-events", "none");

  function ticked() {
    // Update links with gaps calculated from actual bounding boxes
    link
      .attr("x1", (d: any) => {
        // Calculate angle from album to artist
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const angle = Math.atan2(dy, dx);

        // Get actual bbox for this album card
        const bbox = albumCardBBoxes.get(d.source.id);
        if (!bbox) return d.source.x;

        // Calculate distance from center to edge along the angle
        // Use half-width and half-height of the actual bbox
        const halfWidth = bbox.width / 2;
        const halfHeight = bbox.height / 2;

        // Calculate intersection point with rectangle edge
        const tanAngle = Math.abs(Math.tan(angle));
        let distance;
        if (tanAngle * halfWidth <= halfHeight) {
          // Intersects left or right edge
          distance = Math.abs(halfWidth / Math.cos(angle));
        } else {
          // Intersects top or bottom edge
          distance = Math.abs(halfHeight / Math.sin(angle));
        }

        const gap = 10; // pixels of space between link and card edge
        return d.source.x + Math.cos(angle) * (distance + gap);
      })
      .attr("y1", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const angle = Math.atan2(dy, dx);

        const bbox = albumCardBBoxes.get(d.source.id);
        if (!bbox) return d.source.y;

        const halfWidth = bbox.width / 2;
        const halfHeight = bbox.height / 2;

        const tanAngle = Math.abs(Math.tan(angle));
        let distance;
        if (tanAngle * halfWidth <= halfHeight) {
          distance = Math.abs(halfWidth / Math.cos(angle));
        } else {
          distance = Math.abs(halfHeight / Math.sin(angle));
        }

        const gap = 10;
        return d.source.y + Math.sin(angle) * (distance + gap);
      })
      .attr("x2", (d: any) => {
        // Calculate angle from artist to album
        const dx = d.source.x - d.target.x;
        const dy = d.source.y - d.target.y;
        const angle = Math.atan2(dy, dx);

        const bbox = artistCardBBox.bbox;
        if (!bbox) return d.target.x;

        const halfWidth = bbox.width / 2;
        const halfHeight = bbox.height / 2;

        const tanAngle = Math.abs(Math.tan(angle));
        let distance;
        if (tanAngle * halfWidth <= halfHeight) {
          distance = Math.abs(halfWidth / Math.cos(angle));
        } else {
          distance = Math.abs(halfHeight / Math.sin(angle));
        }

        const gap = 10;
        return d.target.x + Math.cos(angle) * (distance + gap);
      })
      .attr("y2", (d: any) => {
        const dx = d.source.x - d.target.x;
        const dy = d.source.y - d.target.y;
        const angle = Math.atan2(dy, dx);

        const bbox = artistCardBBox.bbox;
        if (!bbox) return d.target.y;

        const halfWidth = bbox.width / 2;
        const halfHeight = bbox.height / 2;

        const tanAngle = Math.abs(Math.tan(angle));
        let distance;
        if (tanAngle * halfWidth <= halfHeight) {
          distance = Math.abs(halfWidth / Math.cos(angle));
        } else {
          distance = Math.abs(halfHeight / Math.sin(angle));
        }

        const gap = 10;
        return d.target.y + Math.sin(angle) * (distance + gap);
      });

    // Update artist position
    if (artistNode.x !== undefined && artistNode.y !== undefined) {
      const bbox = artistCardBBox.bbox;
      if (bbox) {
        artistPositionGroup.attr(
          "transform",
          `translate(${artistNode.x - bbox.width / 2},${
            artistNode.y - bbox.height / 2
          })`
        );
      }
    }

    // Update album positions
    albumNodes.forEach((albumNode) => {
      if (albumNode.x !== undefined && albumNode.y !== undefined) {
        const group = albumGroups.get(albumNode.id);
        const bbox = albumCardBBoxes.get(albumNode.id);
        if (group && bbox) {
          // Translate to position, but also offset by half the card size to center it
          group.attr(
            "transform",
            `translate(${albumNode.x - bbox.width / 2},${
              albumNode.y - bbox.height / 2
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
        .radius((d: any) => {
          if (d.type === "artist") {
            return artistCardBBox.bbox
              ? Math.max(artistCardBBox.bbox.width, artistCardBBox.bbox.height) /
                  2 +
                  20
              : 30;
          }
          return albumCardWidth / 2 + 20;
        })
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
