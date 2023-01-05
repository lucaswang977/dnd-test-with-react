export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type DraggingStateType = {
  // List is the vertical line, every list contains some notes.
  selectedListId: number;
  selectedRowIndex: number;
  selectedNoteHeightWithGap: number;
  // Selected note's width and height when mouse pressed down
  w: number;
  h: number;
  // The position when mouse clicked down
  mouseDownX: number;
  mouseDownY: number;
  // Inserting related state
  insertingListId?: number;
  insertingRowIndex?: number;
};

export type NoteRefs = {
  rowIndex: number;
  listId: number;
  top?: number;
  height?: number;
  noteId: number;
  noteRef: HTMLElement | null;
}[];

export type ListRefs = {
  listId: number;
  listRef: HTMLElement | null;
}[];
