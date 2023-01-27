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
// [x] Add animating effect.
// [x] DOM should not be updated when we click(mouse down and up) on a note.
// [x] Placeholder state problem & growth animation.
// [x] Dragging should be forbidden when transition is executing.
// [ ] List component should not have its own state.
// [ ] Drop here visibility problem.
// [ ] Avoid unnecessary DOM updates.
// [ ] Cypress auto testing.
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

import { useEffect, useState, useRef } from "react";
import { useInputEvent } from "../hooks/input";
import List from "./list";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ListRef,
  TopHeight,
  InputPosType,
  NoteStateType,
  ListStateEnumType,
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
  const [refreshState, setRefreshState] = useState(false);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const listRefs = useRef<ListRef[]>([]);
  const hotSpots = useRef<HTMLElement[]>([]);

  const [inputPos, inputStarted] = useInputEvent(hotSpots.current);

  const saveNoteRectToRefs = () => {
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
          if (lr && lr.rect && lr.listRef) {
            // let style = window.getComputedStyle(lr.listRef);
            // let padding = style.getPropertyValue("padding-bottom");
            // console.log("padding", padding);
            // nextTop = lr.rect.bottom - Number(padding);
            nextTop = lr.rect.bottom;
          }
        }

        item.rect.gap = nextTop - item.rect.bottom;
      }
    });
  };

  const saveListRectToRefs = () => {
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
        const child = item.listRef.firstElementChild;
        if (child !== null) {
          item.firstChildTopLeft = {
            left: child.getBoundingClientRect().left,
            top: child.getBoundingClientRect().top,
          };
        }
      }
    });
  };

  const updateGridData = () => {
    if (draggingState) {
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
    }
  };

  const createTopHeightListFromInsertingList = (
    selectedList: ListRef,
    insertingList: ListRef,
    selectedRowIndex: number
  ) => {
    let topHeightList: TopHeight[] = [];
    noteRefs.current.forEach((item) => {
      if (insertingList && item.listId === insertingList.listId && item.rect) {
        topHeightList.push({
          id: item.rowIndex,
          top: item.rect.top,
          height: item.rect.height + item.rect.gap,
        });
      }
    });

    if (insertingList.listId === selectedList.listId) {
      topHeightList = removeItemFromTopHeightList(
        selectedRowIndex,
        topHeightList
      );
    }

    return topHeightList;
  };

  const calcSelectedNoteDeltaPos = (
    selectedNote: NoteRef,
    inputPos: InputPosType,
    ds: DraggingStateType
  ) => {
    // We need the top note's rect to calculate the transforming
    // data when the selected note's position is set to 'absolute'.
    const offsetX = inputPos.x - ds.mouseDownX;
    const offsetY = inputPos.y - ds.mouseDownY;

    let selectedNoteCenterX = inputPos.x;
    let selectedNoteCenterY = inputPos.y;

    if (selectedNote.noteRef && selectedNote.rect) {
      selectedNoteCenterX =
        offsetX + selectedNote.rect.left + selectedNote.rect.width / 2;
      selectedNoteCenterY =
        offsetY + selectedNote.rect.top + selectedNote.rect.height / 2;
    }
    return {
      dx: offsetX,
      dy: offsetY,
      centerX: selectedNoteCenterX,
      centerY: selectedNoteCenterY,
    };
  };

  const findInsertingList = (x: number, y: number) => {
    const list = listRefs.current.find(
      (list) =>
        list.listRef &&
        isPosInRect({ x: x, y: y }, list.listRef.getBoundingClientRect())
    );

    return list;
  };

  const findSelectedNoteAndList = (
    listId: number,
    rowIndex: number
  ): [ListRef | undefined, NoteRef | undefined] => {
    const selectedNote = noteRefs.current.find(
      (item) => item.listId === listId && item.rowIndex === rowIndex
    );
    const selectedList = listRefs.current.find(
      (item) => item.listId === listId
    );

    return [selectedList, selectedNote];
  };

  const calcTopHeightDeltaByInsertingPos = (
    topHeightList: TopHeight[],
    insertingRowIndex: number,
    selectedNoteHeight: number,
    selectedNoteGap: number,
    selectedNoteTop: number,
    firstItemTop: number
  ): [{ id: number; delta: number }[] | undefined, number, number] => {
    let topHeightListChanged = insertItemIntoTopHeightList(
      insertingRowIndex,
      selectedNoteHeight + selectedNoteGap,
      0,
      false,
      topHeightList,
      firstItemTop
    );

    const insertingIndex = findInsertingIndexFromTopHeightList(
      selectedNoteTop,
      topHeightList
    );

    if (insertingIndex >= 0 && insertingIndex !== insertingRowIndex) {
      topHeightListChanged = insertItemIntoTopHeightList(
        insertingIndex,
        selectedNoteHeight + selectedNoteGap,
        0,
        false,
        topHeightList,
        firstItemTop
      );
    }

    const topHeightListForCalcTop = insertItemIntoTopHeightList(
      insertingIndex,
      selectedNoteHeight + selectedNoteGap,
      0,
      true,
      topHeightList,
      firstItemTop
    );

    const top = topHeightListForCalcTop[insertingIndex].top;

    return [
      minusTwoTopHeightList(topHeightList, topHeightListChanged),
      insertingIndex,
      top,
    ];
  };

  // We will save current visuall state of every note when mousedown is triggered
  const onNoteSelected = () => {
    if (draggingState) return;

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

    saveListRectToRefs();
    saveNoteRectToRefs();

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
      releasingState: false,
    };

    setDraggingState(ds);
  };

  // When mouse is up, current state is checked to see if we should update
  // the grid data in order to update the entire grid state.
  const onNoteReleased = () => {
    if (draggingState === undefined || draggingState.releasingState) return;

    console.log(
      "Note released:",
      inputPos,
      draggingState.selectedListId,
      draggingState.selectedRowIndex
    );

    const selectedNoteRef = noteRefs.current.find(
      (item) =>
        item.listId === draggingState.selectedListId &&
        item.rowIndex === draggingState.selectedRowIndex
    );

    const handleSelectedNoteTransitionEnd = () => {
      setRefreshState(true);
      if (selectedNoteRef != undefined && selectedNoteRef.noteRef) {
        selectedNoteRef.noteRef.removeEventListener(
          "transitionend",
          handleSelectedNoteTransitionEnd
        );
      }
    };

    if (
      selectedNoteRef !== undefined &&
      selectedNoteRef.noteRef &&
      selectedNoteRef.rect
    ) {
      let needRefreshImmediately = true;

      // If mouse pos is outside any list, back to the selected position.
      const selecteNoteDeltaPos = calcSelectedNoteDeltaPos(
        selectedNoteRef,
        inputPos,
        draggingState
      );

      const insertingList = findInsertingList(
        selecteNoteDeltaPos.centerX,
        selecteNoteDeltaPos.centerY
      );

      const ds: DraggingStateType = {
        ...draggingState,
      };

      if (insertingList === undefined) {
        ds.insertingListId = ds.selectedListId;
        ds.insertingRowIndex = ds.selectedRowIndex;
      }

      if (
        draggingState.releasingNoteStates &&
        draggingState.releasingNoteStates.length > 0
      ) {
        selectedNoteRef.noteRef.addEventListener(
          "transitionend",
          handleSelectedNoteTransitionEnd
        );

        ds.noteStates = ds.releasingNoteStates;
        ds.releasingNoteStates = undefined;
        ds.releasingState = true;
        needRefreshImmediately = false;
      }
      setDraggingState(ds);
      if (needRefreshImmediately) setRefreshState(true);
    }
  };

  // When mouse is in dragging mode, we will update the visual state by
  // calculating all the temporary state.
  const onNoteBeingDragged = () => {
    if (!draggingState || draggingState.releasingState) return;

    // Simulate a little gravity
    if (
      Math.abs(draggingState.mouseDownX - inputPos.x) +
        Math.abs(draggingState.mouseDownY - inputPos.y) <=
      10
    ) {
      return;
    }

    setDraggingState((ds) => {
      if (ds === undefined || !listRefs.current) return ds;

      const dsModified = { ...ds };
      dsModified.listStates = [];
      dsModified.noteStates = [];
      dsModified.releasingNoteStates = [];

      const [selectedList, selectedNote] = findSelectedNoteAndList(
        ds.selectedListId,
        ds.selectedRowIndex
      );

      if (
        !selectedNote ||
        !selectedList ||
        !selectedNote.rect ||
        !selectedList.rect
      )
        return ds;

      // Move the selected note
      const selecteNoteDeltaPos = calcSelectedNoteDeltaPos(
        selectedNote,
        inputPos,
        dsModified
      );

      dsModified.noteStates.push({
        listId: selectedNote.listId,
        rowIndex: selectedNote.rowIndex,
        state: "dragging",
        transition: false,
        data: {
          dx: selecteNoteDeltaPos.dx,
          dy: selecteNoteDeltaPos.dy,
          w: ds.selectedRect.width,
        },
      });

      // Calculate the belowed notes' transforming data when the selected note
      // is being dragged on to the list.
      const insertingList = findInsertingList(
        selecteNoteDeltaPos.centerX,
        selecteNoteDeltaPos.centerY
      );

      // Selected note is inside a list
      if (insertingList) {
        dsModified.insertingListId = insertingList.listId;
        dsModified.listStates.push({
          listId: insertingList.listId,
          state: "inserting",
        });

        let topHeightList = createTopHeightListFromInsertingList(
          selectedList,
          insertingList,
          dsModified.selectedRowIndex
        );

        // Later we will use this stored list to be compared with the updated
        // list to calc the transforming data.
        const [delta, insertingIndex, insertingNoteTop] =
          calcTopHeightDeltaByInsertingPos(
            topHeightList,
            dsModified.insertingRowIndex,
            selectedNote.rect.height,
            selectedNote.rect.gap,
            selectedNote.rect.top + inputPos.y - dsModified.mouseDownY,
            selectedList.firstChildTopLeft
              ? selectedList.firstChildTopLeft.top
              : 0
          );

        dsModified.insertingRowIndex = insertingIndex;

        if (insertingList.rect && insertingList.firstChildTopLeft) {
          dsModified.releasingNoteStates.push({
            listId: selectedNote.listId,
            rowIndex: selectedNote.rowIndex,
            state: "dragging",
            transition: true,
            data: {
              dx: insertingList.rect.left - selectedList.rect.left,
              dy: insertingNoteTop - selectedNote.rect.top,
              w: dsModified.selectedRect.width,
            },
          });
        }
        noteRefs.current.forEach((item) => {
          if (item.listId === insertingList.listId && delta) {
            const dt = delta.find((i) => i.id === item.rowIndex);
            if (dt && dsModified.noteStates && dsModified.releasingNoteStates) {
              dsModified.noteStates.push({
                listId: insertingList.listId,
                rowIndex: item.rowIndex,
                state: "still",
                transition: dsModified.justStartDragging ? false : true,
                data: { dx: 0, dy: dt.delta, w: 0 },
              });

              dsModified.releasingNoteStates.push({
                listId: insertingList.listId,
                rowIndex: item.rowIndex,
                state: "still",
                transition: true,
                data: { dx: 0, dy: dt.delta, w: 0 },
              });
            }
          }
        });
      } else {
        // When the selected note is outside of any list.
        if (dsModified.insertingListId !== dsModified.selectedListId) {
          noteRefs.current.forEach((item) => {
            if (
              item.listId === dsModified.insertingListId &&
              item.rowIndex >= dsModified.insertingRowIndex &&
              dsModified.noteStates
            ) {
              dsModified.noteStates.push({
                listId: item.listId,
                rowIndex: item.rowIndex,
                state: "still",
                transition: true,
                data: { dx: 0, dy: 0, w: 0 },
              });
            }
          });
        }

        dsModified.listStates = [
          { listId: dsModified.selectedListId, state: "selected" },
        ];
        noteRefs.current.forEach((item) => {
          if (
            item.listId === dsModified.selectedListId &&
            item.rowIndex > dsModified.selectedRowIndex &&
            dsModified.noteStates &&
            dsModified.releasingNoteStates &&
            selectedNote.rect
          ) {
            dsModified.noteStates.push({
              listId: item.listId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              data: { dx: 0, dy: 0, w: 0 },
            });
            dsModified.releasingNoteStates.push({
              listId: item.listId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              data: {
                dx: 0,
                dy: selectedNote.rect.height + selectedNote.rect.gap,
                w: 0,
              },
            });
          }
        });
        dsModified.releasingNoteStates.push({
          listId: selectedNote.listId,
          rowIndex: selectedNote.rowIndex,
          state: "dragging",
          transition: true,
          data: {
            dx: 0,
            dy: 0,
            w: dsModified.selectedRect.width,
          },
        });
      }
      dsModified.justStartDragging = false;

      return dsModified;
    });
  };

  useEffect(() => {
    if (refreshState) {
      updateGridData();
      setRefreshState(false);
    }
  }, [refreshState]);

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
        let showPlaceholder = false;
        let listTransition = true;
        let selectedNoteRect = undefined;
        let listState: ListStateEnumType = "still";
        let noteStates: NoteStateType[] = [];

        if (draggingState) {
          const [, selectedNote] = findSelectedNoteAndList(
            draggingState.selectedListId,
            draggingState.selectedRowIndex
          );

          if (selectedNote) selectedNoteRect = selectedNote.rect;

          if (draggingState.justStartDragging) listTransition = false;
        }
        if (
          column.length === 0 &&
          !(draggingState && draggingState.insertingListId === colIndex)
        ) {
          showPlaceholder = true;
        }

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
              ...listRefs.current[listId],
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
            selectedNoteRect={selectedNoteRect}
            listTransition={listTransition}
            key={colIndex}
            listId={colIndex}
            state={listState}
            noteStates={noteStates}
            gridData={column}
            showPlaceholder={showPlaceholder}
          />
        );
      })}
    </div>
  );
};

export default Grid;
