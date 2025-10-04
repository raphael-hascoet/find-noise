import type { D3SvgRenderer } from "./renderer";

// Shadow filter constants
export const SHADOW_FILTERS = {
  float: {
    blur: 6,
    offsetY: 8,
    opacity: 0.35,
  },
  pressed: {
    blur: 3,
    offsetY: 2,
    opacity: 0.5,
  },
} as const;

export function createFloatingFilters(renderer: D3SvgRenderer) {
  // Floating shadow filter - soft, elevated
  const floatFilter = renderer.defs
    .append("filter")
    .attr("id", "floatShadow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  floatFilter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", SHADOW_FILTERS.float.blur)
    .attr("result", "blur");

  floatFilter
    .append("feOffset")
    .attr("in", "blur")
    .attr("dx", 0)
    .attr("dy", SHADOW_FILTERS.float.offsetY)
    .attr("result", "offsetBlur");

  floatFilter
    .append("feColorMatrix")
    .attr("in", "offsetBlur")
    .attr(
      "values",
      `0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 ${SHADOW_FILTERS.float.opacity} 0`
    )
    .attr("result", "shadow");

  floatFilter
    .append("feBlend")
    .attr("in", "SourceGraphic")
    .attr("in2", "shadow")
    .attr("mode", "normal");

  // Pressed shadow filter - tighter, closer
  const pressedFilter = renderer.defs
    .append("filter")
    .attr("id", "pressedShadow")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("width", "200%")
    .attr("height", "200%");

  pressedFilter
    .append("feGaussianBlur")
    .attr("in", "SourceAlpha")
    .attr("stdDeviation", SHADOW_FILTERS.pressed.blur)
    .attr("result", "blur");

  pressedFilter
    .append("feOffset")
    .attr("in", "blur")
    .attr("dx", 0)
    .attr("dy", SHADOW_FILTERS.pressed.offsetY)
    .attr("result", "offsetBlur");

  pressedFilter
    .append("feColorMatrix")
    .attr("in", "offsetBlur")
    .attr(
      "values",
      `0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 ${SHADOW_FILTERS.pressed.opacity} 0`
    )
    .attr("result", "shadow");

  pressedFilter
    .append("feBlend")
    .attr("in", "SourceGraphic")
    .attr("in2", "shadow")
    .attr("mode", "normal");
}
