import { useEffect } from "react";

// Support both mouse event & touch event.
export const useInputEvent = (
  inputStateCb: (started: boolean, pos: { x: number; y: number }) => void,
  inputMoveCb: (pos: { x: number; y: number }) => void
) => {
  const handleMouseUp = (ev: MouseEvent) => {
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);
    inputStateCb(false, { x: ev.clientX, y: ev.clientY });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    inputMoveCb({
      x: ev.clientX,
      y: ev.clientY,
    });
  };

  const handleMouseDown = (ev: MouseEvent) => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);
    inputStateCb(true, { x: ev.clientX, y: ev.clientY });
  };

  const handleTouchMove = (ev: TouchEvent) => {
    const touch = ev.touches[0];
    // To avoid scrolling
    ev.preventDefault();
    inputMoveCb({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchStart = (ev: TouchEvent) => {
    const touch = ev.touches[0];
    // To avoid scrolling
    ev.preventDefault();
    window.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleTouchEnd);

    inputStateCb(true, { x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (ev: TouchEvent) => {
    const touch = ev.changedTouches[ev.changedTouches.length - 1];
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
