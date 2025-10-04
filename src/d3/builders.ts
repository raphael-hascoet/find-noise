import * as d3 from "d3";
import { useAtomValue } from "jotai";
import { getAlbumCoverUrl } from "../data/album-cover-urls";
import { albumsPoolAtom } from "../data/albums-pool";
import type { D3ElementBuilder, D3Position, D3SvgRenderer } from "./renderer";
import { wrapText } from "./utils/text";

// Interaction constants
export const INTERACTION = {
  hover: {
    translateY: -2,
    scale: 1.01,
  },
  pressed: {
    translateY: 4,
    scale: 0.985,
  },
} as const;

// Helper: Attach floating animations to a group
export const attachFloatingAnimations = (
  renderer: D3SvgRenderer,
  group: d3.Selection<SVGGElement, unknown, null, undefined>
) => {
  const groupNode = group.node();
  if (!groupNode) return;

  // Clone vertical float animation
  const floatAnimTemplate = renderer.defs.select("#floatAnimTemplate");
  const floatAnim = floatAnimTemplate.select("animateTransform").node();
  if (floatAnim) {
    groupNode.appendChild((floatAnim as SVGAnimateElement).cloneNode(true));
  }

  // Clone scale pulse animation
  const pulseAnimTemplate = renderer.defs.select("#pulseAnimTemplate");
  const pulseAnim = pulseAnimTemplate.select("animateTransform").node();
  if (pulseAnim) {
    groupNode.appendChild((pulseAnim as SVGAnimateElement).cloneNode(true));
  }
};

// Helper: Set pressed state for a group
export const setPressed = (
  renderer: D3SvgRenderer,
  group: d3.Selection<SVGGElement, unknown, null, undefined>,
  pressed: boolean
) => {
  if (pressed) {
    group.classed("pressed", true);
    // group.attr("filter", "url(#pressedShadow)");
    group.attr(
      "transform",
      `translate(0,${INTERACTION.pressed.translateY}) scale(${INTERACTION.pressed.scale})`
    );

    // Remove animations when pressed
    group.selectAll("animateTransform").remove();
  } else {
    group.classed("pressed", false);
    // group.attr("filter", "url(#floatShadow)");
    group.attr("transform", null);

    // Re-attach animations when released
    attachFloatingAnimations(renderer, group);
  }
};

export const useBuilders = () => {
  const albumPool = useAtomValue(albumsPoolAtom);

  return {
    album:
      ({
        albumId,
        x,
        y,
        width,
      }: { albumId: string } & D3Position & { width: number }) =>
      (renderer: D3SvgRenderer) => {
        const id = `album-${albumId}`;

        const album = albumPool.getAlbumByMbid(albumId);
        const coverUrl = getAlbumCoverUrl(albumId);

        console.log({ album, coverUrl });

        const wrapperPadding = 20;

        // Create outer group for positioning
        const positionGroup = renderer.svg
          .append("g")
          .attr("id", `position-${id}`)
          .attr("transform", `translate(${x},${y})`);

        // Create inner group for animations and filter
        const group = positionGroup
          .append("g")
          .attr("id", `group-${id}`)
          .attr("class", "album-card")
          .attr("filter", "url(#floatShadow)")
          .style("cursor", "pointer")
          .style("outline", "none");

        // Background rect
        const bg = group
          .append("rect")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", width)
          .attr("height", 10) // Temporary, will adjust based on content
          .attr("fill", "#111")
          .attr("rx", 10)
          .attr("ry", 10);

        const coverImageSize = width - wrapperPadding * 2;
        // Album cover image
        group
          .append("svg:image")
          .attr("xlink:href", coverUrl)
          .attr("x", wrapperPadding)
          .attr("y", wrapperPadding)
          .attr("width", coverImageSize)
          .attr("height", coverImageSize);

        const releaseTextY = wrapperPadding + coverImageSize + 25;

        console.log(album);
        const release = group
          .append("text")
          .text(album ? `${album.release}` : "Unknown Album")
          .attr("x", width / 2)
          .attr("y", releaseTextY)
          .attr("fill", "#eee")
          .attr("font-size", 12)
          .attr("font-family", "sans-serif")
          .attr("text-anchor", "middle")
          .attr("pointer-events", "none");

        release.call(wrapText, width - wrapperPadding * 2, 1.2);

        const releaseBox = release.node()?.getBBox();
        const nextY = releaseBox ? releaseBox.y + releaseBox.height + 15 : 0;

        group
          .append("text")
          .text(album ? `${album.artist}` : "Unknown Artist")
          .attr("x", width / 2)
          .attr("y", nextY)
          .attr("fill", "#ccc")
          .attr("font-size", 12)
          .attr("font-family", "sans-serif")
          .attr("text-anchor", "middle")
          .attr("pointer-events", "none")
          .call(wrapText, width - wrapperPadding * 2, 1.2);

        // After content is in place, compute overall content bbox
        // Exclude the background rect from the bbox calculation if needed
        const contentBBox = group.node()!.getBBox();

        // Compute desired height with bottom padding
        const computedHeight = Math.ceil(
          contentBBox.y + contentBBox.height + wrapperPadding
        );

        // Optionally enforce a min height (e.g., cover + padding)
        const minHeight = wrapperPadding + coverImageSize + 40; // example
        const finalHeight = Math.max(computedHeight, minHeight);

        // Update background height
        bg.attr("height", finalHeight);

        // Attach floating animations to inner group
        attachFloatingAnimations(renderer, group);

        // Mouse interactions
        let isPressed = false;

        group.on("mouseenter", () => {
          bg.transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("fill", "#131313");
        });

        group.on("mouseleave", () => {
          bg.transition()
            .duration(200)
            .ease(d3.easeCubicOut)
            .attr("fill", "#111");
          if (isPressed) {
            setPressed(renderer, group, false);
            isPressed = false;
          }
        });

        group.on("mousedown", () => {
          console.log("mousedown");

          setPressed(renderer, group, true);
          isPressed = true;
        });

        group.on("mouseup", () => {
          console.log("mouseup");
          setPressed(renderer, group, false);
          isPressed = false;
        });

        // Keyboard accessibility
        group.attr("tabindex", 0);

        group.on("keydown", (event) => {
          if (event.code === "Space" || event.code === "Enter") {
            event.preventDefault();
            if (!isPressed) {
              setPressed(renderer, group, true);
              isPressed = true;
            }
          }
        });

        group.on("keyup", (event) => {
          if (event.code === "Space" || event.code === "Enter") {
            event.preventDefault();
            if (isPressed) {
              setPressed(renderer, group, false);
              isPressed = false;
            }
          }
        });
      },
  } as const satisfies Record<string, (...args: any[]) => D3ElementBuilder>;
};
