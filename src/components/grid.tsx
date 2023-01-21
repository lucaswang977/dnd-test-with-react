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
// [p] Add animating effect.
// [ ] Extract the business logic to support other app integration.
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
//
// Update: (Refactoring thoughts)
// * App -> Container(squential) -> Note/Placeholder
// * Container's states: still, selected, inserting
// * Note's states: still, dragging(transform), pushing(transform), returning

// TODO: The growth animation on the list does not take effect, because when we insert the
// placeholder element, its height is already the target height, we need a starting point.
// TODO: We should add a transition animation when the mouse is released and the dragging
// note goes back to its original place.

import { useEffect, useState, useRef } from "react";
import { useInputEvent } from "../hooks/input";
import List from "./list";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ListRef,
  TopHeight,
  NoteStateType,
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

    if (selectedItem.rect === undefined) return;

    const ds: DraggingStateType = {
      selectedListId: selectedItem.listId,
      selectedRowIndex: selectedItem.rowIndex,
      selectedRect: selectedItem.rect,
      mouseDownX: inputPos.x,
      mouseDownY: inputPos.y,
      insertingListId: selectedItem.listId,
      insertingRowIndex: selectedItem.rowIndex,
      justStartDragging: true,
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
    // TODO: Transition event listener on selected note
    // Selected note translate back to mouse down position 
    // Belowed notes will be pushed out.
    // Refresh the grid.
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
      dsModified.noteStates = [];

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

      if (
        selectedNote &&
        selectedListTopNote &&
        selectedListTopNote.rect &&
        selectedNote.noteRef &&
        selectedNote.rect
      ) {
        const dx =
          offsetX + selectedNote.rect.left - selectedListTopNote.rect.left;
        const dy =
          offsetY + selectedNote.rect.top - selectedListTopNote.rect.top;

        selectedNoteCenterX =
          offsetX + selectedNote.rect.left + selectedNote.rect.width / 2;
        selectedNoteCenterY =
          offsetY + selectedNote.rect.top + selectedNote.rect.height / 2;

        dsModified.noteStates.push({
          listId: selectedNote.listId,
          rowIndex: selectedNote.rowIndex,
          state: "dragging",
          transition: false,
          data: { dx: dx, dy: dy, w: ds.selectedRect.width },
        });
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

      if (
        targetList &&
        selectedNote &&
        selectedNote.noteRef &&
        selectedNote.rect
      ) {
        dsModified.insertingListId = targetList.listId;
        dsModified.listStates = [];
        dsModified.listStates.push({
          listId: targetList.listId,
          state: "inserting",
        });

        let topHeightList: TopHeight[] = [];
        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId && item.rect) {
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

        topHeightList = insertItemIntoTopHeightList(
          dsModified.insertingRowIndex,
          selectedNote.rect.height + selectedNote.rect.gap,
          0,
          false,
          topHeightList
        );

        const insertingIndex = findInsertingIndexFromTopHeightList(
          selectedNote.rect.top + offsetY,
          selectedNote.rect.height,
          topHeightList
        );

        if (
          insertingIndex >= 0 &&
          insertingIndex !== dsModified.insertingRowIndex
        ) {
          dsModified.insertingRowIndex = insertingIndex;
          topHeightList = insertItemIntoTopHeightList(
            insertingIndex,
            selectedNote.rect.height + selectedNote.rect.gap,
            0,
            false,
            storedTopHeightList
          );
        }

        const delta = minusTwoTopHeightList(storedTopHeightList, topHeightList);
        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId && delta) {
            const dt = delta.find((i) => i.id === item.rowIndex);
            if (dt) {
              if (dsModified.noteStates) {
                dsModified.noteStates.push({
                  listId: targetList.listId,
                  rowIndex: item.rowIndex,
                  state: "still",
                  transition: dsModified.justStartDragging ? false : true,
                  data: { dx: 0, dy: dt.delta, w: 0 },
                });
              }
            }
          }
        });
      } else {
        // When the selected note is outside of any list.
        let noteStates: NoteStateType[] = [];
        noteRefs.current.forEach((item) => {
          if (
            item.listId === dsModified.insertingListId &&
            item.rowIndex > dsModified.insertingRowIndex
          ) {
            noteStates.push({
              listId: item.listId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              data: { dx: 0, dy: 0, w: 0 },
            });
          }
        });

        const selectedNoteState = dsModified.noteStates.find(
          (item) =>
            item.listId === dsModified.selectedListId &&
            item.rowIndex === dsModified.selectedRowIndex
        );

        if (selectedNoteState) noteStates.push(selectedNoteState);

        dsModified.insertingListId = dsModified.selectedListId;
        dsModified.insertingRowIndex = dsModified.selectedRowIndex;
        dsModified.listStates = [];
        dsModified.noteStates = noteStates;
      }
      dsModified.justStartDragging = false;

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
        let listState: "still" | "inserting" = "still";
        let noteStates: NoteStateType[] = [];

        if (
          draggingState &&
          (draggingState.insertingListId === colIndex ||
            draggingState.selectedListId === colIndex)
        )
          placeholderHeight = draggingState.selectedRect.height;

        if (draggingState && draggingState.listStates) {
          const listStateItem = draggingState.listStates.find(
            (item) => item.listId === colIndex
          );

          if (listStateItem) listState = listStateItem.state;
        }

        if (draggingState && draggingState.noteStates) {
          draggingState.noteStates.forEach((item) => {
            if (item.listId === colIndex) noteStates.push(item);
          });
        }

        const saveListRef = (listId: number, element: HTMLElement | null) => {
          if (listRefs.current && element) {
            listRefs.current[listId] = {
              listId: listId,
              listRef: element,
            };
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
            state={listState}
            noteStates={noteStates}
            gridData={column}
            placeholderHeight={placeholderHeight}
          />
        );
      })}
    </div>
  );
};

export default Grid;
