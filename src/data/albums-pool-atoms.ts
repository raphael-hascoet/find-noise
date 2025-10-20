import { atom } from "jotai";
import { z } from "zod";
import { seededRandom } from "../utils/seeded-random";

const AlbumSchema = z.object({
  id: z.string(),
  mbid: z.string(),
  "artist-mbid": z.string(),
  artist: z.string(),
  release: z.string(),
  position: z.number().int(),
  "release-date": z.iso.date(),
  "release-type": z.string(),
  "primary-genres": z.array(z.string()),
  "secondary-genres": z.array(z.string()),
  descriptors: z.array(z.string()),
  "avg-rating": z.number(),
  "rating-count": z.number().int(),
  "review-count": z.number().int(),
});

export type Album = z.infer<typeof AlbumSchema>;

export type AlbumSelectors = {
  byMbid: (mbid: string) => Album | undefined;
  byArtistMbid: (artistMbid: string) => Album[];
  byGenre: (genre: string) => Album[];
  byDescriptor: (d: string) => Album[];
  genresForAlbum: (mbid: string) => string[];
  allArtistKeys: () => string[];
  allGenres: () => string[];
  allDescriptors: () => string[];
  randomN: (n: number, seed?: string) => Album[];
  allAlbums: () => Album[];
};

type ReferenceMaps = {
  artists: Map<string, string[]>;
  genres: Map<string, string[]>;
  descriptors: Map<string, string[]>;
};

export const byMbidAtom = atom((get) => {
  const map = new Map<string, Album>();
  for (const a of get(albumsAtom)) map.set(a.mbid, a);
  return map;
});

const buildReferenceMapsFromAlbums = (albums: Album[]): ReferenceMaps => {
  const artists = new Map<string, string[]>();
  const genres = new Map<string, string[]>();
  const descriptors = new Map<string, string[]>();

  for (const album of albums) {
    const a = album["artist-mbid"];
    (artists.get(a) ?? artists.set(a, []).get(a)!).push(album.mbid);

    for (const g of album["primary-genres"]) {
      (genres.get(g) ?? genres.set(g, []).get(g)!).push(album.mbid);
    }

    for (const d of album.descriptors) {
      (descriptors.get(d) ?? descriptors.set(d, []).get(d)!).push(album.mbid);
    }
  }

  return { artists, genres, descriptors };
};

// Source of truth atoms
const albumsAtom = atom<Album[]>([]);
const refMapsAtom = atom<ReferenceMaps>({
  artists: new Map(),
  genres: new Map(),
  descriptors: new Map(),
});

// UI status atoms
export const albumsLoadingAtom = atom<boolean>(false);
export const albumsHaveLoadedAtom = atom<boolean>(false);
export const albumsErrorAtom = atom<string | null>(null);

// Init action: load from NDJSON (one JSON per line)
export const initAlbumsFromUrlAtom = atom(
  null,
  async (get, set, url: string) => {
    // If already loading, you may choose to bail out
    if (get(albumsLoadingAtom)) return;

    set(albumsLoadingAtom, true);
    set(albumsErrorAtom, null);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      const lines = text.split("\n").filter((l) => l.trim() !== "");
      const albums: Album[] = [];
      for (const line of lines) {
        const parsed = AlbumSchema.safeParse(JSON.parse(line));
        if (parsed.success) {
          albums.push(parsed.data);
        } else {
          console.warn(parsed.error);
        }
      }

      set(albumsAtom, albums);
      set(refMapsAtom, buildReferenceMapsFromAlbums(albums));
      set(albumsHaveLoadedAtom, true);
    } catch (e: any) {
      set(albumsErrorAtom, e?.message ?? "Failed to load albums");
    } finally {
      set(albumsLoadingAtom, false);
    }
  },
);

// Grouped selectors (read-only)
export const albumDataSelectorsAtom = atom((get): AlbumSelectors => {
  const byId = get(byMbidAtom);
  const ref = get(refMapsAtom);

  const mapIds = (ids: string[]) =>
    ids.map((id) => byId.get(id)).filter(Boolean) as Album[];

  return {
    allAlbums: () => Array.from(byId.values()),
    byMbid: (mbid: string) => byId.get(mbid),
    byArtistMbid: (artistMbid: string) =>
      mapIds(ref.artists.get(artistMbid) ?? []),
    byGenre: (genre: string) => mapIds(ref.genres.get(genre) ?? []),
    byDescriptor: (d: string) => mapIds(ref.descriptors.get(d) ?? []),
    genresForAlbum: (mbid: string) => byId.get(mbid)?.["primary-genres"] ?? [],
    allArtistKeys: () => Array.from(ref.artists.keys()),
    allGenres: () => Array.from(ref.genres.keys()),
    allDescriptors: () => Array.from(ref.descriptors.keys()),
    randomN: (n: number, seed?: string) => {
      const all = Array.from(byId.values());

      console.log(`For seed ${seed}-1: ${seededRandom(`${seed}-${1}`)}`);
      console.log(`For seed ${seed}-2: ${seededRandom(`${seed}-${2}`)}`);
      const randomIds = all
        .map((_, i) => i)
        .sort((i1, i2) =>
          seed
            ? seededRandom(`${seed}-${i1}`) - seededRandom(`${seed}-${i2}`)
            : Math.random(),
        )
        .slice(0, n);
      return randomIds.map((id) => all[id]);
    },
  };
});

export const allArtistKeysAtom = atom((get) =>
  Array.from(get(refMapsAtom).artists.keys()),
);
export const allGenresAtom = atom((get) =>
  Array.from(get(refMapsAtom).genres.keys()),
);
export const allDescriptorsAtom = atom((get) =>
  Array.from(get(refMapsAtom).descriptors.keys()),
);
