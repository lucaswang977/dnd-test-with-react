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
// [ ] Reduce grid file size by removing unnecessary states / calcs.
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
import { useMouse } from "../hooks/mouse";
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
} from "../utilities";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRef[]>([]);
  const listRefs = useRef<ListRef[]>([]);

  const [mousePos, mousePressed] = useMouse();

  useEffect(() => {
    // We do two things when mousedown is triggered:
    // * Save all the top/height(with gap) for later calculation on dragging state.
    // * Calculate the inserting(selected) note's height plus gap by
    //   finding the belowed note's top position minus itself's top position.
    if (
      mousePos &&
      mousePressed &&
      noteRefs.current &&
      draggingState === undefined
    ) {
      console.log("MouseDown", mousePos);
      let selectedItem = noteRefs.current.find((item) =>
        item.noteRef
          ? isPosInRect(mousePos, item.noteRef.getBoundingClientRect())
          : false
      );

      if (selectedItem) {
        let selectedListFirstNoteTop = 0;

        noteRefs.current.forEach((item) => {
          // Save all the tops in refs array
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

            item.rect.gap = nextTop - item.rect.bottom;

            if (
              selectedItem &&
              item.rowIndex === 0 &&
              item.listId === selectedItem.listId
            )
              selectedListFirstNoteTop = item.rect.top;
          }
        });

        const ds: DraggingStateType = {
          selectedListId: selectedItem.listId,
          selectedRowIndex: selectedItem.rowIndex,
          selectedRect: selectedItem.rect,
          mouseDownX: mousePos.x,
          mouseDownY: mousePos.y,
          insertingListId: selectedItem.listId,
          insertingRowIndex: selectedItem.rowIndex,
        };

        console.log(ds);

        setDraggingState(ds);
      }
    } else if (
      // When mouse is up, current state is checked to see if we should update
      // the grid data in order to update the entire grid state.
      mousePos &&
      mousePressed === false &&
      draggingState &&
      draggingState.insertingListId !== undefined &&
      draggingState.insertingRowIndex !== undefined &&
      draggingState.selectedListId !== undefined &&
      draggingState.selectedRowIndex !== undefined
    ) {
      console.log("MouseUp", mousePos);
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

  // When mouse is in dragging mode, we will update the visually state by
  // calculating out all the temporary state.
  useEffect(() => {
    if (!draggingState || !mousePos) return;

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

      const selectedListTopNote = noteRefs.current.find(
        (item) => item.listId === ds.selectedListId && item.rowIndex === 0
      );

      if (selectedNote && selectedListTopNote) {
        const dx =
          mousePos.x -
          draggingState.mouseDownX +
          selectedNote.rect.left -
          selectedListTopNote.rect.left;
        const dy =
          mousePos.y -
          draggingState.mouseDownY +
          selectedNote.rect.top -
          selectedListTopNote.rect.top;
        dsModified.transformStyles[draggingState.selectedListId] = [];
        dsModified.transformStyles[draggingState.selectedListId][
          draggingState.selectedRowIndex
        ] = {
          position: "absolute",
          zIndex: 1,
          width: `${draggingState.selectedRect.width}px`,
          transform: `translateX(${dx}px) translateY(${dy}px) scale(1.02)`,
        };
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
      if (targetList && selectedNote && selectedNote.noteRef) {
        if (targetList.listId !== ds.insertingListId) {
          dsModified.insertingListId = targetList.listId;
        }

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
            selectedNote.rect.height + selectedNote.rect.gap,
            0,
            false,
            topHeightList
          );
        }
        console.log("3:", topHeightList);

        const insertingIndex = findInsertingIndexFromTopHeightList(
          selectedNote.noteRef.getBoundingClientRect().top,
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
        console.log("4:", topHeightList, insertingIndex);

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
        console.log(
          "5: transformData:",
          targetList.listId,
          dsModified.transformStyles
        );
      }

      return dsModified;
    });
  }, [mousePos]);

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
            let alreadyCreated = false;
            listRefs.current.map((item) => {
              if (item.listId === listId) {
                alreadyCreated = true;
                item.listRef = element;
              }
            });
            if (!alreadyCreated) {
              listRefs.current.push({ listId: listId, listRef: element });
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
                rect: {
                  top: 0,
                  bottom: 0,
                  height: 0,
                  left: 0,
                  width: 0,
                  gap: 0,
                },
              });
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
