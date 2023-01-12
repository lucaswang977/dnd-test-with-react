export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type MouseStateType = {
  x: number;
  y: number;
  needRefresh: boolean;
  pressed: boolean;
};

export type DraggingStateType = {
  // List is the vertical line, every list contains some notes.
  selectedListId: number;
  selectedRowIndex: number;
  selectedNoteHeightWithGap: number;
  selectedNoteTransform?: { dx: number; dy: number; w: number; h: number };
  // The position when mouse clicked down
  mouseDownX: number;
  mouseDownY: number;
  // Inserting related state
  insertingListId?: number;
  insertingRowIndex?: number;
  insertingListYAxisTransform?: number[];
};

export type NoteRef = {
  rowIndex: number;
  listId: number;
  top: number;
  heightWithGap: number;
  noteRef: HTMLElement | null;
};

export type ListRef = {
  listId: number;
  listRef: HTMLElement | null;
};

export type TopHeight = { id: number; top: number; height: number };
