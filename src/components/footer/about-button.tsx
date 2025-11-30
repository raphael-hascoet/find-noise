import { AnimatePresence, motion } from "motion/react";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const AboutButton = () => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [registeredSize, setRegisteredSize] = useState<{ height: number }>();
  const [needsResize, setNeedsResize] = useState(false);

  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    if (modalRef.current && (!registeredSize || needsResize)) {
      const rect = modalRef.current.getBoundingClientRect();
      setRegisteredSize({ height: rect.height });
      setNeedsResize(false);
    }
  }, [registeredSize, needsResize]);

  useEffect(() => {
    const handleResize = () => {
      setNeedsResize(true);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          />
        )}
        {(!registeredSize || needsResize) && (
          <AboutModalButton
            key="shell"
            isOpen={true}
            isShell={true}
            ref={modalRef}
          />
        )}
        {registeredSize && (
          <AboutModalButton
            key="modal-button"
            isOpen={isOpen}
            height={registeredSize.height}
            setIsOpen={setIsOpen}
            isShell={false}
          />
        )}
      </AnimatePresence>
    </>
  );
};

type AboutModalButtonProps = {
  isOpen: boolean;
  setIsOpen?: (open: boolean) => void;
} & ({ isShell: true } | { isShell?: false; height: number });

const AboutModalButton = forwardRef<HTMLDivElement, AboutModalButtonProps>(
  function AboutModalButton(props, ref) {
    const { isOpen, setIsOpen } = props;
    return (
      <motion.div
        layout={!props.isShell}
        ref={ref}
        className={`fixed z-50 overflow-hidden bg-slate-800 text-gray-300 shadow-lg/25 shadow-gray-950 outline-2 outline-violet-950 transition-colors ${!isOpen ? "cursor-pointer hover:bg-gray-700 active:bg-gray-700/70" : ""} ${props.isShell ? "opacity-0" : "opacity-100"}`}
        tabIndex={isOpen ? 0 : -1}
        initial={props.isShell ? "modal" : "button"}
        animate={isOpen ? "modal" : "button"}
        variants={{
          button: {
            position: "fixed",
            left: 20,
            top: "calc(100% - 51px)",
            x: 0,
            y: 0,
            width: 75,
            maxWidth: "90vw",
            height: 35,
            borderRadius: 8,
          },
          modal: {
            position: "fixed",
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            width: 600,
            maxWidth: "90vw",
            height: props.isShell ? "auto" : props.height,
            borderRadius: 16,
          },
        }}
        transition={{
          type: "spring",
          stiffness: 250,
          damping: 35,
          mass: 1.2,
        }}
        onClick={() => !isOpen && setIsOpen?.(true)}
      >
        <motion.div
          className={`flex h-full w-full flex-col`}
          variants={{
            button: {
              paddingLeft: 16,
              paddingTop: 7,
            },
            modal: {
              paddingLeft: 24,
              paddingTop: 24,
              paddingRight: 24,
              paddingBottom: 24,
            },
          }}
        >
          <motion.span
            layout="position"
            className={`block font-bold ${isOpen ? "text-white" : "text-gray-300"}`}
            variants={{
              button: {
                fontSize: "var(--text-sm)",
              },
              modal: {
                fontSize: "var(--text-xl)",
              },
            }}
          >
            About
          </motion.span>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { delay: 0.6, duration: 0.2 },
                }}
                exit={{
                  opacity: 0,
                  height: 0,
                  transition: { delay: 0, duration: 0.1 },
                }}
                className="mt-2 flex flex-col items-start gap-4"
              >
                <div className="flex max-h-[70dvh] flex-col gap-2 overflow-y-auto">
                  <p className="text-sm text-gray-300">
                    This project was built to help music listeners in their
                    journey to discover new albums, artists and genres. Whether
                    you want to listen to something you've never heard before or
                    to find more of what you already like, explore the graph and
                    have a listen !
                  </p>
                  <div className="flex flex-col gap-1">
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
                      </span>
                      . The{" "}
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
                      owners and used for educational and informational purposes
                      only. If you believe that any content on this site
                      infringes your copyright, please contact the address
                      above.
                    </p>
                  </div>
                </div>
                <button
                  className="cursor-pointer rounded-md bg-violet-700 px-4 py-1 text-sm text-white transition-colors hover:bg-violet-700/85 active:bg-violet-700/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen?.(false);
                  }}
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    );
  },
);
