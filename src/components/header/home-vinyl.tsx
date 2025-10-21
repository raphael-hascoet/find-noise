import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { ulid } from "ulid";
import { setActiveViewAtom } from "../views/views-config";

// export const HomeVinyl = () => {
//   const setView = useSetAtom(setActiveViewAtom);

//   return (
//     <svg
//       width="60"
//       height="60"
//       viewBox="0 0 180 180"
//       xmlns="http://www.w3.org/2000/svg"
//       aria-label="Home view"
//     >
//       <motion.g
//         initial="rest"
//         whileHover="hover"
//         cursor="pointer"
//         variants={{
//           rest: { opacity: 1 },
//           hover: { opacity: 1 },
//         }}
//         whileTap={{ opacity: 0.9 }}
//         onClick={() => {
//           setView({ key: "home", data: { seed: ulid() } });
//         }}
//         pointerEvents="auto"
//       >
//         <motion.circle
//           cx="90"
//           cy="90"
//           r="80"
//           fill="#1a1a1a"
//           variants={{
//             hover: { stroke: "#3a3a3a" },
//             rest: { stroke: "#2a2a2a" },
//           }}
//           transition={{
//             stroke: {
//               duration: 0.1,
//             },
//           }}
//           stroke-width="4"
//         />
//         <motion.circle
//           cx="90"
//           cy="90"
//           r="66"
//           fill="none"
//           variants={{
//             hover: { stroke: "#4b1297" },
//             rest: { stroke: "#2a2a2a" },
//           }}
//           transition={{
//             stroke: {
//               duration: 0.1,
//               delay: 0.1,
//             },
//           }}
//           stroke-width="1"
//         />
//         <motion.circle
//           cx="90"
//           cy="90"
//           r="54"
//           fill="none"
//           variants={{
//             hover: { stroke: "#4b1297" },
//             rest: { stroke: "#2a2a2a" },
//           }}
//           transition={{
//             stroke: {
//               duration: 0.1,
//               delay: 0.2,
//             },
//           }}
//           stroke-width="1"
//         />
//         <motion.circle
//           cx="90"
//           cy="90"
//           r="42"
//           fill="none"
//           variants={{
//             hover: { stroke: "#4b1297" },
//             rest: { stroke: "#2a2a2a" },
//           }}
//           transition={{
//             stroke: {
//               duration: 0.1,
//               delay: 0.3,
//             },
//           }}
//           stroke-width="1"
//         />

//         <motion.circle
//           cx="90"
//           cy="90"
//           r="28"
//           fill="#4d179a"
//           variants={{ hover: { opacity: 0.8 }, rest: { opacity: 1 } }}
//           transition={{
//             opacity: {
//               duration: 0.4,
//             },
//           }}
//         />
//         <circle cx="90" cy="90" r="6" fill="#1a1a1a" />
//       </motion.g>
//     </svg>
//   );
// };

export const HomeVinyl = () => {
  const setView = useSetAtom(setActiveViewAtom);

  return (
    <svg
      width="60"
      height="60"
      viewBox="0 0 180 180"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Home view"
    >
      <motion.g
        initial="rest"
        whileHover="hover"
        cursor="pointer"
        variants={{
          rest: { opacity: 1 },
          hover: { opacity: 1 },
        }}
        whileTap={{ opacity: 0.9 }}
        transition={{
          opacity: {
            duration: 0.1,
          },
        }}
        onClick={() => {
          setView({ key: "home", data: { seed: ulid() } });
        }}
        pointerEvents="auto"
        tabIndex={0}
        className="focus-dark-gray-outline"
      >
        <motion.circle
          cx="90"
          cy="90"
          r="80"
          fill="#1a1a1a"
          variants={{
            hover: { stroke: "#3a3a3a" },
            rest: { stroke: "#2a2a2a" },
          }}
          transition={{
            stroke: {
              duration: 0.1,
            },
          }}
          strokeWidth="4"
        />
        <motion.circle
          cx="90"
          cy="90"
          r="66"
          fill="none"
          variants={{
            hover: { stroke: "#3c3c3c" },
            rest: { stroke: "#2a2a2a" },
          }}
          transition={{
            stroke: {
              duration: 0.1,
              delay: 0.1,
            },
          }}
          strokeWidth="1"
        />
        <motion.circle
          cx="90"
          cy="90"
          r="54"
          fill="none"
          variants={{
            hover: { stroke: "#3c3c3c" },
            rest: { stroke: "#2a2a2a" },
          }}
          transition={{
            stroke: {
              duration: 0.1,
              delay: 0.2,
            },
          }}
          strokeWidth="1"
        />
        <motion.circle
          cx="90"
          cy="90"
          r="42"
          fill="none"
          variants={{
            hover: { stroke: "#3c3c3c" },
            rest: { stroke: "#2a2a2a" },
          }}
          transition={{
            stroke: {
              duration: 0.1,
              delay: 0.3,
            },
          }}
          strokeWidth="1"
        />

        <circle cx="90" cy="90" r="28" fill="#4d179a" />
        <circle cx="90" cy="90" r="6" fill="#1a1a1a" />
      </motion.g>
    </svg>
  );
};
