import { useState, useEffect } from "react";
import { InputPosType } from "../types";
import { isPosInRect } from "../utilities";

// Support both mouse event & touch event.
export const useInputEvent = (refs: HTMLElement[]): [InputPosType, boolean] => {
  const [inputPos, setInputPos] = useState<InputPosType>({ x: 0, y: 0 });
  const [inputStarted, setInputStarted] = useState<boolean>(false);

  const handleMouseUp = () => {
    setInputStarted((started) => {
      if (started) {
        console.log("up:", started);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("mousemove", handleMouseMove);
        return false;
      }
      return started;
    });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setInputPos(() => {
      return {
        x: ev.clientX,
        y: ev.clientY,
      };
    });
  };

  const handleMouseDown = (ev: MouseEvent) => {
    setInputStarted((started) => {
      if (!started) {
        console.log("down:", started);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseMove);
        setInputPos({
          x: ev.clientX,
          y: ev.clientY,
        });

        return true;
      }

      return started;
    });
  };

  const handleTouchMove = (ev: TouchEvent) => {
    setInputPos(() => {
      const touch = ev.touches[0];
      ev.preventDefault();
      return {
        x: touch.clientX,
        y: touch.clientY,
      };
    });
  };

  const handleTouchStart = (ev: TouchEvent) => {
    setInputStarted((started) => {
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
      if (!started && focused) {
        ev.preventDefault();
        window.addEventListener("touchmove", handleTouchMove, {
          passive: false,
        });
        window.addEventListener("touchend", handleTouchEnd);

        setInputPos({
          x: touch.clientX,
          y: touch.clientY,
        });

        return true;
      }
      return started;
    });
  };

  const handleTouchEnd = () => {
    setInputStarted((started) => {
      if (started) {
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        return false;
      }

      return started;
    });
  };

  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("touchstart", handleTouchStart, { passive: false });
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);

  return [inputPos, inputStarted];
};
