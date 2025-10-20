import { forwardRef, type PropsWithChildren } from "react";

export const NodeCard = forwardRef(function NodeCard(
  { children }: PropsWithChildren,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <div
      className="flex w-fit flex-col items-center justify-center gap-2 rounded-lg bg-linear-(--subtle-gray-gradient) p-4 shadow-sm/30"
      ref={ref}
      tabIndex={0}
    >
      {children}
    </div>
  );
});
