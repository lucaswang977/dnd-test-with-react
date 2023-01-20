import { useState, useRef, useEffect, CSSProperties } from "react";
import { Note } from "../types";

export interface ListInterface {
  listId: number;
  gridData: Note[];
  state: "still" | "inserting";
  onSaveListRef: (listId: number, element: HTMLElement | null) => void;
  onSaveNoteRef: (
    listId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
  transformStyles: CSSProperties[] | undefined;
  placeholderHeight: number | undefined;
}

const NotePlaceholder = (props: { display: boolean; height: number }) => {
  if (props.display) {
    return (
      <div
        className="placeholder"
        style={{
          height: `${props.height}px`,
        }}
      ></div>
    );
  } else {
    return (
      <div
        className="placeholder"
        style={{
          height: "0px",
        }}
      ></div>
    );
  }
};

const List = (props: ListInterface) => {
  let phDisplay = false;
  let phHeight = 0;
  let listStyleName = "";

  const [transitionState, _setTransitionState] = useState<string>("still");
  const [refresh, setRefresh] = useState<boolean>(false);
  const listRef = useRef<HTMLDivElement>();
  const setTransitionState = (t: any) => {
    _setTransitionState(t);
  };
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

  if (props.placeholderHeight !== undefined) {
    phDisplay = true;
    phHeight = props.placeholderHeight;
  }

  const saveListRef = (element: HTMLDivElement | null) => {
    if (element) {
      listRef.current = element;
      props.onSaveListRef(props.listId, element);
    }
  };

  if (transitionState === "enter-inserting") {
    listStyleName = "list-inserting list-inserting-entering";
  } else if (transitionState === "exit-inserting") {
    listStyleName = "list-inserting-exiting";
  } else if (transitionState === "inserting") {
    listStyleName = "list-inserting";
  }

  return (
    <div ref={saveListRef} className={`list ${listStyleName}`}>
      {props.gridData.map((note, rowIndex) => {
        let transformStyle = undefined;
        if (props.transformStyles) {
          transformStyle = props.transformStyles[rowIndex];
        }

        const saveNoteRef = (element: HTMLDivElement | null) => {
          if (element) {
            props.onSaveNoteRef(props.listId, rowIndex, element);
          }
        };
        return (
          <div
            ref={saveNoteRef}
            key={note.id}
            className="note"
            style={transformStyle}
          >
            <p>Item {note.id + 1}</p>
            <p className="text">{note.text}</p>
          </div>
        );
      })}
      {props.placeholderHeight !== undefined ? (
        <NotePlaceholder display={phDisplay} height={phHeight} />
      ) : undefined}
    </div>
  );
};

export default List;
