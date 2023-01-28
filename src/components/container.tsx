import { CSSProperties } from "react";
import { NoteStateType, ContainerInterface } from "../types";
import Note from "./note";

const Container = (props: ContainerInterface) => {
  let showPlaceholder: "none" | "drophere" | "placeholder" = "none";
  let containerClassName = "";
  let placeholderStyle: CSSProperties = {};
  let placeholderHeight = 50;
  let containerStyle: CSSProperties = {
    transition: `${props.needTransition}?"padding 0.1s ease-in":"none"}`,
  };

  if (props.selectedNoteRect) {
    placeholderHeight = props.selectedNoteRect.height;
  }

  placeholderStyle = {
    height: `${placeholderHeight}px`,
  };

  if (props.state === "inserting") {
    containerClassName = "list-inserting";
  } else if (props.state === "selected") {
  }
  if (props.state !== "still") showPlaceholder = "placeholder";

  if (
    (props.gridData.length === 0 && props.state !== "inserting") ||
    (props.gridData.length === 1 && props.state === "selected")
  ) {
    showPlaceholder = "drophere";
  }

  const saveContainerRef = (element: HTMLDivElement | null) => {
    if (element) {
      props.onSaveContainerRef(props.cntId, element);
    }
  };

  return (
    <div
      ref={saveContainerRef}
      className={`list ${containerClassName}`}
      style={containerStyle}
    >
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
      {showPlaceholder !== "none" ? (
        <div className={showPlaceholder} style={placeholderStyle}>
          {showPlaceholder === "drophere" ? "Drop here" : ""}
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default Container;
