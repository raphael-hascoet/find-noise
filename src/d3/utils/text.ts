import * as d3 from "d3";

export function wrapText(
  textSelection: d3.Selection<SVGTextElement, unknown, null, undefined>,
  maxWidth: number,
  lineHeightEm = 1.1
) {
  textSelection.each(function () {
    const text = d3.select(this);
    const words = (text.text() || "").split(/\s+/).filter(Boolean);
    const x = +text.attr("x") || 0;
    const y = +text.attr("y") || 0;
    const dy = parseFloat(text.attr("dy")) || 0;
    const anchor = text.attr("text-anchor") || "start";
    const fontSize = parseFloat(window.getComputedStyle(this).fontSize) || 10;
    const lineHeight = lineHeightEm * fontSize;

    text.text(null);

    let line: string[] = [];
    let lineNumber = 0;
    let tspan = text
      .append("tspan")
      .attr("x", x)
      .attr("y", y)
      .attr("dy", dy + "em")
      .attr("text-anchor", anchor);

    for (let i = 0; i < words.length; i++) {
      line.push(words[i]);
      tspan.text(line.join(" "));
      const node = tspan.node();
      if (!node) continue;
      if (node.getComputedTextLength() > maxWidth) {
        // If single word is too long, hard-break it
        if (line.length === 1) {
          // progressively trim the word
          let word = line[0];
          let part = "";
          tspan.text("");
          for (let c = 0; c < word.length; c++) {
            part += word[c];
            tspan.text(part);
            if (node.getComputedTextLength() > maxWidth && part.length > 1) {
              // back off one char
              part = part.slice(0, -1);
              tspan.text(part);
              // emit remainder on next line(s)
              words.splice(i + 1, 0, word.slice(part.length));
              break;
            }
          }
        } else {
          // move last word to next line
          line.pop();
          tspan.text(line.join(" "));
          line = [words[i]];
        }

        lineNumber += 1;
        tspan = text
          .append("tspan")
          .attr("x", x)
          .attr("y", y)
          .attr("dy", dy + (lineNumber * lineHeight) / fontSize + "em")
          .attr("text-anchor", anchor)
          .text(line.join(" "));
      }
    }
  });
}
