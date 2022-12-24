// https://codepen.io/lucaswang977/pen/QWxeGem?editors=0011

// TODO:
// 1. Create Collection component to hold the vertical list of items.

import { useEffect, useState } from 'react';

type Rect = { x: number; y: number; h: number; w: number };

const isPosInRect = (pos: { x: number; y: number }, rect: Rect) =>
  pos.x >= rect.x &&
  pos.x <= rect.x + rect.w &&
  pos.y >= rect.y &&
  pos.y <= rect.y + rect.h;

type GridData = {
  activeItem?: {
    col: number;
    row: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    rectX: number;
    rectY: number;
  };
  grid: Note[][];
};

type Note = {
  id: number;
  text: string;
};

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

const useMousePosition = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const updateMousePosition = (ev: MouseEvent) => {
      setMousePosition({ x: ev.clientX, y: ev.clientY });
    };
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, []);
  return mousePosition;
};

const List = (props: { id: string; data: Note[] }) => {
  const handleMouseDown = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>,
    activeItem: { col: number; row: number }
  ) => {
    const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
    console.log('MouseDown', ev.pageX, ev.pageY, rect);

    setGridState((gs) => {
      return {
        ...gs,
        activeItem: {
          col: activeItem.col,
          row: activeItem.row,
          x: ev.pageX,
          y: ev.pageY,
          dx: ev.pageX - rect.x,
          dy: ev.pageY - rect.y,
          rectX: rect.x,
          rectY: rect.y,
        },
      };
    });
  };

  return (
    <div id={props.id} className="items">
      {props.data.map((item, rowId) => {
        return (
          <div
            key={rowId + 1}
            style={transformStyle}
            className="item"
            onMouseDown={(ev) =>
              handleMouseDown(ev, { col: colIndex, row: rowIndex })
            }
          >
            <p>Item {row.id + 1}</p>
            <p className="text">{row.text}</p>
          </div>
        );
      })}
    </div>
  );
};

const Grid = () => {
  const [gridState, setGridState] = useState(initialGridData);

  // It will be accessed in window's event handler
  const mousePos = useMousePosition();

  useEffect(() => {
    if (!gridState.activeItem || !mousePos) return;

    setGridState((gs) => {
      return {
        ...gs,
        activeItem: {
          ...gs.activeItem!,
          x: mousePos.x,
          y: mousePos.y,
        },
      };
    });
  }, [mousePos]);

  const handleMouseUp = (ev: MouseEvent) => {
    console.log('MouseUp', ev.pageX, ev.pageY);

    window.removeEventListener('mouseup', handleMouseUp);

    setGridState((gs) => {
      return {
        grid: gs.grid,
      };
    });
  };

  const handleMouseEnter = (
    ev: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const gs = gridState;
    if (!gs.activeItem) return;

    const element = ev.currentTarget as HTMLDivElement;
    const colId: number = +element.id;

    console.log('MouseEnter: ', colId, gs.activeItem.col);
  };

  return (
    <div className="wrapper">
      {gridState.grid.map((column, colIndex) => {
        const oneList = column.map((row, rowIndex) => {
          let transformStyle = {};
          if (
            gridState.activeItem &&
            gridState.activeItem.col === colIndex &&
            gridState.activeItem.row === rowIndex
          ) {
            const x =
              gridState.activeItem.x -
              gridState.activeItem.dx -
              gridState.activeItem.rectX;
            const y =
              gridState.activeItem.y -
              gridState.activeItem.dy -
              gridState.activeItem.rectY;
            transformStyle = {
              transform: `translate(${x}px, ${y}px) scale(1.05)`,
            };
          }
          return (
            <div
              key={row.id + 1}
              style={transformStyle}
              className="item"
              onMouseDown={(ev) =>
                handleMouseDown(ev, { col: colIndex, row: rowIndex })
              }
            >
              <p>Item {row.id + 1}</p>
              <p className="text">{row.text}</p>
            </div>
          );
        });
        return (
          <div key={colIndex} id={colIndex.toString()} className="items">
            {oneList}
          </div>
        );
      })}
    </div>
  );
};

function App() {
  return (
    <div className="app">
      <h1 className="title">Drag &amp; Drop Grid Layout in React</h1>
      <Grid />
    </div>
  );
}

export default App;
