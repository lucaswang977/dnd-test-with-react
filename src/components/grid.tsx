// [x] We need the note to be fixed width and variable height.
// [x] We will store the refs of all the notes and update as they change.
// [x] A note can be dragged in front of any note in other lists.
// [x] Make the height of every list is different.
// [x] Separate List from Grid, update them individually.
// [x] Unit testing on most of the code.
// [x] Abstract the core data structure to separated file and be unit tested.
// [x] Separate grid data refresh state from mouse state.
// [ ] Mouse down event should be captured outside the list component.
// [ ] Use more custom hooks to reduce the single file size.
// [ ] Support touch gesture.
// [ ] Test framework moves to Vitest.
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
import List from "./list";

import {
  GridData,
  MousePosType,
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
} from "../utilities";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const listRefs = useRef<ListRef[]>([]);

  const [mousePos, setMousePos] = useState<MousePosType>();
  const [mousePressed, setMousePressed] = useState<boolean>(false);

  useEffect(() => {
    // Check if we need to refresh the grid data
    if (
      mousePos &&
      mousePressed === false &&
      draggingState &&
      draggingState.insertingListId !== undefined &&
      draggingState.insertingRowIndex !== undefined &&
      draggingState.selectedListId !== undefined &&
      draggingState.selectedRowIndex !== undefined
    ) {
      setGridState((gs) => {
        const newGridState = gs.map((item) => {
          return item.map((inside) => {
            return { ...inside };
          });
        });
        const note =
          newGridState[draggingState.selectedListId][
            draggingState.selectedRowIndex
          ];

        if (
          draggingState &&
          draggingState.insertingListId !== undefined &&
          draggingState.insertingRowIndex !== undefined
        ) {
          // Remove the note from the selected list
          const selectedList = [
            ...newGridState[draggingState.selectedListId].slice(
              0,
              draggingState.selectedRowIndex
            ),
            ...newGridState[draggingState.selectedListId].slice(
              draggingState.selectedRowIndex + 1
            ),
          ];
          console.log("SelectedList:", selectedList, draggingState);

          let insertingList = selectedList;
          if (draggingState.selectedListId !== draggingState.insertingListId) {
            insertingList = gs[draggingState.insertingListId];
          }

          // Insert into the new list
          const insertedList = [
            ...insertingList.slice(0, draggingState.insertingRowIndex),
            note,
            ...insertingList.slice(draggingState.insertingRowIndex),
          ];
          console.log("InsertedList:", insertedList, draggingState);

          newGridState[draggingState.selectedListId] = selectedList;
          newGridState[draggingState.insertingListId] = insertedList;
        }
        console.log("GridState:", newGridState, draggingState);

        return newGridState;
      });
      noteRefs.current = [];
      listRefs.current = [];
      setDraggingState(undefined);
      return;
    }
  }, [mousePressed]);

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

      let selectedNoteTop = 0;
      let selectedNoteHeight = 0;

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

        if (selectedNote.noteRef) {
          selectedNoteTop = selectedNote.noteRef.getBoundingClientRect().y;
          selectedNoteHeight = selectedNote.heightWithGap;
        }
      }

      // Find which list the dragging note is currently on.
      let targetList = listRefs.current.find(
        (list) =>
          list.listRef &&
          isPosInRect(
            { x: mousePos.x, y: mousePos.y },
            list.listRef.getBoundingClientRect()
          )
      );

      // Calculate the transform data of the list which is being inserted.
      if (targetList) {
        if (targetList.listId !== ds.insertingListId) {
          dsModified.insertingListId = targetList.listId;
        }

        let topHeightList: TopHeight[] = [];

        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId) {
            topHeightList.push({
              id: item.rowIndex,
              top: item.top,
              height: item.heightWithGap,
            });
          }
        });
        console.log("1:", topHeightList);

        if (targetList.listId === ds.selectedListId) {
          topHeightList = removeItemFromTopHeightList(
            ds.selectedRowIndex,
            topHeightList
          );
        }
        console.log("2:", topHeightList);

        const storedTopHeightList = topHeightList.map((item) => {
          return { ...item };
        });

        if (ds.insertingRowIndex !== undefined) {
          topHeightList = insertItemIntoTopHeightList(
            ds.insertingRowIndex,
            selectedNoteHeight,
            0,
            false,
            topHeightList
          );
        }
        console.log("3:", topHeightList);

        const insertingIndex = findInsertingIndexFromTopHeightList(
          selectedNoteTop,
          selectedNoteHeight,
          topHeightList
        );

        if (insertingIndex >= 0 && insertingIndex !== ds.insertingRowIndex) {
          dsModified.insertingRowIndex = insertingIndex;
          topHeightList = insertItemIntoTopHeightList(
            insertingIndex,
            selectedNoteHeight,
            0,
            false,
            storedTopHeightList
          );
        }
        console.log("4:", topHeightList, insertingIndex);

        const delta = minusTwoTopHeightList(storedTopHeightList, topHeightList);
        const transformData: number[] = [];
        noteRefs.current.forEach((item) => {
          if (targetList && item.listId === targetList.listId && delta) {
            const dt = delta.find((i) => i.id === item.rowIndex);
            transformData[item.rowIndex] = 0;
            if (dt) {
              transformData[item.rowIndex] = dt.delta;
            }
          }
        });
        console.log("5: transformData:", transformData);

        dsModified.insertingListYAxisTransform = transformData;
      }

      return dsModified;
    });
  }, [mousePos]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log("MouseUp", ev.clientX, ev.clientY);

    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setMousePressed(false);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({
      x: ev.clientX,
      y: ev.clientY,
    });
  };

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    selectedItem: { listId: number; rowIndex: number }
  ) => {
    setMousePressed(true);

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseMove);

    let selectedNoteWidth = 0;
    let selectedNoteHeight = 0;
    let selectedNoteTop = 0;
    let selectedNoteHeightWithGap = 0;
    let selectedListFirstNoteTop = 0;
    let insertingListTransformData: number[] = [];

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
          insertingListTransformData[item.rowIndex] = selectedNoteHeightWithGap;
      });
    }
    console.log(
      "MouseDown",
      ev.clientX,
      ev.clientY,
      selectedItem,
      insertingListTransformData,
      noteRefs
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
      insertingListYAxisTransform: insertingListTransformData,
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
          insertingListTransform = draggingState.insertingListYAxisTransform;
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
            gridData={column}
            onNoteSelected={handleMouseDown}
            selectedNoteRowIndex={selectedNoteRowIndex}
            selectedNoteTransform={selectedNoteTransform}
            insertingNoteRowIndex={insertingNoteRowIndex}
            insertingNoteHeight={insertingNoteHeight}
            insertingListYAxisTransform={insertingListTransform}
          />
        );
      })}
    </div>
  );
};

export default Grid;
