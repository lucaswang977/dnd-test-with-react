import { Note } from "../types";

export interface ListInterface {
  listId: number;
  data: Note[];
  saveListRef: (element: HTMLElement | null) => void;
  saveNoteRef: (
    listId: number,
    noteId: number,
    element: HTMLElement | null
  ) => void;
  selectedNoteId: number | undefined;
  selectedNoteTransform:
    | { x: number; y: number; w: number; h: number }
    | undefined;
  onNoteSelected: (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { listId: number; noteId: number }
  ) => void;
}

const List = (props: ListInterface) => {
  return (
    <div ref={props.saveListRef} className="list">
      {props.data.map((note, rowIndex) => {
        let transformStyle = {};

        if (
          props.selectedNoteId !== undefined &&
          props.selectedNoteTransform !== undefined
        ) {
          if (props.selectedNoteId === note.id) {
            transformStyle = {
              position: "fixed",
              height: `${props.selectedNoteTransform.h}px`,
              width: `${props.selectedNoteTransform.w}px`,
              transform: `translateX(${props.selectedNoteTransform.x}px) translateY(${props.selectedNoteTransform.y}px) scale(1.05)`,
            };
          } else if (
            rowIndex >
            props.data.findIndex((item) => item.id === props.selectedNoteId)
          ) {
            transformStyle = {
              transform: `translateY(${props.selectedNoteTransform.h}px)`,
            };
          }
        }
        const saveNoteRef = (element: HTMLElement | null) => {
          if (element) props.saveNoteRef(props.listId, note.id, element);
        };
        return (
          <div
            ref={saveNoteRef}
            key={note.id}
            className="note"
            style={transformStyle}
            onMouseDown={(ev) =>
              props.onNoteSelected(ev, {
                listId: props.listId,
                noteId: note.id,
              })
            }
          >
            <p>Item {note.id + 1}</p>
            <p className="text">{note.text}</p>
          </div>
        );
      })}
      {props.selectedNoteId !== undefined &&
      props.selectedNoteTransform !== undefined ? (
        <div
          className="placeholder"
          style={{ height: `${props.selectedNoteTransform.h}px` }}
        ></div>
      ) : (
        <div className="placeholder"></div>
      )}
    </div>
  );
};

export default List;
