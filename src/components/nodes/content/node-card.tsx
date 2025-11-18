import { clsx } from "clsx";
import { forwardRef, type PropsWithChildren } from "react";

export const NodeCard = forwardRef(function NodeCard(
  { children, positioned }: PropsWithChildren & { positioned?: boolean },
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div
      className={`flex ${clsx({ "w-fit": !positioned, absolute: positioned, "inset-0": positioned })} flex-col items-center justify-center gap-2 rounded-lg bg-linear-(--subtle-gray-gradient) p-4 shadow-sm/30`}
      ref={ref}
      tabIndex={0}
    >
      {children}
    </div>
  );
});
