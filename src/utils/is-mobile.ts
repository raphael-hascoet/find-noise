import { atom, useSetAtom } from "jotai";
import { useEffect } from "react";

const QUERY = "(max-width: 767px)";

export const isMobileAtom = atom<boolean>(false);

export function useIsMobileBootstrap() {
  // Call once near the app root
  const setIsMobile = useSetAtom(isMobileAtom);
  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const update = () => setIsMobile(mql.matches);
    update();
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", handler);
    else mql.addListener(handler);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", handler);
      else mql.removeListener(handler);
    };
  }, [setIsMobile]);
}
