import * as d3 from "d3";
import React from "react";
import { COLORS } from "../constants/colors";

type D3RendererDef = (renderer: D3SvgRenderer) => void;

const allDefs: D3RendererDef[] = [
  (renderer) => {
    renderer.defs
      .append("marker")
      .attr("id", "link-arrow")
      .attr("viewBox", "0 0 11 11")
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
      .attr("stroke", COLORS.links)
      .attr("stroke-width", 1.2)
      .attr("stroke-linecap", "round");
  },
];

export class D3SvgRenderer {
  public svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  public defs: d3.Selection<SVGDefsElement, unknown, null, undefined>;

  constructor(svgRef: React.RefObject<SVGSVGElement>) {
    this.svg = d3.select(svgRef.current);
    this.defs = this.svg.append("svg:defs");

    allDefs.forEach((def) => def(this));
  }
}
