import { useState, useRef, useEffect, CSSProperties } from "react";
import { NoteStateType, ContainerInterface } from "../types";
import Note from "./note";

const Container = (props: ContainerInterface) => {
  let listClassName = "";
  let listStyle: CSSProperties = {};

  const [transitionState, setTransitionState] = useState<string>("still");
  const [refresh, setRefresh] = useState<boolean>(false);
  const cntRef = useRef<HTMLDivElement>();
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
    } else if (props.state === "selected") {
      setTransitionState("selected");
    }
  }

  useEffect(() => {
    if (cntRef.current) {
      cntRef.current.addEventListener("transitionend", handleTransitionEnd);
    }

    return () => {
      if (cntRef.current)
        cntRef.current.removeEventListener(
          "transitionend",
          handleTransitionEnd
        );
    };
  }, []);

  if (transitionState === "enter-inserting") {
    listClassName = "list-inserting list-inserting-entering";
    if (props.selectedNoteRect) {
      listStyle = {
        transition: `${props.needTransition}?"padding 0.1s ease-in":"none"}`,
        paddingBottom: `${
          props.selectedNoteRect.height + props.selectedNoteRect.gap
        }px`,
      };
    }
  } else if (transitionState === "exit-inserting") {
    listClassName = "list-inserting-exiting";
    if (props.selectedNoteRect) {
      listStyle = {
        transition: `${props.needTransition}?"padding 0.1s ease-in":"none"}`,
      };
    }
  } else if (transitionState === "inserting") {
    listClassName = "list-inserting";
    if (props.selectedNoteRect) {
      listStyle = {
        transition: `${props.needTransition}?"padding 0.1s ease-in":"none"}`,
        paddingBottom: `${
          props.selectedNoteRect.height + props.selectedNoteRect.gap
        }px`,
      };
    }
  } else if (transitionState === "selected") {
    if (props.selectedNoteRect) {
      listStyle = {
        transition: `${props.needTransition}?"padding 0.1s ease-in":"none"}`,
        paddingBottom: `${
          props.selectedNoteRect.height + props.selectedNoteRect.gap
        }px`,
      };
    }
  }

  const saveContainerRef = (element: HTMLDivElement | null) => {
    if (element) {
      cntRef.current = element;
      props.onSaveContainerRef(props.cntId, element);
    }
  };

  return (
    <div
      ref={saveContainerRef}
      className={`list ${listClassName}`}
      style={listStyle}
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
      {props.showPlaceholder ? (
        <div className="placeholder">Drop here</div>
      ) : (
        <></>
      )}
    </div>
  );
};

export default Container;
