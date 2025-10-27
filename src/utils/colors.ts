export const rgbWithOpacity = (rgbString: string, opacity: number) => {
  const [r, g, b] = rgbString
    .replace("rgb(", "")
    .replace(")", "")
    .split(" ")
    .map((c) => parseInt(c.trim(), 10));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
