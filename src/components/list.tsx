import { Note } from "../types";

export interface ListInterface {
  listId: number;
  data: Note[];
  saveListRef: (element: HTMLElement | null) => void;
  saveNoteRef: (
    listId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
  selectedNoteRowIndex: number | undefined;
  selectedNoteTransform:
    | { dx: number; dy: number; w: number; h: number }
    | undefined;
  insertingNoteRowIndex: number | undefined;
  insertingNoteHeight: number | undefined;
  insertingListTransform: { dx: number; dy: number }[] | undefined;
  onNoteSelected: (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { listId: number; rowIndex: number }
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

  if (props.data.length === 1 && props.selectedNoteRowIndex) {
    phDisplay = true;
  }

  if (
    props.insertingNoteRowIndex !== undefined &&
    props.insertingNoteHeight !== undefined
  ) {
    phDisplay = true;
    phHeight = props.insertingNoteHeight;
  }

  return (
    <div ref={props.saveListRef} className="list">
      {props.data.map((note, rowIndex) => {
        let transformStyle = {};
        let transformData = undefined;

        if (props.insertingListTransform)
          transformData = props.insertingListTransform;

        if (transformData) {
          console.log("TransformData: ", rowIndex, transformData);
          const oy = transformData[rowIndex] ? transformData[rowIndex].dy : 0;
          transformStyle = {
            transform: `translateY(${oy}px)`,
          };
        }

        if (
          props.selectedNoteRowIndex === rowIndex &&
          props.selectedNoteTransform
        ) {
          const dx = props.selectedNoteTransform.dx;
          const dy = props.selectedNoteTransform.dy;
          transformStyle = {
            position: "absolute",
            zIndex: 1,
            width: `${props.selectedNoteTransform.w}px`,
            transform: `translateX(${dx}px) translateY(${dy}px) scale(1)`,
          };
        }

        const saveNoteRef = (element: HTMLDivElement | null) => {
          if (element) {
            props.saveNoteRef(props.listId, rowIndex, element);
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
