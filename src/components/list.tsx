import { useRef, useState } from "react";
import { Note, NoteRefs } from "../types";

export interface ListInterface {
  listId: number;
  data: Note[];
  noteTops: number[];
  saveListRef: (element: HTMLElement | null) => void;
  saveNoteRef: (
    listId: number,
    noteId: number,
    element: HTMLElement | null
  ) => void;
  selectedNoteRowIndex: number | undefined;
  selectedNoteTransform:
    | { x: number; y: number; w: number; h: number }
    | undefined;
  insertingNoteTransform:
    | { w: number; h: number; y: number; offset: number }
    | undefined;
  onNoteSelected: (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { listId: number; noteId: number; rowIndex: number }
  ) => void;
}

const findInsertIndexByYAxis = (posY: number, heights: number[]) => {
  const resultIndex = heights.sort((a, b) => a - b).findIndex((y) => posY <= y);
  return resultIndex < 0 ? heights.length : resultIndex;
};

const List = (props: ListInterface) => {
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
            position: "fixed",
            zIndex: 1,
            height: `${props.selectedNoteTransform.h}px`,
            width: `${props.selectedNoteTransform.w}px`,
            transform: `translateX(${ox}px) translateY(${oy}px) scale(1)`,
          };
        }

        if (
          props.selectedNoteRowIndex !== rowIndex &&
          props.insertingNoteTransform !== undefined
        ) {
          let insertRowIndex =
            findInsertIndexByYAxis(
              props.insertingNoteTransform.y,
              props.noteTops
            ) - 1;
          if (insertRowIndex < 0) insertRowIndex = 0;

          console.log(
            insertRowIndex,
            props.insertingNoteTransform,
            props.noteTops
          );

          if (rowIndex >= insertRowIndex) {
            transformStyle = {
              transform: `translateY(${props.insertingNoteTransform.offset}px)`,
            };
          }
        }

        const saveNoteRef = (element: HTMLDivElement | null) => {
          if (element) {
            props.saveNoteRef(props.listId, note.id, element);
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
      {props.insertingNoteTransform !== undefined ? (
        <div
          className="placeholder"
          style={{
            display: "block",
            height: `${props.insertingNoteTransform.h}px`,
          }}
        ></div>
      ) : (
        <div className="placeholder"></div>
      )}
    </div>
  );
};

export default List;
