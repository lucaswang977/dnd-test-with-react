import { CSSProperties } from "react";
import { NoteInterface } from "../types";

const Note = (props: NoteInterface) => {
  let noteStyleName = "no-transition";
  if (props.state.transition) {
    noteStyleName = "with-transition";
  }
  const saveNoteRef = (element: HTMLDivElement | null) => {
    if (element) {
      props.onSaveNoteRef(props.listId, props.rowIndex, element);
    }
  };
  let transformStyle: CSSProperties = {};
  if (props.state.state === "dragging") {
    transformStyle = {
      position: "absolute",
      zIndex: 1,
      width: `${props.state.data.w}px`,
      transform: `translateX(${props.state.data.dx}px) translateY(${props.state.data.dy}px)`,
    };
  } else if (props.state.state === "still") {
    transformStyle = {
      transform: `translateY(${props.state.data.dy}px)`,
    };
  }
  return (
    <div
      ref={saveNoteRef}
      className={`note ${noteStyleName}`}
      style={transformStyle}
    >
      <p>Item {props.noteId + 1}</p>
      <p className="text">{props.noteText}</p>
    </div>
  );
};

export default Note;
