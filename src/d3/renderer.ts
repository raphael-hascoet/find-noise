import * as d3 from "d3";
import React from "react";
import { createFloatingFilters } from "./shadows";

// Animation constants
const FLOAT_ANIMATION = {
  duration: "4s",
  translateRange: 1.5, // pixels up/down
  easing: "0.45 0.05 0.55 0.95",
} as const;

type D3RendererDefKeys = { markers: ["triangle"] };

type D3RendererDefs = {
  [K in keyof D3RendererDefKeys]: {
    [S in D3RendererDefKeys[K][number]]: {
      id: string;
      def: (renderer: D3SvgRenderer) => void;
    };
  };
};

const defs: D3RendererDefs = {
  markers: {
    triangle: {
      id: "triangle",
      def: (renderer) => {
        renderer.defs
          .append("svg:marker")
          .attr("id", "triangle")
          .attr("refX", 6)
          .attr("refY", 6)
          .attr("markerWidth", 30)
          .attr("markerHeight", 30)
          .attr("orient", "auto")
          .append("path")
          .attr("d", "M 0 0 12 6 0 12 3 6")
          .style("fill", "white");
      },
    },
  },
};

export class D3SvgRenderer {
  public svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  public defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;

  constructor(svgRef: React.RefObject<SVGSVGElement>) {
    this.svg = d3.select(svgRef.current);
    this.defs = this.svg.append("svg:defs");
  }

  init() {
    this.clear();
    this.defs = this.svg.append("svg:defs");

    // Add standard defs (markers, etc.)
    Object.entries(defs).forEach(([_, value]) => {
      Object.entries(value).forEach(([_, { def }]) => {
        def(this);
      });
    });

    // Create floating animation filters
    createFloatingFilters(this);

    // Create floating animation templates
    this.createFloatingAnimationTemplates();
  }

  clear() {
    this.svg.selectAll("*").remove();
  }

  add(builder: D3ElementBuilder) {
    builder(this);
  }

  private createFloatingAnimationTemplates() {
    // Vertical float animation template
    const floatAnimTemplate = this.defs
      .append("g")
      .attr("id", "floatAnimTemplate");

    const range = FLOAT_ANIMATION.translateRange;
    floatAnimTemplate
      .append("animateTransform")
      .attr("attributeName", "transform")
      .attr("type", "translate")
      .attr("dur", FLOAT_ANIMATION.duration)
      .attr("values", `0,${-range}; 0,${range}; 0,${-range}`)
      .attr("keyTimes", "0;0.5;1")
      .attr("calcMode", "spline")
      .attr(
        "keySplines",
        `${FLOAT_ANIMATION.easing}; ${FLOAT_ANIMATION.easing}`,
      )
      .attr("repeatCount", "indefinite");
  }
}

type D3ElementBuilder = (renderer: D3SvgRenderer) => void;
