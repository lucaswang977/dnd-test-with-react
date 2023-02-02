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
// [x] List component should not have its own state.
// [x] Drop here visibility problem.
// [x] Remove unnecessary useEffect.
// [ ] Make all the tranition duration time under one variable controlling.
// [ ] Refactor the transition state controlment, by carefully reading the log.
// [ ] Avoid unnecessary DOM updates.
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

import { useState, useRef } from "react";
import { useInputEvent } from "../hooks/input";
import Container from "./container";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ContainerRef,
  TopHeight,
  NoteStateType,
  ContainerStateType,
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
  const [draggingState, _setDraggingState] = useState<
    DraggingStateType | undefined
  >(undefined);
  const draggingStateRef = useRef<DraggingStateType | undefined>(draggingState);
  const setDraggingState = (ds: DraggingStateType | undefined) => {
    draggingStateRef.current = ds;
    _setDraggingState(ds);
  };

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const cntRefs = useRef<ContainerRef[]>([]);
  const hotSpots = useRef<HTMLElement[]>([]);

  const saveNoteRectToRefs = () => {
    // Save current rect of all the notes in the refs array
    noteRefs.current.forEach((item) => {
      if (item.noteRef && item.rect === undefined) {
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
            comparingItem.cntId === item.cntId &&
            comparingItem.rowIndex === item.rowIndex + 1
        );
        if (nextItem !== undefined && nextItem.noteRef)
          nextTop = nextItem.noteRef.getBoundingClientRect().top;
        else {
          const lr = cntRefs.current[item.cntId];
          if (lr && lr.rect && lr.cntRef) {
            nextTop = lr.rect.bottom;
          }
        }

        item.rect.gap = nextTop - item.rect.bottom;
      }
    });
  };

  const saveListRectToRefs = () => {
    // Save current rect of all the lists in the refs array
    cntRefs.current.forEach((item) => {
      if (item.cntRef && item.rect === undefined) {
        const rect = item.cntRef.getBoundingClientRect();
        const firstChild = item.cntRef.firstElementChild;
        const lastChild = item.cntRef.lastElementChild;
        if (firstChild !== null && lastChild !== null) {
          item.rect = {
            left: firstChild.getBoundingClientRect().left,
            bottom: lastChild.getBoundingClientRect().top,
            top: firstChild.getBoundingClientRect().top,
            height: rect.height,
            width: rect.width,
            gap: 0,
          };
        }
      }
    });
  };

  const updateGridData = () => {
    if (draggingStateRef.current) {
      console.log("setGridState()");
      const newGridData = gridState.map((item) => {
        return item.map((item) => {
          return { ...item };
        });
      });
      if (draggingStateRef.current !== undefined) {
        const selectedNote =
          newGridData[draggingStateRef.current.selectedContainerId][
            draggingStateRef.current.selectedRowIndex
          ];

        // Remove the note from the selected list
        newGridData[draggingStateRef.current.selectedContainerId] =
          removeElementByIndex(
            newGridData[draggingStateRef.current.selectedContainerId],
            draggingStateRef.current.selectedRowIndex
          );

        // Insert into the new list
        newGridData[draggingStateRef.current.insertingContainerId] =
          insertElementIntoArray(
            newGridData[draggingStateRef.current.insertingContainerId],
            draggingStateRef.current.insertingRowIndex,
            selectedNote
          );
        console.log("setDraggingState(undefined)", newGridData);

        setGridState(newGridData);
      }
    }
    noteRefs.current = [];
    cntRefs.current = [];
    setDraggingState(undefined);
  };

  const createTopHeightListFromInsertingList = (
    selectedContainer: ContainerRef,
    insertingContainer: ContainerRef,
    selectedRowIndex: number
  ) => {
    let topHeightList: TopHeight[] = [];
    noteRefs.current.forEach((item) => {
      if (
        insertingContainer &&
        item.cntId === insertingContainer.cntId &&
        item.rect
      ) {
        topHeightList.push({
          id: item.rowIndex,
          top: item.rect.top,
          height: item.rect.height + item.rect.gap,
        });
      }
    });

    if (insertingContainer.cntId === selectedContainer.cntId) {
      topHeightList = removeItemFromTopHeightList(
        selectedRowIndex,
        topHeightList
      );
    }

    return topHeightList;
  };

  const calcSelectedNoteDeltaPos = (
    selectedNote: NoteRef,
    inputPos: { x: number; y: number },
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
    const list = cntRefs.current.find(
      (list) =>
        list.cntRef &&
        isPosInRect({ x: x, y: y }, list.cntRef.getBoundingClientRect())
    );

    return list;
  };

  const findSelectedNoteAndList = (
    cntId: number,
    rowIndex: number
  ): [ContainerRef | undefined, NoteRef | undefined] => {
    const selectedNote = noteRefs.current.find(
      (item) => item.cntId === cntId && item.rowIndex === rowIndex
    );
    const selectedContainer = cntRefs.current.find(
      (item) => item.cntId === cntId
    );

    return [selectedContainer, selectedNote];
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

  const isDraggingLengthNotEnough = (
    origPos: { x: number; y: number },
    curPos: { x: number; y: number }
  ): boolean => {
    if (Math.abs(origPos.x - curPos.x) + Math.abs(origPos.y - curPos.y) <= 10) {
      return true;
    }

    return false;
  };

  // When mouse is up, current state is checked to see if we should update
  // the grid data in order to update the entire grid state.
  const onNoteReleased = (inputPos: { x: number; y: number }) => {
    if (
      draggingStateRef.current === undefined ||
      draggingStateRef.current.releasingState
    )
      return;

    console.log(
      "Note released:",
      inputPos,
      draggingStateRef.current.selectedContainerId,
      draggingStateRef.current.selectedRowIndex
    );

    // Nothing changes means mouse down and up without movement
    if (draggingStateRef.current.noteStates === undefined) {
      return;
    }

    const selectedNoteRef = noteRefs.current.find(
      (item) =>
        draggingStateRef.current &&
        item.cntId === draggingStateRef.current.selectedContainerId &&
        item.rowIndex === draggingStateRef.current.selectedRowIndex
    );

    const handleSelectedNoteTransitionEnd = () => {
      if (selectedNoteRef != undefined && selectedNoteRef.noteRef) {
        selectedNoteRef.noteRef.removeEventListener(
          "transitionend",
          handleSelectedNoteTransitionEnd
        );
      }
      updateGridData();
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
        draggingStateRef.current
      );

      const insertingContainer = findInsertingList(
        selecteNoteDeltaPos.centerX,
        selecteNoteDeltaPos.centerY
      );

      const ds: DraggingStateType = {
        ...draggingStateRef.current,
      };

      if (insertingContainer === undefined) {
        ds.insertingContainerId = ds.selectedContainerId;
        ds.insertingRowIndex = ds.selectedRowIndex;
      }

      if (
        draggingStateRef.current.releasingNoteStates &&
        draggingStateRef.current.releasingNoteStates.length > 0
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
      if (needRefreshImmediately) {
        updateGridData();
      }
    }
  };

  // When mouse is in dragging mode, we will update the visual state by
  // calculating all the temporary state.
  const onNoteBeingDragged = (inputPos: { x: number; y: number }) => {
    if (draggingStateRef.current === undefined) return;

    if (
      isDraggingLengthNotEnough(
        {
          x: draggingStateRef.current.mouseDownX,
          y: draggingStateRef.current.mouseDownY,
        },
        inputPos
      )
    ) {
      return;
    }

    if (cntRefs.current === undefined) return;

    const dsModified = { ...draggingStateRef.current };
    dsModified.containerStates = [];
    dsModified.noteStates = [];
    dsModified.releasingNoteStates = [];

    const [selectedContainer, selectedNote] = findSelectedNoteAndList(
      draggingStateRef.current.selectedContainerId,
      draggingStateRef.current.selectedRowIndex
    );

    if (
      !selectedNote ||
      !selectedContainer ||
      !selectedNote.rect ||
      !selectedContainer.rect
    )
      return;

    // Move the selected note
    const selecteNoteDeltaPos = calcSelectedNoteDeltaPos(
      selectedNote,
      inputPos,
      dsModified
    );

    dsModified.containerStates[dsModified.selectedContainerId] = {
      cntId: dsModified.selectedContainerId,
      state: "selected",
      transition: false,
    };

    dsModified.noteStates.push({
      cntId: selectedNote.cntId,
      rowIndex: selectedNote.rowIndex,
      state: "dragging",
      transition: false,
      data: {
        dx: selecteNoteDeltaPos.dx,
        dy: selecteNoteDeltaPos.dy,
        w: draggingStateRef.current.selectedRect.width,
      },
    });

    // Calculate the belowed notes' transforming data when the selected note
    // is being dragged on to the list.
    const insertingContainer = findInsertingList(
      selecteNoteDeltaPos.centerX,
      selecteNoteDeltaPos.centerY
    );

    // Selected note is inside a list
    if (insertingContainer && insertingContainer.rect) {
      dsModified.insertingContainerId = insertingContainer.cntId;
      dsModified.containerStates[insertingContainer.cntId] = {
        cntId: insertingContainer.cntId,
        state: "inserting",
        transition: false,
      };

      let topHeightList = createTopHeightListFromInsertingList(
        selectedContainer,
        insertingContainer,
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
          insertingContainer.rect.top
        );

      dsModified.insertingRowIndex = insertingIndex;

      if (insertingContainer.rect) {
        dsModified.releasingNoteStates.push({
          cntId: selectedNote.cntId,
          rowIndex: selectedNote.rowIndex,
          state: "dragging",
          transition: true,
          data: {
            dx: insertingContainer.rect.left - selectedContainer.rect.left,
            dy: insertingNoteTop - selectedNote.rect.top,
            w: dsModified.selectedRect.width,
          },
        });
      }
      noteRefs.current.forEach((item) => {
        if (item.cntId === insertingContainer.cntId && delta) {
          const dt = delta.find((i) => i.id === item.rowIndex);
          if (dt && dsModified.noteStates && dsModified.releasingNoteStates) {
            dsModified.noteStates.push({
              cntId: insertingContainer.cntId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: dsModified.justStartDragging ? false : true,
              data: { dx: 0, dy: dt.delta, w: 0 },
            });

            dsModified.releasingNoteStates.push({
              cntId: insertingContainer.cntId,
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
      if (dsModified.insertingContainerId !== dsModified.selectedContainerId) {
        noteRefs.current.forEach((item) => {
          if (
            item.cntId === dsModified.insertingContainerId &&
            item.rowIndex >= dsModified.insertingRowIndex &&
            dsModified.noteStates
          ) {
            dsModified.noteStates.push({
              cntId: item.cntId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              data: { dx: 0, dy: 0, w: 0 },
            });
          }
        });
      }

      noteRefs.current.forEach((item) => {
        if (
          item.cntId === dsModified.selectedContainerId &&
          item.rowIndex > dsModified.selectedRowIndex &&
          dsModified.noteStates &&
          dsModified.releasingNoteStates &&
          selectedNote.rect
        ) {
          dsModified.noteStates.push({
            cntId: item.cntId,
            rowIndex: item.rowIndex,
            state: "still",
            transition: true,
            data: { dx: 0, dy: 0, w: 0 },
          });
          dsModified.releasingNoteStates.push({
            cntId: item.cntId,
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
        cntId: selectedNote.cntId,
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

    setDraggingState(dsModified);
    console.log("Note dragged: ", draggingStateRef.current);
  };

  const handleInputStarted = (
    started: boolean,
    pos: { x: number; y: number }
  ) => {
    if (started) {
      if (draggingStateRef.current === undefined) {
        let selectedItem = noteRefs.current.find((item) =>
          item.noteRef
            ? isPosInRect(pos, item.noteRef.getBoundingClientRect())
            : false
        );

        if (selectedItem === undefined) return;

        saveListRectToRefs();
        saveNoteRectToRefs();

        if (selectedItem.rect === undefined) return;

        setDraggingState({
          selectedContainerId: selectedItem.cntId,
          selectedRowIndex: selectedItem.rowIndex,
          selectedRect: selectedItem.rect,
          mouseDownX: pos.x,
          mouseDownY: pos.y,
          insertingContainerId: selectedItem.cntId,
          insertingRowIndex: selectedItem.rowIndex,
          justStartDragging: true,
          releasingState: false,
        });
        console.log(
          "Note selected:",
          pos,
          selectedItem.cntId,
          selectedItem.rowIndex,
          draggingStateRef.current
        );
      }
    } else {
      onNoteReleased(pos);
    }
  };

  const handleInputMove = (pos: { x: number; y: number }) => {
    onNoteBeingDragged(pos);
  };

  //////
  // Render starts here
  //////
  useInputEvent(hotSpots.current, handleInputStarted, handleInputMove);

  console.log("Grid component re-render.", draggingStateRef.current, gridState);

  return (
    <div className="grid">
      {gridState.map((column, colIndex) => {
        let selectedNoteRect = undefined;
        let containerState: ContainerStateType = {
          cntId: colIndex,
          state: "still",
          transition: false,
        };
        let noteStates: NoteStateType[] = [];

        if (draggingStateRef.current) {
          const [, selectedNote] = findSelectedNoteAndList(
            draggingStateRef.current.selectedContainerId,
            draggingStateRef.current.selectedRowIndex
          );

          if (selectedNote) selectedNoteRect = selectedNote.rect;
        }

        if (
          draggingStateRef.current &&
          draggingStateRef.current.containerStates
        ) {
          const containerStateItem =
            draggingStateRef.current.containerStates.find(
              (item) => item && item.cntId === colIndex
            );

          if (containerStateItem) containerState = containerStateItem;
        }

        if (draggingStateRef.current && draggingStateRef.current.noteStates) {
          draggingStateRef.current.noteStates.forEach((item) => {
            if (item.cntId === colIndex) noteStates.push(item);
          });
        }

        const saveContainerRef = (
          cntId: number,
          element: HTMLElement | null
        ) => {
          if (cntRefs.current && element) {
            cntRefs.current[cntId] = {
              ...cntRefs.current[cntId],
              cntId: cntId,
              cntRef: element,
            };
          }
        };

        const saveNoteRef = (
          cntId: number,
          rowIndex: number,
          element: HTMLElement | null
        ) => {
          if (noteRefs.current && element) {
            const noteRef = noteRefs.current.find(
              (item) => item.cntId === cntId && item.rowIndex == rowIndex
            );

            if (noteRef) {
              noteRef.noteRef = element;
            } else {
              noteRefs.current.push({
                rowIndex: rowIndex,
                cntId: cntId,
                noteRef: element,
              });
              hotSpots.current.push(element);
            }
          }
        };

        return (
          <Container
            onSaveContainerRef={saveContainerRef}
            onSaveNoteRef={saveNoteRef}
            selectedNoteRect={selectedNoteRect}
            key={colIndex}
            cntId={colIndex}
            state={containerState}
            noteStates={noteStates}
            gridData={column}
          />
        );
      })}
    </div>
  );
};

export default Grid;
