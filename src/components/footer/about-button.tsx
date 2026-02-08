import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export const AboutButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Static button in bottom-left corner */}
      <button
        className="fixed bottom-4 left-5 z-50 cursor-pointer rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold text-gray-300 shadow-lg shadow-gray-950 transition-colors hover:bg-gray-700 active:bg-gray-700/70"
        onClick={() => setIsOpen(!isOpen)}
      >
        About
      </button>

      {/* Modal with overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              key="overlay"
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { duration: 0.3 },
              }}
              exit={{
                opacity: 0,
                transition: { duration: 0.26, delay: 0.08 },
              }}
              onClick={() => setIsOpen(false)}
            />

            {/* Modal container */}
            <motion.div
              key="modal"
              className="fixed left-1/2 top-1/2 z-50 w-[600px] max-w-[90vw] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-800 p-6 text-gray-300 shadow-lg shadow-gray-950"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: {
                  opacity: { duration: 0.28 },
                  scale: {
                    duration: 0.33,
                    ease: [0.16, 1, 0.3, 1],
                  },
                  delay: 0.05,
                },
              }}
              exit={{
                opacity: 0,
                scale: 0.98,
                transition: {
                  opacity: { duration: 0.24 },
                  scale: {
                    duration: 0.28,
                    ease: [0.4, 0, 1, 1],
                  },
                },
              }}
            >
              {/* Modal content with micro-stagger */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.23,
                    delay: 0.08,
                  },
                }}
                exit={{
                  opacity: 0,
                  y: 6,
                  transition: {
                    duration: 0.22,
                  },
                }}
              >
                <h2 className="text-xl font-bold text-white">About</h2>

                <div className="mt-2 flex max-h-[70dvh] flex-col gap-3 overflow-y-auto">
                  <p className="text-sm text-gray-300">
                    This project was built to help music listeners in their
                    journey to discover new albums, artists and genres. Whether
                    you want to listen to something you've never heard before
                    or to find more of what you already like, explore the graph
                    and have a listen !
                  </p>
                  <hr className="w-1/6 border-gray-300/50" />
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-bold">Data sources:</p>
                    <ul className="flex list-inside list-disc flex-col gap-1 text-sm text-gray-300">
                      <li>
                        <a
                          className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                          href="https://rateyourmusic.com/"
                        >
                          RateYourMusic
                        </a>{" "}
                        -{" "}
                        <a
                          className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                          href="https://www.kaggle.com/datasets/tobennao/rym-top-5000"
                        >
                          Top 5,000 Most Popular Albums dataset
                        </a>{" "}
                        - provides the list of albums, their genres and
                        descriptors
                      </li>
                      <li>
                        <a
                          className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                          href="https://musicbrainz.org/"
                        >
                          MusicBrainz
                        </a>{" "}
                        open music encyclopedia - used to link between the base
                        dataset and the{" "}
                        <a
                          className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                          href="https://coverartarchive.org/"
                        >
                          Cover Art Archive
                        </a>{" "}
                        to provide album covers
                      </li>
                    </ul>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-gray-300">
                      <span className="font-bold">
                        Note that the RateYourMusic data dates from 2022 and
                        cannot currently be updated.
                      </span>{" "}
                      The{" "}
                      <a
                        className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                        href="https://sonemic.com/"
                      >
                        Sonemic API project
                      </a>{" "}
                      is underway to make this data more easily accessible in
                      the future.
                    </p>
                    <p className="text-sm text-gray-300">
                      If you like this project, consider supporting
                      RateYourMusic and MusicBrainz !
                    </p>
                  </div>
                  <hr className="w-1/6 border-gray-300/50" />
                  <p className="text-sm text-gray-300">
                    Inspired by the beautiful{" "}
                    <a
                      className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                      href="https://everynoise.com"
                    >
                      Every Noise at Once
                    </a>{" "}
                    project and{" "}
                    <a
                      className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                      href="https://4chanmusic.miraheze.org/wiki/Flowcharts"
                    >
                      community flowcharts
                    </a>
                    .
                  </p>
                  <p className="text-sm text-gray-300">
                    For more technical details, visit the project's{" "}
                    <a
                      href="https://github.com/raphael-hascoet/find-noise"
                      className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                    >
                      GitHub repository
                    </a>
                    .
                  </p>
                  <hr className="w-1/6 border-gray-300/50" />
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-gray-300">
                      Built by{" "}
                      <span className="font-bold">Raphaël Hascoët</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Contact me through{" "}
                      <a
                        className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                        href="https://www.linkedin.com/in/raphael-hascoet"
                      >
                        LinkedIn
                      </a>{" "}
                      or at{" "}
                      <a
                        className="text-violet-400 underline transition-colors hover:text-violet-400/85 active:text-violet-400/70"
                        href="mailto:raphael.hascoet.pro@gmail.com"
                      >
                        raphael.hascoet.pro@gmail.com
                      </a>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-gray-300/80">
                      All data and images are copyrighted by their respective
                      owners and used for educational and informational
                      purposes only. If you believe that any content on this
                      site infringes your copyright, please contact the address
                      above.
                    </p>
                  </div>
                </div>

                <button
                  className="mt-4 cursor-pointer rounded-md bg-violet-700 px-4 py-1 text-sm text-white transition-colors hover:bg-violet-700/85 active:bg-violet-700/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
