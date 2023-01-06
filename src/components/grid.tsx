// [x] We need the note to be fixed width and variable height.
// [x] We will store the refs of all the notes and update as they change.
// [x] A note can be dragged in front of any note in other lists.
// [x] Make the height of every list is different.
// [ ] Separate List from Grid, update them individually.
// [ ] Add animating effect.
// [ ] Reduce unnecessary rendering.
// [ ] Write a blog on this implementation.
//
// Note:
// * Transform.translate accepts the arguments which are relative to the DOM's original positions.
// * So after re-layout, the DOM is changed, we have to re-caculate the mouse down pos with the new DOM position.
//
// Update: (learned from RBD)
// * We don't have to change the source DOM when the note is dragged into another list,
//   it should be removed once the mouse is up. (this will solve the shaky problem when
//   dragging across lists)
// * When dragging is started, the dragged element will be set to position:fixed, and transform
//   will also be set on all the belowed elements.
// * The key point is to never reset the source element's DOM position to avoid re-calculate
//   the transform arguments.

import { useEffect, useState, useRef, useMemo } from "react";
import { GridData, DraggingStateType, NoteRef, ListRef } from "../types";
import List from "./list";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const listRefs = useRef<ListRef[]>([]);

  // It will be accessed in window's event handler
  const [mousePos, _setMousePos] = useState<{ x: number; y: number }>();
  const mousePosRef = useRef(mousePos);
  const setMousePos = (pos: { x: number; y: number }) => {
    mousePosRef.current = mousePos;
    _setMousePos(pos);
  };

  // Utility functions
  const isPosInRect = (pos: { x: number; y: number }, rect: DOMRect) =>
    pos.x >= rect.x &&
    pos.x <= rect.x + rect.width &&
    pos.y >= rect.y &&
    pos.y <= rect.y + rect.height;

  useEffect(() => {
    if (!draggingState || !mousePos) return;
    // When mouse is in dragging mode, we will do a lot of calculations here
    setDraggingState((ds) => {
      if (ds === undefined) return ds;
      const dsModified = { ...ds };

      // The tops/heights of notes are recorded when mouse down,
      // here we filter out the data belongs to this list and sort by rowIndex.
      // We have to clone all the data otherwise it could cause
      // data stored in refs be corrupted.

      // First calculate the state of the list which contains the selected note.
      let notesInCurrentList: NoteRef[] = [];

      noteRefs.current.forEach((item) => {
        if (item.listId === ds.selectedListId) {
          notesInCurrentList.push({ ...item });
        }
      });
      notesInCurrentList.sort((a, b) => a.rowIndex - b.rowIndex);

      // We have a note selected, so we should first update all the belowed note's
      // position then remove it from this list.
      notesInCurrentList.map((item, currentRowIndex) => {
        if (currentRowIndex > ds.selectedRowIndex)
          item.top = item.top - ds.selectedNoteHeightWithGap;
      });

      notesInCurrentList = notesInCurrentList.filter(
        (item) => item.rowIndex !== ds.selectedRowIndex
      );

      // TODO: Save current state for later selected list rendering
      const selectedList = noteRefs.current.filter(
        (item) => item.listId === ds.selectedListId
      );
      selectedList.sort((a, b) => a.rowIndex - b.rowIndex);
      const selectedListTransform = selectedList.map((item) => {
        if (item.rowIndex === ds.selectedRowIndex) {
          return {
            dx: mousePos.x - ds.mouseDownX,
            dy: mousePos.y - ds.mouseDownY,
          };
        } else {
          return {
            dx: 0,
            dy: notesInCurrentList.find((i) => i.rowIndex == item.rowIndex)
              ?.top,
          };
        }
      });

      // Second, calculate the state of the list which is being inserted.
      if (listRefs.current) {
        const targetList = listRefs.current.find(
          (list) =>
            list.listRef &&
            isPosInRect(mousePos, list.listRef.getBoundingClientRect())
        );

        if (targetList === undefined) return ds;

        if (targetList.listId !== ds.insertingListId) {
          dsModified.insertingListId = targetList.listId;
        }

        // If selected list is different from inserting list,
        // we should recreate the calculating data.
        if (targetList.listId !== ds.selectedListId) {
          notesInCurrentList = [];
          noteRefs.current.forEach((item) => {
            if (item.listId === targetList.listId) {
              notesInCurrentList.push({ ...item });
            }
          });
          notesInCurrentList.sort((a, b) => a.rowIndex - b.rowIndex);
        }

        // We have an inserting note, so we should update
        // all the belowed note's posistion, but not inserting the selected one.
        if (ds.insertingRowIndex !== undefined) {
          console.log("ds.inserting", ds.insertingRowIndex);
          notesInCurrentList.map((item, currentRowIndex) => {
            if (
              ds.insertingRowIndex !== undefined &&
              currentRowIndex >= ds.insertingRowIndex
            )
              item.top = item.top + ds.selectedNoteHeightWithGap;
          });
        }

        console.log("3)", notesInCurrentList);

        // Find the suitable inserting row index.
        notesInCurrentList.map((item, currentRowIndex) => {
          const tp = item.top;
          const sp = tp + item.heightWithGap / 2;
          const bt = tp + item.heightWithGap;

          if (mousePos.y <= sp && mousePos.y >= tp) {
            dsModified.insertingRowIndex = currentRowIndex;
          } else if (mousePos.y <= bt && mousePos.y > sp) {
            dsModified.insertingRowIndex = currentRowIndex + 1;
          }
          console.log(
            "4)",
            mousePos.y,
            tp,
            sp,
            bt,
            dsModified.insertingRowIndex
          );
        });

        // TODO: Save the inserting list state for later rendering.
      }

      return dsModified;
    });
  }, [mousePos]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log("MouseUp", ev.clientX, ev.clientY);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setDraggingState(undefined);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({ x: ev.clientX, y: ev.clientY });
  };

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    selectedItem: { listId: number; rowIndex: number }
  ) => {
    setMousePos({ x: ev.clientX, y: ev.clientY });

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    let selectedNoteWidth = 0;
    let selectedNoteHeight = 0;
    let selectedNoteHeightWithGap = 0;

    // We do two things when mousedown is triggered:
    // * Save all the top/height(with gap) for later calculation on dragging state.
    // * Calculate the inserting(selected) note's height plus gap by
    //   finding the belowed note's top position minus itself's top position.
    if (noteRefs && noteRefs.current) {
      noteRefs.current.forEach((item) => {
        // Save all the tops in refs array
        if (item.noteRef) {
          item.top = item.noteRef.getBoundingClientRect().top;

          // When selected item is the last one, we use list's bottom as
          // the belowed note's top.
          let nextTop = 0;
          const nextItem = noteRefs.current.find(
            (comparingItem) =>
              comparingItem.listId === item.listId &&
              comparingItem.rowIndex === item.rowIndex + 1
          );
          if (nextItem !== undefined && nextItem.noteRef)
            nextTop = nextItem.noteRef.getBoundingClientRect().top;
          else {
            const lr = listRefs.current[item.listId].listRef;
            if (lr) nextTop = lr.getBoundingClientRect().bottom;
          }

          item.heightWithGap = nextTop - item.top;

          if (
            item.rowIndex === selectedItem.rowIndex &&
            item.listId === selectedItem.listId
          ) {
            selectedNoteWidth = item.noteRef.getBoundingClientRect().width;
            selectedNoteHeight = item.noteRef.getBoundingClientRect().height;
            selectedNoteHeightWithGap = item.heightWithGap;
          }

          console.log(
            item.listId,
            item.rowIndex,
            item.noteRef.getBoundingClientRect(),
            item.top,
            nextTop,
            item.heightWithGap
          );
        }
      });
    }
    console.log(
      "MouseDown",
      ev.clientX,
      ev.clientY,
      selectedItem,
      noteRefs.current
    );
    setDraggingState({
      selectedListId: selectedItem.listId,
      selectedRowIndex: selectedItem.rowIndex,
      selectedNoteHeightWithGap: selectedNoteHeightWithGap,
      w: selectedNoteWidth,
      h: selectedNoteHeight,
      mouseDownX: ev.clientX,
      mouseDownY: ev.clientY,
      insertingListId: selectedItem.listId,
      insertingRowIndex: selectedItem.rowIndex,
    });
  };

  return (
    <div className="grid">
      {gridState.map((column, colIndex) => {
        let selectedNoteRowIndex = undefined;
        let selectedNoteTransform = undefined;
        let insertingNoteTransform = undefined;
        let insertingNoteRowIndex = undefined;
        // TODO: This array should be optimized out.
        let noteTops: number[] = [];

        // The tops of notes are recorded when mouse down
        if (noteRefs && noteRefs.current) {
          let noteTopsInList = noteRefs.current.filter(
            (item) => item.listId === colIndex
          );
          noteTopsInList.sort((a, b) => a.rowIndex - b.rowIndex);
          noteTops = noteTopsInList.map((item) => item.top);
        }

        if (draggingState && mousePos) {
          // Update the list state when its inside note is being selected
          if (draggingState.selectedListId === colIndex) {
            selectedNoteRowIndex = draggingState.selectedRowIndex;

            selectedNoteTransform = {
              x: mousePos.x - draggingState.mouseDownX,
              y: mousePos.y - draggingState.mouseDownY,
              w: draggingState.w,
              h: draggingState.h,
            };
          }

          // Update the list state when there is a note being dragged onto itself.
          if (draggingState.insertingListId === colIndex) {
            insertingNoteRowIndex = draggingState.insertingRowIndex;
            insertingNoteTransform = {
              w: draggingState.w,
              h: draggingState.h,
              y: mousePos.y,
              offset: draggingState.selectedNoteHeightWithGap,
            };
          }
        }

        const saveListRef = (element: HTMLElement | null) => {
          if (listRefs.current && element) {
            let alreadyCreated = false;
            listRefs.current.map((item) => {
              if (item.listId === colIndex) {
                alreadyCreated = true;
                item.listRef = element;
              }
            });
            if (!alreadyCreated) {
              listRefs.current.push({ listId: colIndex, listRef: element });
            }
          }
        };

        const saveNoteRef = (
          listId: number,
          rowIndex: number,
          element: HTMLElement | null
        ) => {
          if (noteRefs.current && element) {
            const noteRef = noteRefs.current.find(
              (item) => item.listId === listId && item.rowIndex == rowIndex
            );

            if (noteRef) {
              noteRef.noteRef = element;
            } else {
              noteRefs.current.push({
                rowIndex: rowIndex,
                listId: listId,
                noteRef: element,
                top: 0,
                heightWithGap: 0,
              });
            }
          }
        };

        return (
          <List
            saveListRef={saveListRef}
            saveNoteRef={saveNoteRef}
            key={colIndex}
            listId={colIndex}
            data={column}
            noteTops={noteTops}
            onNoteSelected={handleMouseDown}
            selectedNoteRowIndex={selectedNoteRowIndex}
            selectedNoteTransform={selectedNoteTransform}
            insertingNoteRowIndex={insertingNoteRowIndex}
            insertingNoteTransform={insertingNoteTransform}
          />
        );
      })}
    </div>
  );
};

export default Grid;
