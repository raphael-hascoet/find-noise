import { motion } from "motion/react";
import { useState } from "react";
import { getAlbumCoverUrl } from "../../../data/album-cover-urls";

export const AlbumCardCoverImage = ({
  nodeId,
  albumName,
}: {
  nodeId: string;
  albumName: string;
}) => {
  const coverUrl = getAlbumCoverUrl(nodeId);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<null | string>(null);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {!loaded && !error && (
        <div
          style={{
            position: "absolute",
            inset: 2,
            display: "grid",
            placeItems: "center",
          }}
        >
          <motion.div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 4,
              background: "white",
              outline: "1px solid transparent",
            }}
            initial={{ opacity: 0.1 }}
            animate={{ opacity: [0.1, 0.15, 0.1] }}
            transition={{
              duration: 3.5,
              ease: "linear",
              repeat: Infinity,
            }}
          />
        </div>
      )}
      {!error && (
        <img
          src={coverUrl}
          alt={`Cover for album ${albumName}`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setError("Failed to load image");
            setLoaded(false);
          }}
          style={{
            display: loaded ? "block" : "none",
            width: "100%",
            height: "auto",
          }}
          draggable={false}
        />
      )}

      {error && (
        <div
          style={{
            position: "absolute",
            inset: 8,
            display: "grid",
            placeItems: "center",
          }}
        >
          <ImageLoadFailFallback />{" "}
        </div>
      )}
    </div>
  );
};

const ImageLoadFailFallback = () => {
  return (
    <svg
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Home view"
    >
      {/* Main disc */}
      <circle
        cx="80"
        cy="80"
        r="76"
        fill="transparent"
        stroke="#bfbfbf"
        strokeWidth="4"
      />

      {/* Label as a ring (stroke only) so center can remain transparent */}
      <circle
        cx="80"
        cy="80"
        r="16"
        fill="none"
        stroke="#ededed"
        strokeWidth="15"
      />

      {/* Grooves as concentric circle strokes */}
      <circle
        cx="80"
        cy="80"
        r="62"
        fill="none"
        stroke="#bfbfbf"
        strokeWidth="1"
      />
      <circle
        cx="80"
        cy="80"
        r="50"
        fill="none"
        stroke="#bfbfbf"
        strokeWidth="1"
      />
      <circle
        cx="80"
        cy="80"
        r="38"
        fill="none"
        stroke="#bfbfbf"
        strokeWidth="1"
      />
    </svg>
  );
};
