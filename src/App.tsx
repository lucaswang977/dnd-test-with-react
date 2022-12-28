// https://codepen.io/lucaswang977/pen/QWxeGem?editors=0011

// TODO:
// [x] We need the note to be fixed width and variable height.
// [x] We will store the refs of all the notes and update as they change.
// [ ] A note can be dragged in front of any note in other lists.
//
// Note:
// * Transform.translate accepts the arguments which are relative to the DOM's original positions.
// * So after re-layout, the DOM is changed, we have to re-caculate the mouse down pos with the new DOM position.

import { useEffect, useState, useRef } from 'react';

type GridData = {
  activeItem?: {
    // List is the vertical line, every list contains some notes.
    listId: number;
    noteId: number;
    // The position when mouse clicked down
    mouseDownX: number;
    mouseDownY: number;
    // The delta numbers between the mouse click position and element's left/top position
    dx: number;
    dy: number;
  };
  grid: Note[][];
};

type Note = {
  id: number;
  text: string;
};

interface ListInterface {
  listId: number,
  data: Note[],
  saveListRef: (element: HTMLElement | null) => void,
  saveNoteRef: (listId: number, noteId: number, element: HTMLElement | null) => void,
  selectedNoteIndex: number | undefined,
  selectedNotePos: { x: number, y: number } | undefined,
  onNoteSelected: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>, activeItem: { listId: number; noteId: number }) => void
}

const isPosInRect = (pos: { x: number; y: number }, rect: DOMRect) =>
  pos.x >= rect.x &&
  pos.x <= rect.x + rect.width &&
  pos.y >= rect.y &&
  pos.y <= rect.y + rect.height;


const List = (props: ListInterface) => {
  return (
    <div ref={props.saveListRef} className="list">
      {props.data.map((note, noteId) => {
        let transformStyle = {};
        if (props.selectedNoteIndex !== undefined && props.selectedNotePos !== undefined && props.selectedNoteIndex === noteId) {
          transformStyle = {
            transform: `translateX(${props.selectedNotePos.x}px) translateY(${props.selectedNotePos.y}px) scale(1.05)`,
          };
        }
        const saveNoteRef = (element: HTMLElement | null) => {
          if (element) props.saveNoteRef(props.listId, noteId, element);
        }
        return (
          <div
            ref={saveNoteRef}
            key={note.id}
            className="note"
            style={transformStyle}
            onMouseDown={(ev) =>
              props.onNoteSelected(ev, { listId: props.listId, noteId: noteId })
            }
          >
            <p>Item {note.id + 1}</p>
            <p className="text">{note.text}</p>
          </div>
        );
      })}
    </div>
  );
};


type NoteRefs = {
  listId: number,
  noteId: number,
  noteRef: HTMLElement | null
}[];

