import { AnimatePresence, motion } from "motion/react";
import { forwardRef, useLayoutEffect, useRef, useState } from "react";

export const AboutButton = () => {
  const modalRef = useRef<HTMLDivElement>(null);

  const [registeredSize, setRegisteredSize] = useState<{ height: number }>();

  const [isOpen, setIsOpen] = useState(false);

  useLayoutEffect(() => {
    if (modalRef.current && !registeredSize) {
      const rect = modalRef.current.getBoundingClientRect();
      setRegisteredSize({ height: rect.height });
    }
  }, [registeredSize]);

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
        {!registeredSize && (
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
        className={`fixed z-50 overflow-hidden bg-gray-800 text-gray-300 shadow-lg/25 shadow-gray-950 outline-2 outline-violet-950 transition-colors ${!isOpen ? "cursor-pointer hover:bg-gray-700 active:bg-gray-700/70" : ""} ${props.isShell ? "opacity-0" : "opacity-100"}`}
        tabIndex={isOpen ? 0 : -1}
        initial={props.isShell ? "modal" : "button"}
        animate={isOpen ? "modal" : "button"}
        variants={{
          button: {
            position: "fixed",
            left: 20,
            top: "calc(100% - 53px)",
            x: 0,
            y: 0,
            width: 80,
            height: 40,
            borderRadius: 8,
          },
          modal: {
            position: "fixed",
            left: "50%",
            top: "50%",
            x: "-50%",
            y: "-50%",
            width: 300,
            height: props.isShell ? "auto" : props.height,
            borderRadius: 16,
          },
        }}
        transition={{ type: "spring", stiffness: 500, damping: 45 }}
        onClick={() => !isOpen && setIsOpen?.(true)}
      >
        <motion.div
          className={`flex h-full w-full flex-col`}
          variants={{
            button: {
              paddingLeft: 18,
              paddingTop: 9,
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
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="mt-2 flex flex-col items-start gap-4"
              >
                <p className="text-sm text-gray-400">
                  This is a music exploration app built with React and Jotai.
                </p>
                <button
                  className="cursor-pointer rounded-md bg-violet-600 px-4 py-1 text-sm text-white transition-colors hover:bg-violet-600/90 active:bg-violet-600/80"
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
