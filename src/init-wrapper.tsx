import { useAtomValue, useSetAtom } from "jotai";
import React, { useEffect } from "react";
import {
  albumsErrorAtom,
  albumsHaveLoadedAtom,
  albumsLoadingAtom,
  initAlbumsFromUrlAtom,
} from "./data/albums-pool-atoms";

export const InitWrapper: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const init = useSetAtom(initAlbumsFromUrlAtom);
  const loading = useAtomValue(albumsLoadingAtom);
  const error = useAtomValue(albumsErrorAtom);
  const hasLoaded = useAtomValue(albumsHaveLoadedAtom);

  useEffect(() => {
    init("/albums-data.jsonl");
  }, [init]);

  if (loading) return null;
  if (error) return <div>Error: {error}</div>;
  if (!hasLoaded) return null;
  return <>{children}</>;
};
