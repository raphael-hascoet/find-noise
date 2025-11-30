import { motion } from "motion/react";
import { memo } from "react";
import {
  NodeContentWrapper,
  type NodeContentWrapperPropsBase,
} from "./node-content-wrapper";

export const AppTitleNodeContent = memo(function AppTitleNodeContent({
  ...graphNodeProps
}: NodeContentWrapperPropsBase) {
  return (
    <NodeContentWrapper {...graphNodeProps}>
      <motion.div className="flex flex-col gap-2">
        <motion.span
          className="text-2xl text-gray-300/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          Welcome to
        </motion.span>
        <motion.span
          className="text-5xl font-bold text-violet-600"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
        >
          Find Noise
        </motion.span>
      </motion.div>
    </NodeContentWrapper>
  );
});
