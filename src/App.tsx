import * as d3 from "d3";
import { useEffect, useRef } from "react";
import "./App.css";

function App() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Define nodes
    const nodes = [
      { id: "node1", x: 300, y: 300 },
      { id: "node2", x: 500, y: 300 },
    ];

    // Define link
    const links = [{ source: nodes[0], target: nodes[1] }];

    // Draw link
    svg
      .append("line")
      .attr("x1", links[0].source.x)
      .attr("y1", links[0].source.y)
      .attr("x2", links[0].target.x)
      .attr("y2", links[0].target.y)
      .attr("stroke", "#999")
      .attr("stroke-width", 2);

    // Draw nodes
    svg
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y)
      .attr("r", 20)
      .attr("fill", "#69b3a2")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels
    svg
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .attr("x", (d) => d.x)
      .attr("y", (d) => d.y + 40)
      .attr("text-anchor", "middle")
      .attr("fill", "#fff")
      .text((d) => d.id);
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

export default App;
