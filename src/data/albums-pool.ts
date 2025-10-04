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

  constructor() {
    this.albumsMap = new Map<string, Album>();
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
}

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
