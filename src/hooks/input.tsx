import { useEffect } from "react";
import { isPosInRect } from "../utilities";

// Support both mouse event & touch event.
// InputPos will only change once touch is started or mouse is down.
export const useInputEvent = (
  refs: HTMLElement[],
  inputStateCb: (started: boolean, pos: { x: number; y: number }) => void,
  inputMoveCb: (pos: { x: number; y: number }) => void
) => {
  const handleMouseUp = (ev: MouseEvent) => {
    console.log("setInputStarted(mouse up)");
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);
    inputStateCb(false, { x: ev.clientX, y: ev.clientY });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    console.log("setInputPos(mouse move)");
    inputMoveCb({
      x: ev.clientX,
      y: ev.clientY,
    });
  };

  const handleMouseDown = (ev: MouseEvent) => {
    console.log("setInputStarted(mouse down)");
    if (refs) {
      const ref = refs.find((item) =>
        isPosInRect(
          { x: ev.clientX, y: ev.clientY },
          item.getBoundingClientRect()
        )
      );
      if (ref !== undefined) {
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseMove);
        inputStateCb(true, { x: ev.clientX, y: ev.clientY });
      }
    }
  };

  const handleTouchMove = (ev: TouchEvent) => {
    const touch = ev.touches[0];
    ev.preventDefault();
    inputMoveCb({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchStart = (ev: TouchEvent) => {
    let focused = false;
    const touch = ev.touches[0];
    if (refs) {
      const ref = refs.find((item) =>
        isPosInRect(
          { x: touch.clientX, y: touch.clientY },
          item.getBoundingClientRect()
        )
      );
      if (ref !== undefined) {
        focused = true;
      }
    }
    if (focused) {
      ev.preventDefault();
      window.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      window.addEventListener("touchend", handleTouchEnd);

      inputStateCb(true, { x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (ev: TouchEvent) => {
    const touch = ev.touches[0];
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
    inputStateCb(false, { x: touch.clientX, y: touch.clientY });
  };

  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);
};
