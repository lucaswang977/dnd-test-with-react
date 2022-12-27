// https://codepen.io/lucaswang977/pen/QWxeGem?editors=0011

// TODO:
// 1. Create Collection component to hold a vertical list of Notes.
// 2. Collection has a state array of every note, includes their height.
// 3. Should we save all the rect info or just save the refs in the state? Lists' refs in Grid, Notes' refs in List.
// 4. OnMouseMove(after mousedown), we first check if the center point of the Note is enter a list via Lists' refs state.
// 5. Then we will check the Notes' height in this List via the Notes' refs state.
// 6. We don't have to refresh the refs when window is resizing.

import { useEffect, useState, useRef } from 'react';

const isPosInRect = (pos: { x: number; y: number }, rect: DOMRect) =>
  pos.x >= rect.x &&
  pos.x <= rect.x + rect.width &&
  pos.y >= rect.y &&
  pos.y <= rect.y + rect.height;

type GridData = {
  activeItem?: {
    col: number;
    row: number;
    mouseDownX: number;
    mouseDownY: number;
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
  saveRef: (element: HTMLElement | null) => void;
  selectedNoteIndex: number | undefined,
  selectedNotePos: { x: number, y: number } | undefined,
  onNoteSelected: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>, activeItem: { col: number; row: number }) => void
}

const List = (props: ListInterface) => {
  return (
    <div ref={props.saveRef} className="list">
      {props.data.map((note, rowId) => {
        let transformStyle = {};
        if (props.selectedNoteIndex !== undefined && props.selectedNotePos !== undefined && props.selectedNoteIndex === rowId) {
          transformStyle = {
            transform: `translateX(${props.selectedNotePos.x}px) translateY(${props.selectedNotePos.y}px) scale(1.05)`,
          };
        }
        return (
          <div
            key={rowId + 1}
            className="note"
            style={transformStyle}
            onMouseDown={(ev) =>
              props.onNoteSelected(ev, { col: props.listId, row: rowId })
            }
          >
            <p>Item {rowId + 1}</p>
            <p className="text">{note.text}</p>
          </div>
        );
      })}
    </div>
  );
};

const Grid = (props: { gridData: GridData }) => {
  const [gridState, setGridState] = useState(props.gridData);
  const listRefs = useRef<HTMLElement[]>([]);

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
      // TODO: Calculate which list the selected note is on right now.
      if (listRefs.current) {
        listRefs.current.map((item, index) => {
          if (isPosInRect(mousePos, item.getBoundingClientRect())) {
            console.log('** Move in list: ', index);
          }
        })
      }

      return {
        ...gs,
        activeItem: {
          ...gs.activeItem!,
          dx: mousePos.x - gs.activeItem.mouseDownX,
          dy: mousePos.y - gs.activeItem.mouseDownY,
        },
      };
    });
  }, [mousePos]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log('MouseUp', ev.clientX, ev.clientY);

    window.removeEventListener('mouseup', handleMouseUp);
    window.removeEventListener('mousemove', handleMouseMove);

    setGridState((gs) => {
      return {
        grid: gs.grid,
      };
    });
  };

  const handleMouseMove = (ev: MouseEvent) => {
    setMousePos({ x: ev.clientX, y: ev.clientY });
  }

  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { col: number; row: number }
  ) => {
    console.log('MouseDown', ev.clientX, ev.clientY, activeItem);

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    setGridState((gs) => {
      return {
        ...gs,
        activeItem: {
          col: activeItem.col,
          row: activeItem.row,
          mouseDownX: ev.clientX,
          mouseDownY: ev.clientY,
          dx: 0,
          dy: 0,
        },
      };
    });
  };

  return (
    <div className="grid-wrapper">
      {gridState.grid.map((column, colIndex) => {
        let selectedNoteIndex = undefined;
        let selectedNotePos = undefined;
        if (gridState.activeItem && gridState.activeItem.col == colIndex) {
          selectedNoteIndex = gridState.activeItem.row;

          const x = gridState.activeItem.dx
          const y = gridState.activeItem.dy;
          selectedNotePos = { x: x, y: y };
        }
        const saveRef = (element: HTMLElement | null) => {
          if (listRefs.current && element)
            listRefs.current[colIndex] = element;
          console.log(listRefs.current);
        }

        return (
          <List saveRef={saveRef} key={colIndex} listId={colIndex} data={column}
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
