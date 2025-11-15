export const debounce = <Args extends any[]>(
  func: (...args: Args) => void,
  delay: number,
) => {
  let timeoutId: number | null = null;
  return (...args: Args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const throttle = <Args extends any[]>(
  fn: (...args: Args) => void,
  wait: number,
) => {
  let timeoutId: number | undefined;
  let lastCall = 0;
  let pendingArgs: Args | null = null;

  const invoke = () => {
    timeoutId = undefined;
    lastCall = Date.now();
    if (pendingArgs) {
      fn(...pendingArgs);
      pendingArgs = null;
    }
  };

  return (...args: Args) => {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    pendingArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }
      invoke();
    } else if (timeoutId === undefined) {
      timeoutId = window.setTimeout(invoke, remaining);
    }
  };
};
