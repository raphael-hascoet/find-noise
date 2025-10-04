export const debounce = <Args extends any[]>(
  func: (...args: Args) => void,
  delay: number
) => {
  let timeoutId: number | null = null;
  return (...args: Args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
