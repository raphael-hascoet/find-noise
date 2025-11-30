# Find Noise

A music discovery application that visualizes album relationships through interactive flowcharts and generates recommendations based on genre and descriptor overlap.

### <a href="https://find-noise.pages.dev/">View the app →</b></a>

## Features

- **Flowchart Navigation**: Interactive node-based visualization connecting albums by genre and style relationships
- **Album Suggestions**: Generates recommendations using genre overlap, shared descriptors, and rating analysis
- **Dynamic Visualization**: Zoom/pan controls with dynamic positioning and album artwork integration
- **Fuzzy Search**: Allows approximate matching for album and artist names, helping users find albums that they want to use in the flowchart

## Technical Approach

A dataset of the top 5,000 most-reviewed albums from RateYourMusic is combined with MusicBrainz and Cover Art Archive APIs to link album metadata with artwork, enabling the matching of recommendation logic with fitting visuals. It is small enough to be served statically as a JSONL file.

The visualization layer uses [D3.js](https://d3js.org/d3-zoom) for custom zoom management with dynamic bounds calculation, smooth controls and SVG handling, while [Motion](https://motion.dev/) (prev. Framer Motion) handles UI animations and component transitions. The recommendation logic analyzes genre overlap (primary/secondary), shared descriptors, and rating values to suggest relevant albums.

State management through [Jotai](https://jotai.org/) optimizes performance by controlling data instantiation and selective updates across different views (home, search, artist catalogs, detailed flowcharts), preventing unnecessary re-renders when switching between large datasets.

The cover art images for relevant albums are mirrored through [Cloudflare Pages](https://pages.cloudflare.com/), reducing the load on the Cover Art Archive API while providing increased network performance through caching and Cloudflare's CDN.

## Data Sources

- [RateYourMusic Top 5,000 Albums](https://www.kaggle.com/datasets/tobennao/rym-top-5000) - provides album metadata, genres, and descriptors
- [MusicBrainz](https://musicbrainz.org/) and [Cover Art Archive](https://coverartarchive.org/) - album artwork integration

_Note: [RateYourMusic](https://rateyourmusic.com/) data is from **2022** and cannot currently be updated. The [Sonemic API project](https://sonemic.com/) aims to make this data more accessible in the future._

All data and images are copyrighted by their respective owners and used for educational and informational purposes only. If you believe that any content on this site infringes your copyright, please contact the address below.

## Development

You can clone and run the app yourself with [pnpm](https://pnpm.io/) through those commands:

```bash
pnpm install
pnpm dev
```

## Contact

Built by **Raphaël Hascoët**  
[LinkedIn](https://www.linkedin.com/in/raphael-hascoet) • raphael.hascoet.pro@gmail.com
