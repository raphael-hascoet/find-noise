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
  // Get a random artist and their albums (only once on mount)
  // const { artistMbid, albums } = useMemo(() => {
  //   const randomAlbums = randomN(1);
  //   console.log(randomAlbums);
  //   const artistMbid = randomAlbums[0]["artist-mbid"];
  //   const artistAlbums = byArtistMbid(artistMbid);

  //   return { artistMbid, albums: artistAlbums };
  // }, []); // Empty deps - only run once

  // const initialNodeDef: ForceGraphNodeDef =

  // const [nodeDef, setNodeDef] = useState<ForceGraphNodeDef>(initialNodeDef);

  // console.log({ nodeDef });

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
          // nodeDef={nodeDef}
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
