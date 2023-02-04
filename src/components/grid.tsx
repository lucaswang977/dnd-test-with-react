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
// [x] Refactor again to remove unnecessary states or variables.
// [x] Avoid unnecessary DOM updates.
// [x] Fix the bug on the placeholder growth transition.
// [x] Make all the tranition duration time under one variable controlling.
// [ ] Refactor the transition state controlment, by carefully reading the log.
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

import { useRef } from "react";
import { useInputEvent } from "../hooks/input";
import { useStateRef } from "../utilities";
import { Container } from "./container";
import { PosType, ElementRectType } from "../types";

import {
  GridData,
  DraggingStateType,
  NoteRef,
  ContainerRef,
  TopHeight,
  NoteTransformStateType,
  ContainerTransformStateType,
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

const DEFAULT_TRANSITION_DURATION: number = 0.1;

const Grid = (props: { gridData: GridData }) => {
  // These two states will be accessed and modified from window event listeners
  // So we need to save them in the refs
  const [gridStateRef, setGridState] = useStateRef(props.gridData);
  const [draggingStateRef, setDraggingState] = useStateRef<
    DraggingStateType | undefined
  >(undefined);

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const cntRefs = useRef<ContainerRef[]>([]);

  // Save current rect of all the notes in the refs array
  const saveNoteRectToRefs = () => {
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

  // Save current rect of all the lists in the refs array
  const saveListRectToRefs = () => {
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
    const draggingState = draggingStateRef.current;
    console.log("Update Grid Data.", draggingState, gridStateRef.current);
    if (draggingState) {
      const newGridData = gridStateRef.current.map((item) => {
        return item.map((item) => {
          return { ...item };
        });
      });
      if (draggingState !== undefined) {
        const selectedNote =
          newGridData[draggingState.selectedContainerIndex][
            draggingState.selectedRowIndex
          ];

        // Remove the note from the selected list
        newGridData[draggingState.selectedContainerIndex] =
          removeElementByIndex(
            newGridData[draggingState.selectedContainerIndex],
            draggingState.selectedRowIndex
          );

        // Insert into the new list
        newGridData[draggingState.insertingContainerIndex] =
          insertElementIntoArray(
            newGridData[draggingState.insertingContainerIndex],
            draggingState.insertingRowIndex,
            selectedNote
          );

        setGridState(newGridData);
      }
    }
    noteRefs.current = [];
    cntRefs.current = [];
    setDraggingState(undefined);
  };

  const calcSelectedNoteDeltaPos = (
    noteRect: ElementRectType,
    inputPos: PosType,
    mouseDownPos: PosType
  ) => {
    // We need the top note's rect to calculate the transforming
    // data when the selected note's position is set to 'absolute'.
    const offsetX = inputPos.x - mouseDownPos.x;
    const offsetY = inputPos.y - mouseDownPos.y;

    let selectedNoteCenterX = inputPos.x;
    let selectedNoteCenterY = inputPos.y;

    selectedNoteCenterX = offsetX + noteRect.left + noteRect.width / 2;
    selectedNoteCenterY = offsetY + noteRect.top + noteRect.height / 2;
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
    origPos: PosType,
    curPos: PosType
  ): boolean => {
    if (Math.abs(origPos.x - curPos.x) + Math.abs(origPos.y - curPos.y) <= 10) {
      return true;
    }

    return false;
  };

  const calcTransitionDuration = (dx: number, dy: number) => {
    return (DEFAULT_TRANSITION_DURATION * Math.sqrt(dx * dx + dy * dy)) / 2000;
  };

  const handleSelectedNoteTransitionEnd = (ev: Event) => {
    if (ev.target) {
      ev.target.removeEventListener(
        "transitionend",
        handleSelectedNoteTransitionEnd
      );

      ev.target.removeEventListener(
        "transitioncancel",
        handleSelectedNoteTransitionEnd
      );

      updateGridData();
    }
  };

  // We handle mouse up/down events here
  const handleInputStateChanged = (started: boolean, inputPos: PosType) => {
    const draggingState = draggingStateRef.current;

    // When mouse is down, we save all the lists' and notes' rect into the refs
    // array, so we can use them when a note is being dragged.
    if (started) {
      if (draggingState === undefined) {
        let selectedItem = noteRefs.current.find((item) =>
          item.noteRef
            ? isPosInRect(inputPos, item.noteRef.getBoundingClientRect())
            : false
        );

        if (selectedItem === undefined) return;

        saveListRectToRefs();
        saveNoteRectToRefs();

        if (selectedItem.rect === undefined) return;

        setDraggingState({
          selectedContainerIndex: selectedItem.cntId,
          selectedRowIndex: selectedItem.rowIndex,
          selectedRect: selectedItem.rect,
          mouseDownPos: { x: inputPos.x, y: inputPos.y },
          insertingContainerIndex: selectedItem.cntId,
          insertingRowIndex: selectedItem.rowIndex,
          isOutsideOfAnyContainer: false,
          justStartDragging: true,
        });
        console.log(
          "Note selected:",
          inputPos,
          selectedItem.cntId,
          selectedItem.rowIndex,
          draggingState
        );
      }
    } else {
      // When mouse is up, current state is checked to see if we should update
      // the grid data in order to update the entire grid state.
      console.log("Note released:", inputPos, draggingState);

      // justStartDragging is true means we don't have a valid dragging action yet.
      if (draggingState === undefined || draggingState.justStartDragging) {
        setDraggingState(undefined);
        return;
      }

      const [, selectedNoteRef] = findSelectedNoteAndList(
        draggingState.selectedContainerIndex,
        draggingState.selectedRowIndex
      );

      let ds: DraggingStateType | undefined = undefined;

      // If we have selected note, there will be a transition animation be
      // executed when the note is released.
      if (selectedNoteRef !== undefined && selectedNoteRef.noteRef) {
        ds = { ...draggingState };

        // If mouse pos is outside any list, back to the selected position.
        if (ds.isOutsideOfAnyContainer) {
          ds.insertingContainerIndex = ds.selectedContainerIndex;
          ds.insertingRowIndex = ds.selectedRowIndex;
        }

        selectedNoteRef.noteRef.addEventListener(
          "transitionend",
          handleSelectedNoteTransitionEnd
        );
        selectedNoteRef.noteRef.addEventListener(
          "transitioncancel",
          handleSelectedNoteTransitionEnd
        );

        ds.noteTransformStates = ds.releasingNoteTransformStates;
        ds.releasingNoteTransformStates = undefined;

        let transitionDuration = DEFAULT_TRANSITION_DURATION;
        if (ds.noteTransformStates) {
          const selectedNoteTransformState = ds.noteTransformStates.find(
            (item) =>
              ds &&
              item.cntId === ds.selectedContainerIndex &&
              item.rowIndex === ds.selectedRowIndex
          );

          if (selectedNoteTransformState) {
            transitionDuration = selectedNoteTransformState.duration;
          }
        }
        ds.containerTransformStates = [];
        ds.containerTransformStates[ds.selectedContainerIndex] = {
          cntId: ds.selectedContainerIndex,
          state: "still",
          transition: true,
          duration: transitionDuration,
        };

        // Because the container is in 'inserting' state,
        // placeholder is stretched at this moment, so when releasing
        // we should keep the placeholder stretched until transition
        // animation end, until grid data is updated at the last frame.
        ds.containerTransformStates[ds.insertingContainerIndex] = {
          cntId: ds.insertingContainerIndex,
          state: "inserting",
          transition: true,
          duration: transitionDuration,
        };
      }

      setDraggingState(ds);
    }
  };

  // When note is being dragged, we will update:
  // * Container states array which tells the containers how to behave
  // * Transform array which tells how the notes are affected by dragging
  // * Releasing transform array which tells how the notes behave
  //   when note is released
  const handleInputMove = (inputPos: PosType) => {
    const draggingState = draggingStateRef.current;
    if (draggingState === undefined) return;

    if (
      isDraggingLengthNotEnough(draggingState.mouseDownPos, inputPos) &&
      draggingState.justStartDragging
    ) {
      return;
    }

    const dsModified = { ...draggingState };
    dsModified.containerTransformStates = [];
    dsModified.noteTransformStates = [];
    dsModified.releasingNoteTransformStates = [];

    const [selectedContainer, selectedNote] = findSelectedNoteAndList(
      draggingState.selectedContainerIndex,
      draggingState.selectedRowIndex
    );

    if (
      !selectedNote ||
      !selectedContainer ||
      !selectedNote.rect ||
      !selectedContainer.rect
    ) {
      return;
    }

    // Set the selected container's transform state
    dsModified.containerTransformStates[dsModified.selectedContainerIndex] = {
      cntId: dsModified.selectedContainerIndex,
      state: "selected",
      duration: DEFAULT_TRANSITION_DURATION,
      transition: dsModified.justStartDragging ? false : true,
    };

    // Set the selected note's transform state
    const selecteNoteDeltaPos = calcSelectedNoteDeltaPos(
      selectedNote.rect,
      inputPos,
      dsModified.mouseDownPos
    );

    dsModified.noteTransformStates.push({
      cntId: selectedNote.cntId,
      rowIndex: selectedNote.rowIndex,
      state: "dragging",
      transition: false,
      duration: 0,
      data: {
        dx: selecteNoteDeltaPos.dx,
        dy: selecteNoteDeltaPos.dy,
        w: draggingState.selectedRect.width,
      },
    });

    // Set the inserting container's state
    const insertingContainer = findInsertingList(
      selecteNoteDeltaPos.centerX,
      selecteNoteDeltaPos.centerY
    );

    // If selected note is inside a list
    if (insertingContainer && insertingContainer.rect) {
      dsModified.insertingContainerIndex = insertingContainer.cntId;
      dsModified.containerTransformStates[insertingContainer.cntId] = {
        cntId: insertingContainer.cntId,
        state: "inserting",
        duration: DEFAULT_TRANSITION_DURATION,
        transition: dsModified.justStartDragging ? false : true,
      };
      dsModified.isOutsideOfAnyContainer = false;

      // Create a top height list for generating transform array later
      // by comparing the states before and after inserting the selected
      // note.
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

      // If inserting and selected container is the same one,
      // we remove the selected note first because we will insert
      // it later.
      if (insertingContainer.cntId === selectedContainer.cntId) {
        topHeightList = removeItemFromTopHeightList(
          dsModified.selectedRowIndex,
          topHeightList
        );
      }

      // Caclulate the transform array(delta) and the new inserting index
      // by using the selected note's centerY(calculated inside the function).
      const [delta, insertingIndex, insertingNoteTop] =
        calcTopHeightDeltaByInsertingPos(
          topHeightList,
          dsModified.insertingRowIndex,
          selectedNote.rect.height,
          selectedNote.rect.gap,
          selectedNote.rect.top + inputPos.y - dsModified.mouseDownPos.y,
          insertingContainer.rect.top
        );

      dsModified.insertingRowIndex = insertingIndex;

      const dx = insertingContainer.rect.left - selectedContainer.rect.left;
      const dy = insertingNoteTop - selectedNote.rect.top;

      // Set the selected note's releasing transform data.
      dsModified.releasingNoteTransformStates.push({
        cntId: selectedNote.cntId,
        rowIndex: selectedNote.rowIndex,
        state: "dragging",
        transition: true,
        duration: calcTransitionDuration(inputPos.x - dx, inputPos.y - dy),
        data: {
          dx: dx,
          dy: dy,
          w: dsModified.selectedRect.width,
        },
      });

      // Set the affected note's transform and releasing transform data.
      noteRefs.current.forEach((item) => {
        if (item.cntId === insertingContainer.cntId && delta) {
          const dt = delta.find((i) => i.id === item.rowIndex);
          if (
            dt &&
            dsModified.noteTransformStates &&
            dsModified.releasingNoteTransformStates
          ) {
            dsModified.noteTransformStates.push({
              cntId: insertingContainer.cntId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: dsModified.justStartDragging ? false : true,
              duration: dsModified.justStartDragging
                ? 0
                : DEFAULT_TRANSITION_DURATION,
              data: { dx: 0, dy: dt.delta, w: 0 },
            });

            dsModified.releasingNoteTransformStates.push({
              cntId: insertingContainer.cntId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              duration: calcTransitionDuration(
                inputPos.x,
                inputPos.y - dt.delta
              ),
              data: { dx: 0, dy: dt.delta, w: 0 },
            });
          }
        }
      });
    } else {
      // When the selected note is outside of any list.
      dsModified.isOutsideOfAnyContainer = true;

      // Set the affected notes' transform data in the inserting container.
      // They don't need releasing transform data.
      if (
        dsModified.insertingContainerIndex !== dsModified.selectedContainerIndex
      ) {
        noteRefs.current.forEach((item) => {
          if (
            item.cntId === dsModified.insertingContainerIndex &&
            item.rowIndex >= dsModified.insertingRowIndex &&
            dsModified.noteTransformStates
          ) {
            dsModified.noteTransformStates.push({
              cntId: item.cntId,
              rowIndex: item.rowIndex,
              state: "still",
              transition: true,
              duration: DEFAULT_TRANSITION_DURATION,
              data: { dx: 0, dy: 0, w: 0 },
            });
          }
        });
      }

      // Set the affected notes' transform and releasing transform data in
      // the selected container.
      noteRefs.current.forEach((item) => {
        if (
          item.cntId === dsModified.selectedContainerIndex &&
          item.rowIndex > dsModified.selectedRowIndex &&
          dsModified.noteTransformStates &&
          dsModified.releasingNoteTransformStates &&
          selectedNote.rect
        ) {
          dsModified.noteTransformStates.push({
            cntId: item.cntId,
            rowIndex: item.rowIndex,
            state: "still",
            transition: true,
            duration: DEFAULT_TRANSITION_DURATION,
            data: { dx: 0, dy: 0, w: 0 },
          });
          const dy = selectedNote.rect.height + selectedNote.rect.gap;
          dsModified.releasingNoteTransformStates.push({
            cntId: item.cntId,
            rowIndex: item.rowIndex,
            state: "still",
            transition: true,
            duration: calcTransitionDuration(inputPos.x, inputPos.y - dy),
            data: {
              dx: 0,
              dy: dy,
              w: 0,
            },
          });
        }
      });

      // Set the selected note's releasing transform data.
      dsModified.releasingNoteTransformStates.push({
        cntId: selectedNote.cntId,
        rowIndex: selectedNote.rowIndex,
        state: "dragging",
        transition: true,
        duration: calcTransitionDuration(inputPos.x, inputPos.y),
        data: {
          dx: 0,
          dy: 0,
          w: dsModified.selectedRect.width,
        },
      });
    }
    dsModified.justStartDragging = false;

    setDraggingState(dsModified);
  };

  //////
  // Re-render starts here
  //////
  useInputEvent(handleInputStateChanged, handleInputMove);

  console.log(
    "Grid component re-render.",
    draggingStateRef.current,
    gridStateRef.current
  );

  return (
    <div className="grid">
      {gridStateRef.current.map((column, colIndex) => {
        const draggingState = draggingStateRef.current;
        let selectedNoteRect = undefined;
        let containerState: ContainerTransformStateType = {
          cntId: colIndex,
          state: "still",
          transition: false,
          duration: DEFAULT_TRANSITION_DURATION,
        };
        let noteTransformStates: NoteTransformStateType[] = [];

        if (draggingState) {
          const [, selectedNote] = findSelectedNoteAndList(
            draggingState.selectedContainerIndex,
            draggingState.selectedRowIndex
          );

          if (selectedNote) selectedNoteRect = selectedNote.rect;
        }

        if (draggingState && draggingState.containerTransformStates) {
          const containerStateItem =
            draggingState.containerTransformStates.find(
              (item) => item && item.cntId === colIndex
            );

          if (containerStateItem) containerState = containerStateItem;
        }

        if (draggingState && draggingState.noteTransformStates) {
          draggingState.noteTransformStates.forEach((item) => {
            if (item.cntId === colIndex) noteTransformStates.push(item);
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
            }
          }
        };

        return (
          <Container
            key={colIndex}
            cntId={colIndex}
            state={containerState}
            onSaveContainerRef={saveContainerRef}
            onSaveNoteRef={saveNoteRef}
            selectedNoteRect={selectedNoteRect}
            noteTransformStates={noteTransformStates}
            gridData={column}
          />
        );
      })}
    </div>
  );
};

export default Grid;
