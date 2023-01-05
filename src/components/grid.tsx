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

import { useEffect, useState, useRef } from "react";
import { GridData, DraggingStateType, NoteRefs, ListRefs } from "../types";
import List from "./list";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [draggingState, setDraggingState] = useState<
    DraggingStateType | undefined
  >();

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRefs>([]);
  const listRefs = useRef<ListRefs>([]);

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
    if (!draggingState || !mousePos) return;

    // When mouse is in dragging mode, we will do a lot of calculations here
    setDraggingState((ds) => {
      if (ds === undefined) return ds;
      const dsModified = { ...ds };

      // Calculate which list the selected note is on right now.
      if (listRefs.current) {
        const targetList = listRefs.current.find(
          (list) =>
            list.listRef &&
            isPosInRect(mousePos, list.listRef.getBoundingClientRect())
        );

        if (targetList === undefined) return ds;

        if (targetList.listId !== ds.insertingListId) {
          dsModified.insertingListId = targetList.listId;
        }

        // TODO: Find the correct inserting position by first calculating the current
        // list's positions according to the states of which is recorded when mousedown
        // and mousemove

        // The tops of notes are recorded when mouse down, here we filter out
        // the data belongs to this list
        // Calculate current heights of all the notes
        let currentNoteHeights: {
          rowIndex: number;
          height?: number;
          top?: number;
        }[] = [];

        noteRefs.current.forEach((item) => {
          if (item.listId === targetList.listId) {
            currentNoteHeights.push({
              rowIndex: item.rowIndex,
              height: item.height,
              top: item.top,
            });
          }
        });

        console.log(currentNoteHeights);

        if (noteRefs && noteRefs.current) {
          // Update current note heights according to current state
          // If we have a note selected, we should remove it from this array
          // meanwhile, update all the other note's position
          if (draggingState.selectedListId === targetList.listId) {
            currentNoteHeights.map((item, currentRowIndex) => {
              if (currentRowIndex > draggingState.selectedRowIndex)
                item.top = item.top - draggingState.offset;
            });

            currentNoteHeights = currentNoteHeights.filter(
              (item) => item.rowIndex !== draggingState.selectedRowIndex
            );
          }

          // If we have an inserting note, we should insert it into this array
          // meanwhile, update all the other note's posistion.
          if (draggingState.insertingRowIndex) {
            currentNoteHeights.map((item, currentRowIndex) => {
              if (
                draggingState.insertingRowIndex &&
                currentRowIndex >= draggingState.insertingRowIndex
              )
                item.top = item.top + draggingState.offset;
            });

            currentNoteHeights.splice(draggingState.insertingRowIndex, 0, {
              rowIndex: draggingState.insertingRowIndex,
              height: draggingState.offset,
              top:
                draggingState.insertingRowIndex === 0
                  ? noteTops[0]
                  : currentNoteHeights[draggingState.insertingRowIndex - 1]
                      .top +
                    currentNoteHeights[draggingState.insertingRowIndex - 1]
                      .height,
            });
          }

          // Find the suitable inserting row index.
          currentNoteHeights.map((item, currentRowIndex) => {
            const tp = item.top;
            const sp = tp + item.height / 2;
            const bt = tp + item.height;

            if (mousePos.y <= sp && mousePos.y >= tp) {
              dsModified.insertingRowIndex = currentRowIndex;
            } else if (mousePos.y <= bt && mousePos.y > sp) {
              dsModified.insertingRowIndex = currentRowIndex + 1;
            }
          });

          console.log(currentNoteHeights, dsModified);
        }

        // // Find the appropriate position to insert the note into
        // const index = findInsertIndexByYAxis(
        //   mousePos.y,
        //   getYAxisArray(targetList.listId)
        // );
        // // console.log('yaxis: ', getYAxisArray(targetList.listId), noteRefs.current);
        // if (index === undefined) return gs;

        // const fromIndex = grid[ai.listId].findIndex(
        //   (item) => item.id === ai.noteId
        // );
        // const selectedNote = grid[ai.listId][fromIndex];

        // if (
        //   (targetList.listId === ai.listId && index !== fromIndex) ||
        //   targetList.listId !== ai.listId
        // ) {
        //   // Duplicate the grid and activeItem
        //   grid = gs.grid.map((arr) => arr.slice());

        //   console.log(
        //     "from list: ",
        //     ai.listId,
        //     ", to list: ",
        //     targetList.listId,
        //     " move row: ",
        //     fromIndex,
        //     " to row:",
        //     index,
        //     grid
        //   );

        //   // Remove it from current list
        //   grid[ai.listId].splice(fromIndex, 1);
        //   // Remove it from noteRefs
        //   noteRefs.current.splice(
        //     noteRefs.current.findIndex((n) => n.noteId === selectedNote.id),
        //     1
        //   );
        //   // Insert it into the target list
        //   grid[targetList.listId].splice(index, 0, selectedNote);

        //   // Clone the activeItem
        //   ai = { ...gs.activeItem! };
        //   // Set activeItem
        //   ai.noteId = selectedNote.id;
        //   ai.listId = targetList.listId;
        //   console.log("grid: ", grid);

        //   // Set relayout flag
        //   // - Since we are not able to get the element absolute position in DOM before relayout
        //   //   we have to put it off to the next render cycle.
        //   // - If we want to get the exact position of the DOM element, we should clear the transform
        //   //   styles first. This is not a good solution, since there will be several frames of
        //   //   rendering before transforming.
        //   ai.mouseDownX = mousePos.x;
        //   ai.mouseDownY = mousePos.y;
        //   // setRelayoutFlag(true);
        // }
      }

      return dsModified;
    });
  }, [mousePos]);

  // useEffect(() => {
  //   if (relayoutFlag && gridState.activeItem) {
  //     setGridState((gs) => {
  //       if (gs !== undefined && gs.activeItem) {
  //         const listId = gs.activeItem.listId;
  //         const noteId = gs.activeItem.noteId;
  //         const rect = findNoteRect(listId, noteId);
  //         if (rect && mousePos) {
  //           return {
  //             ...gs,
  //             activeItem: {
  //               ...gs.activeItem,
  //               mouseDownX: rect.x + gs.activeItem.dx,
  //               mouseDownY: rect.y + gs.activeItem.dy,
  //             },
  //           };
  //         }
  //       }
  //       return gs;
  //     });
  //     setRelayoutFlag(false);
  //   }
  // }, [relayoutFlag]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log("MouseUp", ev.clientX, ev.clientY);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setDraggingState(undefined);
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({ x: ev.clientX, y: ev.clientY });
  };

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    selectedItem: { listId: number; noteId: number; rowIndex: number }
  ) => {
    console.log("MouseDown", ev.clientX, ev.clientY, selectedItem);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    // We do two things when mousedown is triggered:
    // * Save all the top positions for later calculations.
    // * Calculate the inserting(selected) note's height plus gap by
    //   find the belowed note's top position minus itself's top position.
    if (noteRefs && noteRefs.current) {
      let width = 0;
      let height = 0;
      let selectedTop = 0;
      let belowSelectedTop = 0;
      let listBottom = 0;

      const lr = listRefs.current[selectedItem.listId].listRef;
      if (lr) listBottom = lr.getBoundingClientRect().bottom;

      // FIX: Rewrite this to both save all the notes' height and selected
      // note's height
      noteRefs.current.forEach((item) => {
        // Record the selected note's width & height
        if (
          item.noteRef &&
          item.rowIndex === selectedItem.rowIndex &&
          item.listId === selectedItem.listId
        ) {
          width = item.noteRef.getBoundingClientRect().width;
          height = item.noteRef.getBoundingClientRect().height;
          selectedTop = item.noteRef.getBoundingClientRect().top;
        }

        if (
          item.noteRef &&
          item.rowIndex === selectedItem.rowIndex + 1 &&
          item.listId === selectedItem.listId
        ) {
          belowSelectedTop = item.noteRef.getBoundingClientRect().top;
        }

        // When selected item is the last one, we use list's bottom as
        // the belowed note's top.
        if (belowSelectedTop === 0) {
          belowSelectedTop = listBottom;
        }

        // Save all the tops in refs array
        if (item.noteRef) {
          item.top = item.noteRef.getBoundingClientRect().top;
          item.height = belowSelectedTop - item.top;
        }
      });

      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);

      setDraggingState({
        selectedListId: selectedItem.listId,
        selectedRowIndex: selectedItem.rowIndex,
        selectedNoteHeightWithGap: belowSelectedTop - selectedTop,
        w: width,
        h: height,
        mouseDownX: ev.clientX,
        mouseDownY: ev.clientY,
        insertingListId: selectedItem.listId,
        insertingRowIndex: selectedItem.rowIndex,
      });
    }
  };

  return (
    <div className="grid">
      {gridState.map((column, colIndex) => {
        let selectedNoteRowIndex = undefined;
        let selectedNoteTransform = undefined;
        let insertingNoteTransform = undefined;
        let insertingNoteRowIndex = undefined;
        let noteTops: number[] = [];

        // The tops of notes are recorded when mouse down
        if (noteRefs && noteRefs.current) {
          let noteTopsInList = noteRefs.current.filter(
            (item) => item.listId === colIndex
          );
          noteTopsInList.sort((a, b) => a.rowIndex - b.rowIndex);
          noteTops = noteTopsInList.map((item) => item.top);
        }

        if (draggingState && mousePos) {
          // Update the list state when its inside note is being selected
          if (draggingState.selectedListId === colIndex) {
            selectedNoteRowIndex = draggingState.selectedRowIndex;

            selectedNoteTransform = {
              x: mousePos.x - draggingState.mouseDownX,
              y: mousePos.y - draggingState.mouseDownY,
              w: draggingState.w,
              h: draggingState.h,
            };
          }

          // Update the list state when there is a note being dragged onto itself.

          if (draggingState.insertingListId === colIndex) {
            insertingNoteRowIndex = draggingState.insertingRowIndex;
            insertingNoteTransform = {
              w: draggingState.w,
              h: draggingState.h,
              y: mousePos.y,
              offset: draggingState.offset,
            };
          }
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
          noteId: number,
          rowIndex: number,
          element: HTMLElement | null
        ) => {
          if (noteRefs.current && element) {
            let alreadyCreated = false;
            noteRefs.current.map((item) => {
              if (item.listId === listId && item.noteId == noteId) {
                alreadyCreated = true;
                item.noteRef = element;
              }
            });

            if (!alreadyCreated) {
              noteRefs.current.push({
                rowIndex: rowIndex,
                listId: listId,
                noteId: noteId,
                noteRef: element,
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
            noteTops={noteTops}
            onNoteSelected={handleMouseDown}
            selectedNoteRowIndex={selectedNoteRowIndex}
            selectedNoteTransform={selectedNoteTransform}
            insertingNoteRowIndex={insertingNoteRowIndex}
            insertingNoteTransform={insertingNoteTransform}
          />
        );
      })}
    </div>
  );
};

export default Grid;
