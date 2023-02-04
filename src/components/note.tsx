import { CSSProperties } from "react";
import { NoteInterface } from "../types";

const Note = (props: NoteInterface) => {
  let transition = "none";
  // console.log(
  //   "Note component re-render.",
  //   props.cntId,
  //   props.rowIndex,
  //   props.state.state
  // );
  if (props.state.transition) {
    transition = `transform ${props.state.duration}s ease-out`;
  }
  const saveNoteRef = (element: HTMLDivElement | null) => {
    if (element) {
      props.onSaveNoteRef(props.cntId, props.rowIndex, element);
    }
  };
  let transformStyle: CSSProperties = {};
  if (props.state.state === "dragging") {
    transformStyle = {
      position: "absolute",
      zIndex: 1,
      width: `${props.state.data.w}px`,
      transform: `translateX(${props.state.data.dx}px) translateY(${props.state.data.dy}px)`,
      transition: `${transition}`,
    };
  } else if (props.state.state === "still") {
    transformStyle = {
      transform: `translateY(${props.state.data.dy}px)`,
      transition: `${transition}`,
    };
  }
  return (
    <div ref={saveNoteRef} className="note" style={transformStyle}>
      <p>Item {props.noteId + 1}</p>
      <p className="text">{props.noteText}</p>
    </div>
  );
};

export default Note;