type ListRefs = {
  listId: number,
  listRef: HTMLElement | null,
}[];

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const [relayoutFlag, setRelayoutFlag] = useState(false);

  const noteRefs = useRef<NoteRefs>([]);
  const listRefs = useRef<ListRefs>([]);

  // It will be accessed in window's event handler
  const [mousePos, _setMousePos] = useState<{ x: number, y: number }>();
  const mousePosRef = useRef(mousePos);
  const setMousePos = (pos: { x: number, y: number }) => {
    mousePosRef.current = mousePos;
    _setMousePos(pos);
  }

  useEffect(() => {
    if (!gridState.activeItem || !mousePos) return;

    setGridState((gs) => {
      if (!gs.activeItem) return gs;
      let ai = gs.activeItem;
      let grid = gs.grid;

      // Calculate which list the selected note is on right now.
      if (listRefs.current) {
        listRefs.current.map((item) => {
          if (item.listRef && isPosInRect(mousePos, item.listRef.getBoundingClientRect())) {
            if (item.listId !== ai.listId) {
              // Duplicate the grid and activeItem
              grid = gs.grid.map(arr => arr.slice());
              // Append the note to the list
              // TODO: Find the suitable position to insert the note in
              grid[item.listId].push(gs.grid[ai.listId][ai.noteId]);
              // Remove it from current list
              grid[ai.listId].splice(ai.noteId, 1);
              // Clone the activeItem
              ai = { ...gs.activeItem! };
              // Set activeItem
              ai.noteId = grid[item.listId].length - 1;
              ai.listId = item.listId;

              // Set relayout flag
              // - Since we are not able to get the element absolute position in DOM before relayout
              //   we have to put it off to the next render cycle.
              // - If we want to get the exact position of the DOM element, we should clear the transform
              //   styles. 
              ai.mouseDownX = mousePos.x;
              ai.mouseDownY = mousePos.y;
              setRelayoutFlag(true);
            }
          }
        })
      }

      return {
        grid: grid,
        activeItem: {
          ...ai
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
                mouseDownY: rect.y + gs.activeItem.dy
              }
            }
          }
        }
        return gs;
      })
      setRelayoutFlag(false);
    }
  }, [relayoutFlag])

  const findNoteRect = (listId: number, noteId: number): DOMRect | undefined => {
    if (noteRefs.current) {
      const note = noteRefs.current.find((item) => (item.listId === listId && item.noteId == noteId))
      if (note !== undefined) {
        const rect = note.noteRef?.getBoundingClientRect();
        return rect;
      }
    }
    return undefined;
  }

  const handleMouseUp = (ev: MouseEvent) => {
    console.log('MouseUp', ev.clientX, ev.clientY);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mousemove', handleMouseMove);

    setGridState((gs) => {
      return {
        grid: gs.grid,
        activeItem: undefined
      };
    });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({ x: ev.clientX, y: ev.clientY });
  }

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { listId: number; noteId: number }
  ) => {
    console.log('MouseDown', ev.clientX, ev.clientY, activeItem);
    setMousePos({ x: ev.clientX, y: ev.clientY });

    const rect = findNoteRect(activeItem.listId, activeItem.noteId);
    if (rect !== undefined) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);

      setGridState((gs) => {
        return {
          grid: gs.grid,
          activeItem: {
            listId: activeItem.listId,
            noteId: activeItem.noteId,
            dx: ev.clientX - rect.x,
            dy: ev.clientY - rect.y,
            mouseDownX: ev.clientX,
            mouseDownY: ev.clientY
          },
        };
      });
    }
  };

  return (
    <div className="grid-wrapper">
      {gridState.grid.map((column, colIndex) => {
        let selectedNoteIndex: number | undefined = undefined;
        let selectedNotePos = undefined;
        if (gridState.activeItem && mousePos && gridState.activeItem.listId == colIndex) {
          selectedNoteIndex = gridState.activeItem.noteId;
          let rect = findNoteRect(gridState.activeItem.listId, gridState.activeItem.noteId);
          if (rect === undefined) rect = new DOMRect();

          const x = mousePos.x - gridState.activeItem.mouseDownX;
          const y = mousePos.y - gridState.activeItem.mouseDownY;
          // console.log('Move: Index(',
          //   gridState.activeItem.col, gridState.activeItem.noteId, ')',
          //   ' Rect(', Math.floor(rect.x), Math.floor(rect.y), ')',
          //   ' Delta(', Math.floor(gridState.activeItem.dx), Math.floor(gridState.activeItem.dy), ')',
          //   ' Mouse(', Math.floor(gridState.activeItem.mouseDownX), Math.floor(gridState.activeItem.mouseDownY), ')',
          //   ' Trans(', Math.floor(x), Math.floor(y), ')');

          selectedNotePos = { x: x, y: y };
        }
        const saveListRef = (element: HTMLElement | null) => {
          if (listRefs.current && element) {
            let alreadyCreated = false;
            listRefs.current.map((item) => {
              if (item.listId === colIndex) {
                alreadyCreated = true;
                item.listRef = element;
              }
            })
            if (!alreadyCreated) {
              listRefs.current.push({ listId: colIndex, listRef: element })
            }
          }
        }
        const saveNoteRef = (listId: number, noteId: number, element: HTMLElement | null) => {
          if (noteRefs.current && element) {
            let alreadyCreated = false;
            noteRefs.current.map((item) => {
              if (item.listId === listId && item.noteId == noteId) {
                alreadyCreated = true;
                item.noteRef = element;
              }
            })

            if (!alreadyCreated) {
              noteRefs.current.push({ listId: listId, noteId: noteId, noteRef: element });
            }
          }
        }

        return (
          <List saveListRef={saveListRef} saveNoteRef={saveNoteRef}
            key={colIndex} listId={colIndex} data={column}
            onNoteSelected={handleMouseDown}
            selectedNoteIndex={selectedNoteIndex}
            selectedNotePos={selectedNotePos} />
        );
      })}
    </div>
  );
};

function App() {
  const initialGridData: GridData = {
    grid: [
      [
        {
          id: 0,
          text: 'dummy text of the printing and typesetting industry. Lorem Ipsum has been the',
        },
        {
          id: 1,
          text: 'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using',
        },
        {
          id: 2,
          text: 'There are many variations of passages of Lorem Ipsum available, but the majority have suffered',
        },
      ],
      [
        {
          id: 3,
          text: 'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. ',
        },
        {
          id: 4,
          text: 'There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form, by injected humour ',
        },
        {
          id: 5,
          text: 'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form',
        },
        {
          id: 6,
          text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam',
        },
        {
          id: 7,
          text: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae',
        },
      ],
      [
        {
          id: 8,
          text: 'But I must explain to you how all this mistaken idea of denouncing',
        },
        {
          id: 9,
          text: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati ',
        },
        {
          id: 10,
          text: 'On the other hand, we denounce with righteous indignation and dislike men who are so beguiled and demoralized by the charms of pleasure of the moment',
        },
        {
          id: 11,
          text: 'be welcomed and every pain avoided. But in certain circumstances and owing to the claims of duty or the obligations of business it will frequently occur that',
        },
      ],
    ],
  };

  return (
    <div className="app">
      <h1 className="title">Drag &amp; Drop Grid Layout in React</h1>
      <Grid gridData={initialGridData} />
    </div>
  );
}

export default App;
