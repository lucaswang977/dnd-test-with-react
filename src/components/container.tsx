import { CSSProperties } from "react";
import { NoteStateType, ContainerInterface } from "../types";
import Note from "./note";

export const Container = (props: ContainerInterface) => {
  const DEFAULT_DROP_HERE_HEIGHT = 50;
  let showPlaceholder:
    | "placeholder-none"
    | "placeholder-drophere"
    | "placeholder-normal" = "placeholder-none";
  let containerClassName = "";
  let placeholderStyle: CSSProperties = {};
  let placeholderHeight = 0;
  let transition = "none";

  // console.log("Container component re-render.", props.cntId, props.state.state);
  if (props.state) {
    if (props.state.state === "inserting") {
      containerClassName = "list-inserting";
      showPlaceholder = "placeholder-normal";

      if (props.selectedNoteRect) {
        placeholderHeight =
          props.selectedNoteRect.height + props.selectedNoteRect.gap;
      }
    } else if (props.state.state === "selected") {
      showPlaceholder = "placeholder-normal";

      if (props.selectedNoteRect) {
        placeholderHeight =
          props.selectedNoteRect.height + props.selectedNoteRect.gap;
      }

      if (props.gridData.length === 1) {
        showPlaceholder = "placeholder-drophere";
      }
    } else if (props.state.state === "still") {
      showPlaceholder = "placeholder-none";
      if (props.gridData.length === 0) {
        showPlaceholder = "placeholder-drophere";

        if (props.selectedNoteRect) {
          placeholderHeight =
            props.selectedNoteRect.height + props.selectedNoteRect.gap;
        } else {
          placeholderHeight = DEFAULT_DROP_HERE_HEIGHT;
        }
      }
    }
    transition = props.state.transition ? "height 0.1s ease-in" : "none";
  } else {
    if (props.gridData.length === 0) {
      placeholderHeight = DEFAULT_DROP_HERE_HEIGHT;
      showPlaceholder = "placeholder-drophere";
    }
  }
  placeholderStyle = {
    transition: `${transition}`,
    height: `${placeholderHeight}px`,
  };

  const saveContainerRef = (element: HTMLDivElement | null) => {
    if (element) {
      props.onSaveContainerRef(props.cntId, element);
    }
  };

  return (
    <div ref={saveContainerRef} className={`list ${containerClassName}`}>
      {props.gridData.map((note, rowIndex) => {
        let noteState: NoteStateType = {
          cntId: props.cntId,
          rowIndex: rowIndex,
          transition: false,
          state: "still",
          data: { dx: 0, dy: 0, w: 0 },
        };

        if (props.noteStates) {
          const state = props.noteStates.find(
            (item) => item.cntId === props.cntId && item.rowIndex === rowIndex
          );
          if (state) noteState = state;
        }

        return (
          <Note
            key={note.id}
            noteId={note.id}
            noteText={note.text}
            cntId={props.cntId}
            rowIndex={rowIndex}
            state={noteState}
            onSaveNoteRef={props.onSaveNoteRef}
          />
        );
      })}
      {
        <div className={showPlaceholder} style={placeholderStyle}>
          {showPlaceholder === "placeholder-drophere" ? "Drop here" : ""}
        </div>
      }
    </div>
  );
};
