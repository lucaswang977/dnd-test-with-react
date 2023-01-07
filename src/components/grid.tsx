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
    // When mouse is in dragging mode, we will do a lot of calculations here
    if (!draggingState || !mousePos) return;
    setDraggingState((ds) => {
      if (ds === undefined || !listRefs.current) return ds;

      const dsModified = { ...ds };

      // Move the selected note
      const selectedNote = noteRefs.current.find(
        (item) =>
          item.listId === ds.selectedListId &&
          item.rowIndex == ds.selectedRowIndex
      );
      const selectedListFirstNote = noteRefs.current.find(
        (item) => item.listId === ds.selectedListId && item.rowIndex === 0
      );

      if (
        selectedNote &&
        selectedListFirstNote &&
        dsModified.selectedNoteTransform
      ) {
        dsModified.selectedNoteTransform = {
          dx: mousePos.x - ds.mouseDownX,
          dy:
            mousePos.y -
            ds.mouseDownY +
            (selectedNote.top - selectedListFirstNote.top),
          w: dsModified.selectedNoteTransform.w,
          h: dsModified.selectedNoteTransform.h,
        };
      }

      // Find which list the dragging note is currently on.
      let targetList = listRefs.current.find(
        (list) =>
          list.listRef &&
          isPosInRect(mousePos, list.listRef.getBoundingClientRect())
      );

      // Calculate the transform data of the list which is being inserted.
      if (targetList) {
        if (targetList.listId !== ds.insertingListId) {
          dsModified.insertingListId = targetList.listId;
        }

        // We have to clone all the data otherwise data stored in refs
        // could be corrupted.
        let notesInInsertingList: NoteRef[] = [];

        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId) {
            notesInInsertingList.push({ ...item });
          }
        });

        notesInInsertingList.sort((a, b) => a.rowIndex - b.rowIndex);
        console.log("1)", notesInInsertingList);

        // If this list is also the selected list, we have to firstly
        // change the top of some notes since one note has been removed
        // from the list already (by position:fixed).

        // We have a note selected, so we should first update all the belowed note's
        // position then remove it from this list.
        if (targetList.listId === ds.selectedListId) {
          notesInInsertingList = notesInInsertingList.map(
            (item, currentRowIndex) => {
              if (currentRowIndex > ds.selectedRowIndex) {
                item.top = item.top - ds.selectedNoteHeightWithGap;
              }
              return { ...item };
            }
          );

          notesInInsertingList = notesInInsertingList.filter(
            (item) => item.rowIndex !== ds.selectedRowIndex
          );

          console.log("2)", notesInInsertingList);
        }

        // For later restore to this state
        const notesStoredState: NoteRef[] = notesInInsertingList.map((item) => {
          return { ...item };
        });
        console.log("Stored: ", notesStoredState);

        // We have an inserting note, so we should update
        // all the belowed note's posistion, but not inserting the selected one.
        if (ds.insertingRowIndex !== undefined) {
          notesInInsertingList = notesInInsertingList.map(
            (item, currentRowIndex) => {
              if (
                ds.insertingRowIndex !== undefined &&
                currentRowIndex >= ds.insertingRowIndex
              )
                item.top = item.top + ds.selectedNoteHeightWithGap;
              return { ...item };
            }
          );
        }
        console.log("3)", notesInInsertingList);

        // Find the new inserting row index.
        notesInInsertingList.map((item, currentRowIndex) => {
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

        // Restore to stored state then insert
        if (dsModified.insertingRowIndex !== ds.insertingRowIndex) {
          notesInInsertingList = notesStoredState.map(
            (item, currentRowIndex) => {
              if (
                ds.insertingRowIndex !== undefined &&
                currentRowIndex >= ds.insertingRowIndex
              )
                item.top = item.top + ds.selectedNoteHeightWithGap;
              return { ...item };
            }
          );
        }
        console.log("5)", notesInInsertingList);

        // Save the inserting list transform data for later rendering.
        const insertingListTransform: { dx: number; dy: number }[] = [];
        notesStoredState.map((item) => {
          let currentNoteTop = 0;
          const currentNote = notesInInsertingList.find(
            (i) => i.rowIndex == item.rowIndex
          );

          if (currentNote) currentNoteTop = currentNote.top;

          insertingListTransform[item.rowIndex] = {
            dx: 0,
            dy: currentNoteTop - item.top,
          };
        });
        console.log("6)", insertingListTransform);

        dsModified.insertingListTransform = insertingListTransform;
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

    // TODO: Update the grid state according to the latest dragging state.
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
    let selectedNoteTop = 0;
    let selectedNoteHeightWithGap = 0;
    let selectedListFirstNoteTop = 0;
    let insertingListTransformData: { dx: number; dy: number }[] = [];

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
            selectedNoteTop = item.top;
          }

          if (item.rowIndex === 0 && item.listId === selectedItem.listId)
            selectedListFirstNoteTop = item.top;
        }
      });

      noteRefs.current.forEach((item) => {
        if (
          item.listId === selectedItem.listId &&
          item.rowIndex > selectedItem.rowIndex
        )
          insertingListTransformData[item.rowIndex] = {
            dx: 0,
            dy: selectedNoteHeightWithGap,
          };
      });
    }
    console.log(
      "MouseDown",
      ev.clientX,
      ev.clientY,
      selectedItem,
      insertingListTransformData
    );
    setDraggingState({
      selectedListId: selectedItem.listId,
      selectedRowIndex: selectedItem.rowIndex,
      selectedNoteHeightWithGap: selectedNoteHeightWithGap,
      selectedNoteTransform: {
        dx: 0,
        dy: selectedNoteTop - selectedListFirstNoteTop,
        w: selectedNoteWidth,
        h: selectedNoteHeight,
      },
      mouseDownX: ev.clientX,
      mouseDownY: ev.clientY,
      insertingListId: selectedItem.listId,
      insertingRowIndex: selectedItem.rowIndex,
      insertingListTransform: insertingListTransformData,
    });
  };

  return (
    <div className="grid">
      {gridState.map((column, colIndex) => {
        let selectedNoteRowIndex = undefined;
        let selectedNoteTransform = undefined;
        let insertingNoteRowIndex = undefined;
        let insertingListTransform = undefined;
        let insertingNoteHeight = undefined;

        if (draggingState && draggingState.selectedListId === colIndex) {
          selectedNoteTransform = draggingState.selectedNoteTransform;
          selectedNoteRowIndex = draggingState.selectedRowIndex;
        }

        if (
          draggingState &&
          draggingState.insertingListId === colIndex &&
          draggingState.selectedNoteTransform
        ) {
          insertingListTransform = draggingState.insertingListTransform;
          insertingNoteHeight = draggingState.selectedNoteTransform.h;
          insertingNoteRowIndex = draggingState.insertingRowIndex;
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
            onNoteSelected={handleMouseDown}
            selectedNoteRowIndex={selectedNoteRowIndex}
            selectedNoteTransform={selectedNoteTransform}
            insertingNoteRowIndex={insertingNoteRowIndex}
            insertingNoteHeight={insertingNoteHeight}
            insertingListTransform={insertingListTransform}
          />
        );
      })}
    </div>
  );
};

export default Grid;
