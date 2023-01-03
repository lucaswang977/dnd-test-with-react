export type GridData = {
  activeItem?: {
    // List is the vertical line, every list contains some notes.
    listId: number;
    noteId: number;
    rowIndex: number;
    // Width and height when mouse pressed down
    w: number;
    h: number;
    // The position when mouse clicked down
    mouseDownX: number;
    mouseDownY: number;
    // The delta numbers between the mouse click position and element's left/top position
    dx: number;
    dy: number;
    // The selected note's height plus its gap, for transform
    offset: number;
  };
  grid: Note[][];
};

export type Note = {
  id: number;
  text: string;
};

export type NoteRefs = {
  rowIndex: number;
  listId: number;
  top: number;
  noteId: number;
  noteRef: HTMLElement | null;
}[];

export type ListRefs = {
  listId: number;
  listRef: HTMLElement | null;
}[];
