import { useSetAtom } from "jotai";
import { useEffect, useState, type PropsWithChildren } from "react";
import { AlbumsPool, albumsPoolAtom } from "./data/albums-pool";

export const InitWrapper = ({ children }: PropsWithChildren) => {
  const setAlbumsPool = useSetAtom(albumsPoolAtom);
  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const albumsPool = new AlbumsPool();
        await albumsPool.initFromFile("/albums-data.jsonl");
        setAlbumsPool(albumsPool);
        setIsLoading(false);
      } catch (err) {
        // Handle initialization errors
        setError("Failed to initialize the application.");
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return children;
};
