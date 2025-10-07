import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { albumDataSelectorsAtom } from "../data/albums-pool-atoms";
import { ForceGraph, type ForceGraphNodeDef } from "./force-graph/force-graph";

function DrawArea() {
  const { randomN, byArtistMbid, genresForAlbum } = useAtomValue(
    albumDataSelectorsAtom,
  );

  // Get a random artist and their albums (only once on mount)
  const { artistMbid, albums } = useMemo(() => {
    const randomAlbums = randomN(1);
    console.log(randomAlbums);
    const artistMbid = randomAlbums[0]["artist-mbid"];
    const artistAlbums = byArtistMbid(artistMbid);

    return { artistMbid, albums: artistAlbums };
  }, []); // Empty deps - only run once

  const initialNodeDef: ForceGraphNodeDef = {
    id: artistMbid,
    children: albums.map((album) => ({
      id: album.mbid,
      type: "album",
      data: {
        title: album.release,
        artist: album.artist,
      },
      onZoomClick: () => {
        setNodeDef({
          id: album.mbid,
          children: genresForAlbum(album.mbid).map((genre) => ({
            id: genre,
            type: "genre",
            data: {
              name: genre,
            },
          })),
          type: "album",
          data: {
            title: album.release,
            artist: album.artist,
          },
        });
      },
    })),
    type: "artist",
    data: {
      name: albums[0].artist,
    },
  };

  const [nodeDef, setNodeDef] = useState<ForceGraphNodeDef>(initialNodeDef);

  console.log({ nodeDef });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <div className="relative">
        <ForceGraph
          nodeDef={nodeDef}
          width={800}
          height={600}
          albumCardWidth={100}
          artistCardWidth={120}
        />
      </div>
    </div>
  );
}

export default DrawArea;
