// TODO:
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
import { GridData, NoteRefs, ListRefs } from "../types";
import List from "./list";

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [relayoutFlag, setRelayoutFlag] = useState(false);

  // It will be accessed in window's event handler
  const [mousePos, _setMousePos] = useState<{ x: number; y: number }>();
  const mousePosRef = useRef(mousePos);
  const setMousePos = (pos: { x: number; y: number }) => {
    mousePosRef.current = mousePos;
    _setMousePos(pos);
  };

  // To save all the DOMs for get the client bounding rects
  const noteRefs = useRef<NoteRefs>([]);
  const listRefs = useRef<ListRefs>([]);

  // Utility functions
  const isPosInRect = (pos: { x: number; y: number }, rect: DOMRect) =>
    pos.x >= rect.x &&
    pos.x <= rect.x + rect.width &&
    pos.y >= rect.y &&
    pos.y <= rect.y + rect.height;

  const getYAxisArray = (listId: number) => {
    let yAxises: number[] = [];
    if (noteRefs.current) {
      const listNotes = noteRefs.current.filter(
        (item) => item.listId === listId
      );
      yAxises = listNotes.map(
        (item) =>
          item.noteRef?.getBoundingClientRect().y! +
          item.noteRef?.getBoundingClientRect().height!
      );
    }

    return yAxises;
  };

  const findInsertIndexByYAxis = (posY: number, heights: number[]) => {
    const resultIndex = heights
      .sort((a, b) => a - b)
      .findIndex((y) => posY <= y);
    return resultIndex < 0 ? heights.length : resultIndex;
  };

  const findNoteRect = (
    listId: number,
    noteId: number
  ): DOMRect | undefined => {
    if (noteRefs.current) {
      const note = noteRefs.current.find(
        (item) => item.listId === listId && item.noteId == noteId
      );
      if (note !== undefined) {
        const rect = note.noteRef?.getBoundingClientRect();
        return rect;
      }
    }
    return undefined;
  };

  useEffect(() => {
    if (!gridState.activeItem || !mousePos) return;

    // When mouse is in dragging mode, we will do a lot of calculations here
    setGridState((gs) => {
      if (!gs.activeItem) return gs;

      let ai = gs.activeItem;
      let grid = gs.grid;

      // Calculate which list the selected note is on right now.
      // if (listRefs.current) {
      //   const targetList = listRefs.current.find(
      //     (list) =>
      //       list.listRef &&
      //       isPosInRect(mousePos, list.listRef.getBoundingClientRect())
      //   );

      //   if (targetList === undefined) return gs;

      //   // Find the appropriate position to insert the note into
      //   const index = findInsertIndexByYAxis(
      //     mousePos.y,
      //     getYAxisArray(targetList.listId)
      //   );
      //   // console.log('yaxis: ', getYAxisArray(targetList.listId), noteRefs.current);
      //   if (index === undefined) return gs;

      //   const fromIndex = grid[ai.listId].findIndex(
      //     (item) => item.id === ai.noteId
      //   );
      //   const selectedNote = grid[ai.listId][fromIndex];

      //   if (
      //     (targetList.listId === ai.listId && index !== fromIndex) ||
      //     targetList.listId !== ai.listId
      //   ) {
      //     // Duplicate the grid and activeItem
      //     grid = gs.grid.map((arr) => arr.slice());

      //     console.log(
      //       "from list: ",
      //       ai.listId,
      //       ", to list: ",
      //       targetList.listId,
      //       " move row: ",
      //       fromIndex,
      //       " to row:",
      //       index,
      //       grid
      //     );

      //     // Remove it from current list
      //     grid[ai.listId].splice(fromIndex, 1);
      //     // Remove it from noteRefs
      //     noteRefs.current.splice(
      //       noteRefs.current.findIndex((n) => n.noteId === selectedNote.id),
      //       1
      //     );
      //     // Insert it into the target list
      //     grid[targetList.listId].splice(index, 0, selectedNote);

      //     // Clone the activeItem
      //     ai = { ...gs.activeItem! };
      //     // Set activeItem
      //     ai.noteId = selectedNote.id;
      //     ai.listId = targetList.listId;
      //     console.log("grid: ", grid);

      //     // Set relayout flag
      //     // TODO:
      //     // - Since we are not able to get the element absolute position in DOM before relayout
      //     //   we have to put it off to the next render cycle.
      //     // - If we want to get the exact position of the DOM element, we should clear the transform
      //     //   styles first. This is not a good solution, since there will be several frames of
      //     //   rendering before transforming.
      //     ai.mouseDownX = mousePos.x;
      //     ai.mouseDownY = mousePos.y;
      //     // setRelayoutFlag(true);
      //   }
      // }

      return {
        grid: grid,
        activeItem: {
          ...ai,
        },
      };
    });
  }, [mousePos]);

  useEffect(() => {
    if (relayoutFlag && gridState.activeItem) {
      setGridState((gs) => {
        if (gs !== undefined && gs.activeItem) {
          const listId = gs.activeItem.listId;
          const noteId = gs.activeItem.noteId;
          const rect = findNoteRect(listId, noteId);
          if (rect && mousePos) {
            return {
              ...gs,
              activeItem: {
                ...gs.activeItem,
                mouseDownX: rect.x + gs.activeItem.dx,
                mouseDownY: rect.y + gs.activeItem.dy,
              },
            };
          }
        }
        return gs;
      });
      setRelayoutFlag(false);
    }
  }, [relayoutFlag]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log("MouseUp", ev.clientX, ev.clientY);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseMove);

    setGridState((gs) => {
      return {
        grid: gs.grid,
        activeItem: undefined,
      };
    });
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

    let offset = 0;

    if (noteRefs && noteRefs.current) {
      noteRefs.current.forEach((item) => {
        if (item.noteRef) item.top = item.noteRef.getBoundingClientRect().top;
        // TODO: Calculate the offset
      });

      console.log(noteRefs);
    }

    const rect = findNoteRect(selectedItem.listId, selectedItem.noteId);
    if (rect !== undefined) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseMove);

      setGridState((gs) => {
        return {
          grid: gs.grid,
          activeItem: {
            listId: selectedItem.listId,
            noteId: selectedItem.noteId,
            rowIndex: selectedItem.rowIndex,
            w: rect.width,
            h: rect.height,
            dx: ev.clientX - rect.x,
            dy: ev.clientY - rect.y,
            mouseDownX: ev.clientX,
            mouseDownY: ev.clientY,
            offset: offset,
          },
        };
      });
    }
  };

  return (
    <div className="grid">
      {gridState.grid.map((column, colIndex) => {
        let selectedNoteRowIndex: number | undefined = undefined;
        let selectedNoteTransform = undefined;
        let insertingNoteTransform = undefined;

        if (
          gridState.activeItem &&
          mousePos &&
          gridState.activeItem.listId == colIndex
        ) {
          selectedNoteRowIndex = gridState.activeItem.rowIndex;
          let rect = findNoteRect(
            gridState.activeItem.listId,
            gridState.activeItem.noteId
          );
          if (rect === undefined) rect = new DOMRect();

          const x = mousePos.x - gridState.activeItem.mouseDownX;
          const y = mousePos.y - gridState.activeItem.mouseDownY;
          // console.log('Move: Index(',
          //   gridState.activeItem.col, gridState.activeItem.noteId, ')',
          //   ' Rect(', Math.floor(rect.x), Math.floor(rect.y), ')',
          //   ' Delta(', Math.floor(gridState.activeItem.dx), Math.floor(gridState.activeItem.dy), ')',
          //   ' Mouse(', Math.floor(gridState.activeItem.mouseDownX), Math.floor(gridState.activeItem.mouseDownY), ')',
          //   ' Trans(', Math.floor(x), Math.floor(y), ')');

          selectedNoteTransform = {
            x: x,
            y: y,
            w: gridState.activeItem.w,
            h: gridState.activeItem.h,
          };
          // TODO: Selected a note doesn't mean there will be an inserting note.
          insertingNoteTransform = {
            w: gridState.activeItem.w,
            h: gridState.activeItem.h,
            y: mousePos.y,
            offset: gridState.activeItem.offset,
          };
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
                rowIndex: 0,
                top: 0,
                listId: listId,
                noteId: noteId,
                noteRef: element,
              });
            }
          }
        };

        let noteTops: number[] = [];
        if (noteRefs && noteRefs.current) {
          let noteTopsInList = noteRefs.current.filter(
            (item) => item.listId === colIndex
          );
          noteTopsInList.sort((a, b) => a.rowIndex - b.rowIndex);
          noteTops = noteTopsInList.map((item) => item.top);
        }

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
            insertingNoteTransform={insertingNoteTransform}
          />
        );
      })}
    </div>
  );
};

export default Grid;
