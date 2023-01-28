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

import { useEffect, useState, useRef } from "react";
import { useInputEvent } from "../hooks/input";
import Container from "./container";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ContainerRef,
  TopHeight,
  InputPosType,
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
  const [refreshState, setRefreshState] = useState(false);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const cntRefs = useRef<ContainerRef[]>([]);
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
            comparingItem.cntId === item.cntId &&
            comparingItem.rowIndex === item.rowIndex + 1
        );
        if (nextItem !== undefined && nextItem.noteRef)
          nextTop = nextItem.noteRef.getBoundingClientRect().top;
        else {
          const lr = cntRefs.current[item.cntId];
          if (lr && lr.rect && lr.cntRef) {
            // let style = window.getComputedStyle(lr.cntRef);
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
    cntRefs.current.forEach((item) => {
      if (item.cntRef) {
        const rect = item.cntRef.getBoundingClientRect();
        item.rect = {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          height: rect.height,
          width: rect.width,
          gap: 0,
        };
        const child = item.cntRef.firstElementChild;
        if (child !== null) {
          item.firstChildTopLeft = {
            left: child.getBoundingClientRect().left,
            top: child.getBoundingClientRect().top,
          };
        }

        const lastChild = item.cntRef.lastElementChild;
        if (lastChild !== null) {
          item.rect.bottom = lastChild.getBoundingClientRect().top;
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
          newGridData[draggingState.selectedContainerId][
            draggingState.selectedRowIndex
          ];

        // Remove the note from the selected list
        newGridData[draggingState.selectedContainerId] = removeElementByIndex(
          newGridData[draggingState.selectedContainerId],
          draggingState.selectedRowIndex
        );

        // Insert into the new list
        newGridData[draggingState.insertingContainerId] =
          insertElementIntoArray(
            newGridData[draggingState.insertingContainerId],
            draggingState.insertingRowIndex,
            selectedNote
          );

        return newGridData;
      });

      noteRefs.current = [];
      cntRefs.current = [];
      setDraggingState(undefined);
    }
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
      selectedItem.cntId,
      selectedItem.rowIndex
    );

    saveListRectToRefs();
    saveNoteRectToRefs();

    if (selectedItem.rect === undefined) return;

    const ds: DraggingStateType = {
      selectedContainerId: selectedItem.cntId,
      selectedRowIndex: selectedItem.rowIndex,
      selectedRect: selectedItem.rect,
      mouseDownX: inputPos.x,
      mouseDownY: inputPos.y,
      insertingContainerId: selectedItem.cntId,
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
      draggingState.selectedContainerId,
      draggingState.selectedRowIndex
    );

    const selectedNoteRef = noteRefs.current.find(
      (item) =>
        item.cntId === draggingState.selectedContainerId &&
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

      const insertingContainer = findInsertingList(
        selecteNoteDeltaPos.centerX,
        selecteNoteDeltaPos.centerY
      );

      const ds: DraggingStateType = {
        ...draggingState,
      };

      if (insertingContainer === undefined) {
        ds.insertingContainerId = ds.selectedContainerId;
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
      isDraggingLengthNotEnough(
        { x: draggingState.mouseDownX, y: draggingState.mouseDownY },
        inputPos
      )
    )
      return;

    setDraggingState((ds) => {
      if (ds === undefined || !cntRefs.current) return ds;

      const dsModified = { ...ds };
      dsModified.containerStates = [];
      dsModified.noteStates = [];
      dsModified.releasingNoteStates = [];

      const [selectedContainer, selectedNote] = findSelectedNoteAndList(
        ds.selectedContainerId,
        ds.selectedRowIndex
      );

      if (
        !selectedNote ||
        !selectedContainer ||
        !selectedNote.rect ||
        !selectedContainer.rect
      )
        return ds;

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
          w: ds.selectedRect.width,
        },
      });

      // Calculate the belowed notes' transforming data when the selected note
      // is being dragged on to the list.
      const insertingContainer = findInsertingList(
        selecteNoteDeltaPos.centerX,
        selecteNoteDeltaPos.centerY
      );

      // Selected note is inside a list
      if (insertingContainer) {
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
            selectedContainer.firstChildTopLeft
              ? selectedContainer.firstChildTopLeft.top
              : 0
          );

        dsModified.insertingRowIndex = insertingIndex;

        if (insertingContainer.rect && insertingContainer.firstChildTopLeft) {
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
                // transition: dsModified.justStartDragging ? false : true,
                transition: true,
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
        if (
          dsModified.insertingContainerId !== dsModified.selectedContainerId
        ) {
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
        let selectedNoteRect = undefined;
        let containerState: ContainerStateType | undefined = undefined;
        let noteStates: NoteStateType[] = [];

        if (draggingState) {
          const [, selectedNote] = findSelectedNoteAndList(
            draggingState.selectedContainerId,
            draggingState.selectedRowIndex
          );

          if (selectedNote) selectedNoteRect = selectedNote.rect;
        }

        if (draggingState && draggingState.containerStates) {
          const containerStateItem = draggingState.containerStates.find(
            (item) => item && item.cntId === colIndex
          );

          if (containerStateItem) containerState = containerStateItem;
        }

        if (draggingState && draggingState.noteStates) {
          draggingState.noteStates.forEach((item) => {
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
