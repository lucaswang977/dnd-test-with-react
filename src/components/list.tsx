import { useState, useRef, useEffect } from "react";
import { NoteStateType, ListInterface } from "../types";
import Note from "./note";

const List = (props: ListInterface) => {
  let listStyleName = "";

  const [transitionState, setTransitionState] = useState<string>("still");
  const [refresh, setRefresh] = useState<boolean>(false);
  const listRef = useRef<HTMLDivElement>();
  const handleTransitionEnd = () => {
    setRefresh(true);
  };

  useEffect(() => {
    if (refresh) {
      if (transitionState === "exit-inserting") {
        setTransitionState("still");
      } else if (transitionState === "enter-inserting") {
        setTransitionState("inserting");
      }
      setRefresh(false);
    }
  }, [refresh]);

  if (props.state && transitionState !== props.state) {
    if (props.state === "still" && transitionState === "inserting") {
      setTransitionState("exit-inserting");
    } else if (props.state === "inserting" && transitionState === "still") {
      setTransitionState("enter-inserting");
    }
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.addEventListener("transitionend", handleTransitionEnd);
    }

    return () => {
      if (listRef.current)
        listRef.current.removeEventListener(
          "transitionend",
          handleTransitionEnd
        );
    };
  }, []);

  if (transitionState === "enter-inserting") {
    listStyleName = "list-inserting list-inserting-entering";
  } else if (transitionState === "exit-inserting") {
    listStyleName = "list-inserting-exiting";
  } else if (transitionState === "inserting") {
    listStyleName = "list-inserting";
  }

  const saveListRef = (element: HTMLDivElement | null) => {
    if (element) {
      listRef.current = element;
      props.onSaveListRef(props.listId, element);
    }
  };

  return (
    <div ref={saveListRef} className={`list ${listStyleName}`}>
      {props.gridData.map((note, rowIndex) => {
        let noteState: NoteStateType = {
          listId: props.listId,
          rowIndex: rowIndex,
          transition: false,
          state: "still",
          data: { dx: 0, dy: 0, w: 0 },
        };

        if (props.noteStates) {
          const state = props.noteStates.find(
            (item) => item.listId === props.listId && item.rowIndex === rowIndex
          );
          if (state) noteState = state;
        }

        return (
          <Note
            key={note.id}
            noteId={note.id}
            noteText={note.text}
            listId={props.listId}
            rowIndex={rowIndex}
            state={noteState}
            onSaveNoteRef={props.onSaveNoteRef}
          />
        );
      })}
      {props.showPlaceholder ? (
        <div className="placeholder">Drop here</div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default List;
