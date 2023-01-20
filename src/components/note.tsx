import { useEffect, useState, useRef, CSSProperties } from "react";
import { NoteInterface } from "../types";

// States: still, dragging, pushing
// enter-dragging(still->dragging),
// exit-dragging(dragging->still),
// enter-pushing(still->pushing),
// exit-pushing(pushing->still)

const Note = (props: NoteInterface) => {
  const [transitionState, setTransitionState] = useState<string>("still");
  const [refresh, setRefresh] = useState<boolean>(false);
  const noteRef = useRef<HTMLDivElement>();
  const handleTransitionEnd = () => {
    setRefresh(true);
  };

  useEffect(() => {
    if (refresh) {
      if (transitionState === "exit-dragging") {
        setTransitionState("still");
      } else if (transitionState === "enter-pushing") {
        setTransitionState("pushing");
      } else if (transitionState === "exit-pushing") {
        setTransitionState("still");
      }
      setRefresh(false);
    }
  }, [refresh]);

  if (props.state && transitionState !== props.state.state) {
    if (props.state.state === "dragging" && transitionState === "still") {
      setTransitionState("dragging");
    } else if (
      props.state.state === "still" &&
      transitionState === "dragging"
    ) {
      setTransitionState("exit-dragging");
    } else if (props.state.state === "pushing" && transitionState === "still") {
      setTransitionState("enter-pushing");
    } else if (props.state.state === "still" && transitionState === "pushing") {
      setTransitionState("exit-pushing");
    }
  }

  useEffect(() => {
    if (noteRef.current) {
      noteRef.current.addEventListener("transitionend", handleTransitionEnd);
    }

    return () => {
      if (noteRef.current)
        noteRef.current.removeEventListener(
          "transitionend",
          handleTransitionEnd
        );
    };
  }, []);

  let noteStyleName = "";
  if (transitionState === "dragging") {
    noteStyleName = "no-transition";
  } else if (transitionState === "enter-dragging") {
    noteStyleName = "no-transition";
  } else if (transitionState === "exit-dragging") {
    noteStyleName = "with-transform-transition";
  } else if (transitionState === "pushing") {
    noteStyleName = "with-transform-transition";
  } else if (transitionState === "enter-pushing") {
    noteStyleName = "with-transform-transition";
  } else if (transitionState === "exit-pushing") {
    noteStyleName = "with-transform-transition";
  }

  const saveNoteRef = (element: HTMLDivElement | null) => {
    if (element) {
      noteRef.current = element;
      props.onSaveNoteRef(props.listId, props.rowIndex, element);
    }
  };
  let transformStyle: CSSProperties = {};
  if (props.state) {
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