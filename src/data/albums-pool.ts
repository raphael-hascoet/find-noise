import { atom } from "jotai";
import { z } from "zod";

export const AlbumSchema = z.object({
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

export class AlbumsPool {
  private albumsMap: Map<string, Album>;
  private referenceMaps: ReferenceMaps | null;

  constructor() {
    this.albumsMap = new Map<string, Album>();
    this.referenceMaps = null;
  }

  async initFromFile(url: string) {
    const response = await fetch(url);
    const text = await response.text();
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    lines.forEach((line) => {
      const parsed = AlbumSchema.safeParse(JSON.parse(line));
      if (parsed.success) {
        this.albumsMap.set(parsed.data.mbid, parsed.data);
      } else {
        console.error("Failed to parse album:", parsed.error);
      }
    });
    this.referenceMaps = buildReferenceMapsFromAlbums(
      Array.from(this.albumsMap.values())
    );
    console.log(`Loaded ${this.albumsMap.size} albums.`);
  }

  getAlbumByMbid(mbid: string): Album | undefined {
    return this.albumsMap.get(mbid);
  }

  getRandomAlbums(count: number): Album[] {
    const albumsArray = Array.from(this.albumsMap.values());
    const shuffled = albumsArray.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  getAlbumsByArtistMbid(artistMbid: string): Album[] {
    if (!this.referenceMaps) return [];
    const mbids = this.referenceMaps.artists.get(artistMbid) || [];
    return mbids
      .map((mbid) => this.albumsMap.get(mbid))
      .filter((album): album is Album => album !== undefined);
  }

  getAlbumsByGenre(genre: string): Album[] {
    if (!this.referenceMaps) return [];
    const mbids = this.referenceMaps.genres.get(genre) || [];
    return mbids
      .map((mbid) => this.albumsMap.get(mbid))
      .filter((album): album is Album => album !== undefined);
  }

  getAlbumsByDescriptor(descriptor: string): Album[] {
    if (!this.referenceMaps) return [];
    const mbids = this.referenceMaps.descriptors.get(descriptor) || [];
    return mbids
      .map((mbid) => this.albumsMap.get(mbid))
      .filter((album): album is Album => album !== undefined);
  }
}

type ReferenceMaps = {
  artists: Map<string, string[]>;
  genres: Map<string, string[]>;
  descriptors: Map<string, string[]>;
};

const buildReferenceMapsFromAlbums = (albums: Album[]): ReferenceMaps => {
  const artists = new Map<string, string[]>();
  const genres = new Map<string, string[]>();
  const descriptors = new Map<string, string[]>();

  albums.forEach((album) => {
    if (!artists.has(album["artist-mbid"])) {
      artists.set(album["artist-mbid"], [album.mbid]);
    } else {
      artists.get(album["artist-mbid"])?.push(album.mbid);
    }

    album["primary-genres"].forEach((genre) => {
      if (!genres.has(genre)) {
        genres.set(genre, [album.mbid]);
      } else {
        genres.get(genre)?.push(album.mbid);
      }
    });

    album.descriptors.forEach((descriptor) => {
      if (!descriptors.has(descriptor)) {
        descriptors.set(descriptor, [album.mbid]);
      } else {
        descriptors.get(descriptor)?.push(album.mbid);
      }
    });
  });

  return { artists, genres, descriptors };
};

const albumsPoolValueAtom = atom<AlbumsPool | null>(null);

export const albumsPoolAtom = atom(
  (get) => {
    const albumsPool = get(albumsPoolValueAtom);
    if (!albumsPool) {
      throw new Error("AlbumsPool not initialized");
    }
    return albumsPool;
  },
  (_, set, newAlbumsPool: AlbumsPool) => {
    set(albumsPoolValueAtom, newAlbumsPool);
  }
);
