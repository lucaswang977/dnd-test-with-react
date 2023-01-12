// [x] We need the note to be fixed width and variable height.
// [x] We will store the refs of all the notes and update as they change.
// [x] A note can be dragged in front of any note in other lists.
// [x] Make the height of every list is different.
// [x] Separate List from Grid, update them individually.
// [ ] Reduce the code density.
// [ ] Unit testing on most of the code.
// [ ] Support touch gesture.
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
import {
  GridData,
  MouseStateType,
  DraggingStateType,
  NoteRef,
  ListRef,
} from "../types";
import List from "./list";
import {
  TopHeight,
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

  // It will be accessed in window's event handler
  const [mouseState, _setMouseState] = useState<MouseStateType>();
  const mouseStateRef = useRef(mouseState);
  const setMouseState = (mouseState: MouseStateType) => {
    mouseStateRef.current = mouseState;
    _setMouseState(mouseState);
  };

  useEffect(() => {
    // When mouse is in dragging mode, we will do a lot of calculations here
    if (!draggingState || !mouseState) return;

    // Check if we need to refresh the grid data
    if (
      mouseState &&
      mouseState.pressed === false &&
      mouseState.needRefresh === true &&
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
      setMouseState({ x: 0, y: 0, pressed: false, needRefresh: false });
      return;
    }

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
          dx: mouseState.x - ds.mouseDownX,
          dy:
            mouseState.y -
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
            { x: mouseState.x, y: mouseState.y },
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

        // // We have to clone all the data otherwise data stored in refs
        // // could be corrupted.
        // let notesInInsertingList: NoteRef[] = [];

        // noteRefs.current.forEach((item) => {
        //   if (targetList && item.listId === targetList.listId) {
        //     notesInInsertingList.push({ ...item });
        //   }
        // });

        // notesInInsertingList.sort((a, b) => a.rowIndex - b.rowIndex);
        // console.log("1)", notesInInsertingList);

        // // If this list is also the selected list, we have to firstly
        // // change the top of some notes since one note has been removed
        // // from the list already (by position:fixed).

        // // We have a note selected, so we should first update all the belowed note's
        // // position then remove it from this list.
        // if (targetList.listId === ds.selectedListId) {
        //   notesInInsertingList = notesInInsertingList.map((item) => {
        //     const newItem = { ...item };
        //     if (item.rowIndex > ds.selectedRowIndex) {
        //       newItem.top = newItem.top - ds.selectedNoteHeightWithGap;
        //     }
        //     return newItem;
        //   });

        //   notesInInsertingList = notesInInsertingList.filter(
        //     (item) => item.rowIndex !== ds.selectedRowIndex
        //   );

        //   console.log("2)", notesInInsertingList);
        // }

        // // For later restore to this state
        // const notesStoredState: NoteRef[] = [];
        // notesInInsertingList.forEach((item) => {
        //   notesStoredState.push({ ...item });
        // });
        // console.log("Stored: ", notesStoredState);

        // // We have an inserting note, so we should update
        // // all the belowed note's posistion, but not inserting the selected one.
        // if (ds.insertingRowIndex !== undefined) {
        //   notesInInsertingList = notesInInsertingList.map(
        //     (item, currentRowIndex) => {
        //       const newItem = { ...item };
        //       if (
        //         ds.insertingRowIndex !== undefined &&
        //         currentRowIndex >= ds.insertingRowIndex
        //       )
        //         newItem.top = newItem.top + ds.selectedNoteHeightWithGap;
        //       return newItem;
        //     }
        //   );
        // }
        // console.log("3)", notesInInsertingList);

        // // Find the new inserting row index.
        // notesInInsertingList.map((item, currentRowIndex) => {
        //   const tp = item.top;
        //   const sp = tp + item.heightWithGap / 2;
        //   const bt = tp + item.heightWithGap;

        //   if (mouseState.y <= sp && mouseState.y >= tp) {
        //     dsModified.insertingRowIndex = currentRowIndex;
        //   } else if (mouseState.y <= bt && mouseState.y > sp) {
        //     dsModified.insertingRowIndex = currentRowIndex + 1;
        //   }
        //   console.log(
        //     "4)",
        //     mouseState.y,
        //     tp,
        //     sp,
        //     bt,
        //     dsModified.insertingRowIndex
        //   );
        // });

        // // Restore to stored state then insert
        // if (dsModified.insertingRowIndex !== ds.insertingRowIndex) {
        //   notesInInsertingList = notesStoredState.map(
        //     (item, currentRowIndex) => {
        //       const newItem = { ...item };
        //       if (
        //         ds.insertingRowIndex !== undefined &&
        //         currentRowIndex >= ds.insertingRowIndex
        //       )
        //         newItem.top = newItem.top + ds.selectedNoteHeightWithGap;
        //       return newItem;
        //     }
        //   );
        //   console.log("5)", notesInInsertingList);
        // }

        // // Save the inserting list transform data for later rendering.
        // const insertingListTransform: { dx: number; dy: number }[] = [];
        // notesStoredState.map((item) => {
        //   let currentNoteTop = 0;
        //   const currentNote = notesInInsertingList.find(
        //     (i) => i.rowIndex == item.rowIndex
        //   );

        //   if (currentNote) currentNoteTop = currentNote.top;

        //   insertingListTransform[item.rowIndex] = {
        //     dx: 0,
        //     dy: currentNoteTop - item.top,
        //   };
        // });
        // console.log("6)", insertingListTransform);

        dsModified.insertingListYAxisTransform = transformData;
      }

      return dsModified;
    });
  }, [mouseState]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log("MouseUp", ev.clientX, ev.clientY);

    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setMouseState({
      x: ev.clientX,
      y: ev.clientY,
      needRefresh: true,
      pressed: false,
    });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMouseState({
      needRefresh: false,
      pressed: true, // FIX: this state is not quite reasonable.
      x: ev.clientX,
      y: ev.clientY,
    });
  };

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    selectedItem: { listId: number; rowIndex: number }
  ) => {
    setMouseState({
      x: ev.clientX,
      y: ev.clientY,
      needRefresh: false,
      pressed: true,
    });

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
