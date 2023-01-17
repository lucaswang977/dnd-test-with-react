import { CSSProperties } from "react";
import { Note } from "../types";

export interface ListInterface {
  listId: number;
  gridData: Note[];
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
          transition: "height 0.2s ease-in",
        }}
      ></div>
    );
  } else {
    return (
      <div
        className="placeholder"
        style={{
          height: "0px",
          transition: "height 0.2s ease-in",
        }}
      ></div>
    );
  }
};

const List = (props: ListInterface) => {
  let phDisplay = false;
  let phHeight = 0;

  if (props.placeholderHeight !== undefined) {
    phDisplay = true;
    phHeight = props.placeholderHeight;
  }

  const saveListRef = (element: HTMLDivElement | null) => {
    if (element) props.onSaveListRef(props.listId, element);
  };

  return (
    <div ref={saveListRef} className="list">
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
