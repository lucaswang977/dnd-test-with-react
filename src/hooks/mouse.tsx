import { useState, useEffect } from "react";
import { MousePosType } from "../types";

export const useMouse = (): [MousePosType, boolean] => {
  const [mousePos, setMousePos] = useState<MousePosType>({ x: 0, y: 0 });
  const [mousePressed, setMousePressed] = useState<boolean>(false);

  const handleMouseUp = () => {
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setMousePressed(false);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({
      x: ev.clientX,
      y: ev.clientY,
    });
  };

  const handleMouseDown = (ev: MouseEvent) => {
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    setMousePos({
      x: ev.clientX,
      y: ev.clientY,
    });
    setMousePressed(true);
  };

  useEffect(() => {
    window.addEventListener("mousedown", handleMouseDown);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
    };
  }, []);

  return [mousePos, mousePressed];
};
