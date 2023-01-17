// [x] We need the note to be fixed width and variable height.
// [x] We will store the refs of all the notes and update as they change.
// [x] A note can be dragged in front of any note in other lists.
// [x] Make the height of every list is different.
// [x] Separate List from Grid, update them individually.
// [x] Unit testing on most of the code.
// [x] Abstract the core data structure to separated file and be unit tested.
// [x] Separate grid data refresh state from mouse state.
// [x] Mouse down event should be captured outside the list component.
// [x] Separate mouse event to a custom hook.
// [x] Reduce grid file size by removing unnecessary states / calcs.
// [x] Support touch gesture.
// [x] Test framework moves to Vitest.
// [ ] Add animating effect.
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

import { useEffect, useState, useRef } from "react";
import { useInputEvent } from "../hooks/input";
import List from "./list";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ListRef,
  TopHeight,
} from "../types";

import {
  isPosInRect,
  removeItemFromTopHeightList,
  insertItemIntoTopHeightList,
  findInsertingIndexFromTopHeightList,
  minusTwoTopHeightList,
  removeElementByIndex,
  insertElementIntoArray,
} from "../utilities";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const listRefs = useRef<ListRef[]>([]);
  const hotSpots = useRef<HTMLElement[]>([]);

  const [inputPos, inputStarted] = useInputEvent(hotSpots.current);

  // We will save current visuall state of every note when mousedown is triggered
  const onNoteSelected = () => {
    let selectedItem = noteRefs.current.find((item) =>
      item.noteRef
        ? isPosInRect(inputPos, item.noteRef.getBoundingClientRect())
        : false
    );

    if (selectedItem === undefined) return;
    console.log(
      "Note selected:",
      inputPos,
      selectedItem.listId,
      selectedItem.rowIndex
    );

    // Save current rect of all the lists in the refs array
    listRefs.current.forEach((item) => {
      if (item.listRef) {
        const rect = item.listRef.getBoundingClientRect();
        item.rect = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          height: rect.height,
          width: rect.width,
          gap: 0,
        };
      }
    });

    // Save current rect of all the notes in the refs array
    noteRefs.current.forEach((item) => {
      if (item.noteRef) {
        const rect = item.noteRef.getBoundingClientRect();
        item.rect = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          height: rect.height,
          width: rect.width,
          gap: 0,
        };

        // When the item is the last one, we use list's bottom as the belowed
        // note's top.
        let nextTop = 0;
        const nextItem = noteRefs.current.find(
          (comparingItem) =>
            comparingItem.listId === item.listId &&
            comparingItem.rowIndex === item.rowIndex + 1
        );
        if (nextItem !== undefined && nextItem.noteRef)
          nextTop = nextItem.noteRef.getBoundingClientRect().top;
        else {
          const lr = listRefs.current[item.listId];
          if (lr && lr.rect) nextTop = lr.rect.bottom;
        }

        item.rect.gap = nextTop - item.rect.bottom;
      }
    });

    const ds: DraggingStateType = {
      selectedListId: selectedItem.listId,
      selectedRowIndex: selectedItem.rowIndex,
      selectedRect: selectedItem.rect,
      mouseDownX: inputPos.x,
      mouseDownY: inputPos.y,
      insertingListId: selectedItem.listId,
      insertingRowIndex: selectedItem.rowIndex,
    };

    setDraggingState(ds);
  };

  // When mouse is up, current state is checked to see if we should update
  // the grid data in order to update the entire grid state.
  const onNoteReleased = () => {
    if (draggingState === undefined) return;

    console.log(
      "Note released:",
      inputPos,
      draggingState.selectedListId,
      draggingState.selectedRowIndex
    );

    setGridState((gs) => {
      const newGridData = gs.map((item) => {
        return item.map((item) => {
          return { ...item };
        });
      });
      const selectedNote =
        newGridData[draggingState.selectedListId][
          draggingState.selectedRowIndex
        ];

      if (
        draggingState.insertingListId !== undefined &&
        draggingState.insertingRowIndex !== undefined
      ) {
        // Remove the note from the selected list
        newGridData[draggingState.selectedListId] = removeElementByIndex(
          newGridData[draggingState.selectedListId],
          draggingState.selectedRowIndex
        );

        // Insert into the new list
        newGridData[draggingState.insertingListId] = insertElementIntoArray(
          newGridData[draggingState.insertingListId],
          draggingState.insertingRowIndex,
          selectedNote
        );
      }

      return newGridData;
    });
    noteRefs.current = [];
    listRefs.current = [];
    setDraggingState(undefined);
  };

  // When mouse is in dragging mode, we will update the visual state by
  // calculating all the temporary state.
  const onNoteBeingDragged = () => {
    if (!draggingState) return;

    setDraggingState((ds) => {
      if (ds === undefined || !listRefs.current) return ds;

      const dsModified = { ...ds };
      dsModified.transformStyles = [];

      // Move the selected note
      const selectedNote = noteRefs.current.find(
        (item) =>
          item.listId === ds.selectedListId &&
          item.rowIndex === ds.selectedRowIndex
      );

      // We need the top note's rect to calculate the transforming
      // data when the selected note's position is set to 'absolute'.
      const selectedListTopNote = noteRefs.current.find(
        (item) => item.listId === ds.selectedListId && item.rowIndex === 0
      );

      let selectedNoteCenterX = inputPos.x;
      let selectedNoteCenterY = inputPos.y;
      const offsetX = inputPos.x - ds.mouseDownX;
      const offsetY = inputPos.y - ds.mouseDownY;

      if (selectedNote && selectedListTopNote && selectedNote.noteRef) {
        const dx =
          offsetX + selectedNote.rect.left - selectedListTopNote.rect.left;
        const dy =
          offsetY + selectedNote.rect.top - selectedListTopNote.rect.top;

        dsModified.transformStyles[ds.selectedListId] = [];
        dsModified.transformStyles[ds.selectedListId][ds.selectedRowIndex] = {
          position: "absolute",
          zIndex: 1,
          width: `${ds.selectedRect.width}px`,
          transform: `translateX(${dx}px) translateY(${dy}px) scale(1.02)`,
        };

        selectedNoteCenterX =
          offsetX + selectedNote.rect.left + selectedNote.rect.width / 2;
        selectedNoteCenterY =
          offsetY + selectedNote.rect.top + selectedNote.rect.height / 2;
      }

      // Calculate the belowed notes' transforming data when the selected note
      // is being dragged on to the list.
      let targetList = listRefs.current.find(
        (list) =>
          list.listRef &&
          isPosInRect(
            { x: selectedNoteCenterX, y: selectedNoteCenterY },
            list.listRef.getBoundingClientRect()
          )
      );

      if (targetList && selectedNote && selectedNote.noteRef) {
        dsModified.insertingListId = targetList.listId;

        let topHeightList: TopHeight[] = [];
        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId) {
            topHeightList.push({
              id: item.rowIndex,
              top: item.rect.top,
              height: item.rect.height + item.rect.gap,
            });
          }
        });

        if (targetList.listId === ds.selectedListId) {
          topHeightList = removeItemFromTopHeightList(
            ds.selectedRowIndex,
            topHeightList
          );
        }

        // Later we will use this stored list to be compared with the updated
        // list to calc the transforming data.
        const storedTopHeightList = topHeightList.map((item) => {
          return { ...item };
        });

        if (ds.insertingRowIndex !== undefined) {
          topHeightList = insertItemIntoTopHeightList(
            ds.insertingRowIndex,
            selectedNote.rect.height + selectedNote.rect.gap,
            0,
            false,
            topHeightList
          );
        }

        const insertingIndex = findInsertingIndexFromTopHeightList(
          selectedNote.rect.top + offsetY,
          selectedNote.rect.height,
          topHeightList
        );

        if (insertingIndex >= 0 && insertingIndex !== ds.insertingRowIndex) {
          dsModified.insertingRowIndex = insertingIndex;
          topHeightList = insertItemIntoTopHeightList(
            insertingIndex,
            selectedNote.rect.height + selectedNote.rect.gap,
            0,
            false,
            storedTopHeightList
          );
        }

        if (dsModified.transformStyles[targetList.listId] === undefined)
          dsModified.transformStyles[targetList.listId] = [];

        const delta = minusTwoTopHeightList(storedTopHeightList, topHeightList);
        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId && delta) {
            const dt = delta.find((i) => i.id === item.rowIndex);
            if (dt && dsModified.transformStyles) {
              dsModified.transformStyles[targetList.listId][item.rowIndex] = {
                transform: `translateY(${dt.delta}px)`,
              };
            }
          }
        });
      }

      return dsModified;
    });
  };

  useEffect(() => {
    if (inputStarted) {
      onNoteSelected();
    } else {
      onNoteReleased();
    }
  }, [inputStarted]);

  useEffect(() => {
    onNoteBeingDragged();
  }, [inputPos]);

  return (
    <div className="grid">
      {gridState.map((column, colIndex) => {
        let placeholderHeight = undefined;
        let transformStyles = undefined;

        if (draggingState && draggingState.transformStyles) {
          transformStyles = draggingState.transformStyles[colIndex];

          if (
            draggingState.insertingListId === colIndex ||
            draggingState.selectedListId === colIndex
          )
            placeholderHeight = draggingState.selectedRect.height;
        }

        const saveListRef = (listId: number, element: HTMLElement | null) => {
          if (listRefs.current && element) {
            listRefs.current[listId] = { listId: listId, listRef: element };
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
                rect: {
                  top: 0,
                  bottom: 0,
                  height: 0,
                  left: 0,
                  width: 0,
                  gap: 0,
                },
              });
              hotSpots.current.push(element);
            }
          }
        };

        return (
          <List
            onSaveListRef={saveListRef}
            onSaveNoteRef={saveNoteRef}
            key={colIndex}
            listId={colIndex}
            gridData={column}
            transformStyles={transformStyles}
            placeholderHeight={placeholderHeight}
          />
        );
      })}
    </div>
  );
};

export default Grid;
