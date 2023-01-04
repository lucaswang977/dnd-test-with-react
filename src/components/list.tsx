import { Note } from "../types";

export interface ListInterface {
  listId: number;
  data: Note[];
  // TODO: We should transform all the notes according to this array
  noteTops: number[];
  saveListRef: (element: HTMLElement | null) => void;
  saveNoteRef: (
    listId: number,
    noteId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
  selectedNoteRowIndex: number | undefined;
  selectedNoteTransform:
    | { x: number; y: number; w: number; h: number }
    | undefined;
  insertingNoteRowIndex: number | undefined;
  insertingNoteTransform:
    | { w: number; h: number; y: number; offset: number }
    | undefined;
  onNoteSelected: (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { listId: number; noteId: number; rowIndex: number }
  ) => void;
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

  if (props.data.length === 1 && props.selectedNoteRowIndex !== undefined) {
    phDisplay = true;
  }

  if (
    props.insertingNoteRowIndex !== undefined &&
    props.insertingNoteTransform != undefined
  ) {
    phDisplay = true;
    phHeight = props.insertingNoteTransform.h;
  }

  return (
    <div ref={props.saveListRef} className="list">
      {props.data.map((note, rowIndex) => {
        let transformStyle = {};

        if (
          props.selectedNoteRowIndex === rowIndex &&
          props.selectedNoteTransform !== undefined
        ) {
          let parentOffsetY = 0;
          if (props.noteTops) {
            parentOffsetY = props.noteTops[rowIndex] - props.noteTops[0];
          }
          const ox = props.selectedNoteTransform.x;
          const oy = props.selectedNoteTransform.y + parentOffsetY;
          transformStyle = {
            position: "absolute",
            zIndex: 1,
            width: `${props.selectedNoteTransform.w}px`,
            transform: `translateX(${ox}px) translateY(${oy}px) scale(1)`,
          };
        }

        if (
          props.selectedNoteRowIndex !== rowIndex &&
          props.insertingNoteRowIndex !== undefined &&
          props.insertingNoteTransform !== undefined
        ) {
          if (rowIndex >= props.insertingNoteRowIndex) {
            transformStyle = {
              transform: `translateY(${props.insertingNoteTransform.offset}px)`,
            };
          }
        }

        const saveNoteRef = (element: HTMLDivElement | null) => {
          if (element) {
            props.saveNoteRef(props.listId, note.id, rowIndex, element);
          }
        };
        return (
          <div
            ref={saveNoteRef}
            key={note.id}
            className="note"
            style={transformStyle}
            onMouseDown={(ev) => {
              props.onNoteSelected(ev, {
                listId: props.listId,
                noteId: note.id,
                rowIndex: rowIndex,
              });
            }}
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
