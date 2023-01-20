import { CSSProperties } from "react";
import { NoteInterface } from "../types";

// States: still, dragging, pushing
// enter-dragging(still->dragging),
// exit-dragging(dragging->still),
// enter-pushing(still->pushing),
// exit-pushing(pushing->still)

const Note = (props: NoteInterface) => {
  const saveNoteRef = (element: HTMLDivElement | null) => {
    if (element) {
      props.onSaveNoteRef(props.listId, props.rowIndex, element);
    }
  };
  let transformStyle: CSSProperties = {};
  if (props.state) {
    console.log("Note state:", props.state);
    if (props.state.state === "dragging") {
      transformStyle = {
        position: "absolute",
        zIndex: 1,
        width: `${props.state.data.w}px`,
        transform: `translateX(${props.state.data.dx}px) translateY(${props.state.data.dy}px)`,
      };
    } else if (props.state.state === "pushing") {
      transformStyle = {
        transform: `translateY(${props.state.data.dy}px)`,
      };
    }
  }
  return (
    <div ref={saveNoteRef} className="note" style={transformStyle}>
      <p>Item {props.noteId + 1}</p>
      <p className="text">{props.noteText}</p>
    </div>
  );
};

export default Note;
