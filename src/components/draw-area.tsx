import { atom, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { albumDataSelectorsAtom } from "../data/albums-pool-atoms";
import { ForceGraph } from "./force-graph/force-graph";
import {
  forceGraphSetRootNodeDefAtom,
  type ForceGraphNodeDef,
} from "./force-graph/force-graph-nodes-manager";

export const defaultNodeDefAtom = atom((get): ForceGraphNodeDef => {
  const randomAlbum = get(albumDataSelectorsAtom).randomN(1)[0];
  const artistId = randomAlbum["artist-mbid"];
  const albumsForArtist = get(albumDataSelectorsAtom).byArtistMbid(artistId);
  return {
    id: artistId,
    children: albumsForArtist.map((album) => ({
      id: album.mbid,
      context: {
        type: "album",
        data: {
          title: album.release,
          artist: album.artist,
          variant: "flowchart",
        },
      },
    })),
    context: {
      type: "artist",
      data: {
        name: albumsForArtist[0].artist,
      },
    },
  };
});

function DrawArea() {
  const defaultNodeDef = useAtomValue(defaultNodeDefAtom);
  const setRootNodeDef = useSetAtom(forceGraphSetRootNodeDefAtom);

  useEffect(() => {
    setRootNodeDef(defaultNodeDef);
  }, [defaultNodeDef]);

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
        <ForceGraph width={800} height={600} />
      </div>
    </div>
  );
}

export default DrawArea;
