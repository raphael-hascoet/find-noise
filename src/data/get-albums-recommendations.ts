import type { Album } from "./albums-pool-atoms";

export type SimpleWeights = {
  genrePP: number; // weight for primary–primary genre match
  genrePS: number; // weight for primary–secondary or secondary–primary match
  genreSS: number; // weight for secondary–secondary match
  descriptors: number; // weight for shared descriptors
  rating: number; // weight for positive avg-rating delta
};

export type GenreMatchBucket = {
  count: number;
  shared: string[];
  weight: number;
  contribution: number;
};

export type SimpleReason = {
  genreMatches: {
    primaryPrimary: GenreMatchBucket; // seed primary ↔ cand primary
    primarySecondary: GenreMatchBucket; // seed primary ↔ cand secondary
    secondaryPrimary: GenreMatchBucket; // seed secondary ↔ cand primary
    secondarySecondary: GenreMatchBucket; // seed secondary ↔ cand secondary
    totalContribution: number; // sum of the above contributions
  };
  descriptorOverlap: {
    count: number;
    shared: string[];
    weight: number;
    contribution: number;
  };
  ratingDelta: {
    delta: number; // max(0, cand.avg - seed.avg)
    seedAvg: number;
    candAvg: number;
    weight: number;
    contribution: number;
  };
  total: number; // equals overall score
};

export type SimpleRecommendation = {
  album: Album;
  score: number;
  reason: SimpleReason;
};

export type SimpleRecommendParams = {
  seed: Album;
  all: Album[];
  topX: number;
  excludedIds?: string[];
  weights?: SimpleWeights;
  opts?: {
    requireAnyGenreOverlap?: boolean; // quick filter to keep only genre-related candidates
    excludeSameArtist?: boolean;
    excludeDoubledArtist?: boolean;
  };
};

export function simpleRecommendAlbums({
  seed,
  all,
  topX,
  excludedIds,
  weights = {
    genrePP: 1.0,
    genrePS: 0.6,
    genreSS: 0.3,
    descriptors: 1.0,
    rating: 1.0,
  },
  opts,
}: SimpleRecommendParams): SimpleRecommendation[] {
  const { genrePP, genrePS, genreSS, descriptors, rating } = weights;

  const seedPrim = seed["primary-genres"] ?? [];
  const seedSec = seed["secondary-genres"] ?? [];
  const seedDescArr = seed.descriptors ?? [];

  const seedPrimSet = new Set(seedPrim);
  const seedSecSet = new Set(seedSec);

  let pool = (all ?? []).filter(
    (a) => a && a.mbid !== seed.mbid && !excludedIds?.includes(a.mbid),
  );

  if (opts?.excludeSameArtist) {
    pool = pool.filter((a) => a["artist-mbid"] !== seed["artist-mbid"]);
  }

  if (opts?.requireAnyGenreOverlap) {
    pool = pool.filter((cand) => {
      const cPrim = cand["primary-genres"] ?? [];
      const cSec = cand["secondary-genres"] ?? [];
      return (
        cPrim.some((g) => seedPrimSet.has(g) || seedSecSet.has(g)) ||
        cSec.some((g) => seedPrimSet.has(g) || seedSecSet.has(g))
      );
    });
  }

  let recs: SimpleRecommendation[] = pool.map((cand) => {
    const candPrim = cand["primary-genres"] ?? [];
    const candSec = cand["secondary-genres"] ?? [];
    const candDescArr = cand.descriptors ?? [];

    // Compute genre matches in four buckets
    const ppShared = intersectStrings(seedPrim, candPrim);
    const psShared = intersectStrings(seedPrim, candSec);
    const spShared = intersectStrings(seedSec, candPrim);
    const ssShared = intersectStrings(seedSec, candSec);

    const ppC = ppShared.length * genrePP;
    const psC = psShared.length * genrePS;
    const spC = spShared.length * genrePS;
    const ssC = ssShared.length * genreSS;
    const genreTotal = ppC + psC + spC + ssC;

    // Descriptors
    const descShared = intersectStrings(seedDescArr, candDescArr);
    const descC = descShared.length * descriptors;

    // Rating delta (positive only)
    const seedAvg = seed["avg-rating"] ?? 0;
    const candAvg = cand["avg-rating"] ?? 0;
    const delta = Math.max(0, candAvg - seedAvg);
    const ratingC = delta * rating;

    const total = genreTotal + descC + ratingC;

    const reason: SimpleReason = {
      genreMatches: {
        primaryPrimary: {
          count: ppShared.length,
          shared: ppShared,
          weight: genrePP,
          contribution: ppC,
        },
        primarySecondary: {
          count: psShared.length,
          shared: psShared,
          weight: genrePS,
          contribution: psC,
        },
        secondaryPrimary: {
          count: spShared.length,
          shared: spShared,
          weight: genrePS,
          contribution: spC,
        },
        secondarySecondary: {
          count: ssShared.length,
          shared: ssShared,
          weight: genreSS,
          contribution: ssC,
        },
        totalContribution: genreTotal,
      },
      descriptorOverlap: {
        count: descShared.length,
        shared: descShared,
        weight: descriptors,
        contribution: descC,
      },
      ratingDelta: {
        delta,
        seedAvg,
        candAvg,
        weight: rating,
        contribution: ratingC,
      },
      total,
    };

    return { album: cand, score: total, reason };
  });

  recs.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.album["avg-rating"] !== a.album["avg-rating"]) {
      return b.album["avg-rating"] - a.album["avg-rating"];
    }
    return b.album["rating-count"] - a.album["rating-count"];
  });

  if (opts?.excludeDoubledArtist) {
    const artistsSet = new Set<string>();

    const recsWithoutDoubledArtist: SimpleRecommendation[] = [];

    recs.forEach((rec) => {
      if (!artistsSet.has(rec.album["artist-mbid"])) {
        recsWithoutDoubledArtist.push(rec);
        artistsSet.add(rec.album["artist-mbid"]);
      }
    });
    recs = recsWithoutDoubledArtist;
  }

  return recs.slice(0, Math.max(0, topX));
}

function intersectStrings(a: string[], b: string[]): string[] {
  if (!a?.length || !b?.length) return [];
  const setB = new Set(b);
  const out: string[] = [];
  for (const x of a) if (setB.has(x)) out.push(x);
  return out;
}
