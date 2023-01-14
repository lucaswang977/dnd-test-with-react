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
          display: "block",
          height: `${props.height}px`,
        }}
      ></div>
    );
  } else {
    return <div className="placeholder"></div>;
  }
};

const List = (props: ListInterface) => {
  let phDisplay = false;
  let phHeight = 0;

  // if (props.gridData.length === 1 && props.selectedNoteRowIndex) {
  //   phDisplay = true;
  // }

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

        // if (transformData.height !== undefined)
        //   transformStyle.height = transformData.height;
        // transformStyle = {
        //   transform: `translateY(${oy}px)`,
        // };

        // if (
        //   props.selectedNoteRowIndex === rowIndex &&
        //   props.selectedNoteTransform
        // ) {
        //   const dx = props.selectedNoteTransform.dx;
        //   const dy = props.selectedNoteTransform.dy;
        //   transformStyle = {
        //     position: "absolute",
        //     zIndex: 1,
        //     width: `${props.selectedNoteTransform.w}px`,
        //     transform: `translateX(${dx}px) translateY(${dy}px) scale(1.02)`,
        //   };
        // }

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
      <NotePlaceholder display={phDisplay} height={phHeight} />
    </div>
  );
};

export default List;
