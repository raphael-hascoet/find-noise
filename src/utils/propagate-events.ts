import { useCallback, useEffect, useMemo, useRef } from "react";

export type PropagateEvent = (event: Event) => void;

type PropagationProps = Pick<
  React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>,
  "onWheel" | "onDoubleClick" | "onPointerDownCapture"
>;

const createPropagationProps = ({
  propagateEvent,
}: {
  propagateEvent: PropagateEvent;
}): {
  propagationProps: PropagationProps;
} => {
  const cloneMouseEvent = (type: string, e: React.MouseEvent) =>
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: e.button,
      buttons: e.buttons,
      clientX: e.clientX,
      clientY: e.clientY,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      detail: e.detail,
    });

  const cloneWheelEvent = (e: React.WheelEvent) =>
    new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true, // d3-zoom expects to preventDefault to stop page scroll
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      deltaMode: e.deltaMode,
      clientX: e.clientX,
      clientY: e.clientY,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
    });

  return {
    propagationProps: {
      onWheel: (e) => {
        propagateEvent(cloneWheelEvent(e));
      },

      onDoubleClick: (e) => {
        e.preventDefault();
        propagateEvent(cloneMouseEvent("dblclick", e));
      },
    },
  };
};
/**
 * Hook to enable pass-through of pointer events during drag interactions and propagate wheel and double-click events.
 * @param ref - The ref of the element to apply the pass-through behavior to.
 * @returns An object containing the onPointerDownCapture event handler.
 */
export function useD3ZoomPropagationProps({
  ref,
  propagateEvent,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  propagateEvent: PropagateEvent;
}) {
  const activeId = useRef<number | null>(null);

  const onPointerDownCapture = useCallback((e: React.PointerEvent) => {
    // Begin pass-through so d3-zoom receives the native stream
    activeId.current = e.pointerId;
    ref.current!.style.pointerEvents = "none";

    const restore = (ev: PointerEvent) => {
      if (ev.pointerId !== activeId.current) return;
      activeId.current = null;
      ref.current!.style.pointerEvents = "";
      window.removeEventListener("pointerup", restore, true);
      window.removeEventListener("pointercancel", restore, true);
    };
    window.addEventListener("pointerup", restore, true);
    window.addEventListener("pointercancel", restore, true);
  }, []);

  useEffect(() => {
    const el = ref.current!;
    const onSelectStart = (e: Event) => e.preventDefault();
    const onDragStart = (e: Event) => e.preventDefault();
    el.addEventListener("selectstart", onSelectStart, { capture: true });
    el.addEventListener("dragstart", onDragStart, { capture: true });
    return () => {
      el.removeEventListener("selectstart", onSelectStart, {
        capture: true,
      } as any);
      el.removeEventListener("dragstart", onDragStart, {
        capture: true,
      } as any);
    };
  }, []);

  const propagationProps = useMemo(
    () => ({
      ...createPropagationProps({ propagateEvent }).propagationProps,
      onPointerDownCapture,
    }),
    [propagateEvent, onPointerDownCapture],
  );

  return propagationProps;
}
