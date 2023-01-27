import { CSSProperties } from "react";

export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type InputPosType = {
  x: number;
  y: number;
};

type ElementRectType = {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  gap: number;
};

type ListStateEnumType = "still" | "inserting" | "selected";
type ListStateType = { cntId: number; state: ListStateEnumType };

type NoteStateEnumType = "still" | "dragging";
type NoteStateType = {
  cntId: number;
  rowIndex: number;
  state: NoteStateEnumType;
  transition: boolean;
  data: { dx: number; dy: number; w: number };
};

export type DraggingStateType = {
  // List is the vertical line, every list contains some notes.
  selectedListId: number;
  selectedRowIndex: number;
  selectedRect: ElementRectType;

  // The position when mouse clicked down
  mouseDownX: number;
  mouseDownY: number;
  // Inserting related state
  insertingListId: number;
  insertingRowIndex: number;

  listStates?: ListStateType[];
  noteStates?: NoteStateType[];
  releasingNoteStates?: NoteStateType[];

  justStartDragging: boolean;
  releasingState: boolean;
};

export type NoteRef = {
  rowIndex: number;
  cntId: number;
  noteRef: HTMLElement | null;
  rect?: ElementRectType;
};

export type ContainerRef = {
  cntId: number;
  cntRef: HTMLElement | null;
  rect?: ElementRectType;
  firstChildTopLeft?: { top: number; left: number };
};

export type TopHeight = { id: number; top: number; height: number };

export interface ContainerInterface {
  cntId: number;
  gridData: Note[];
  state: ListStateEnumType;
  selectedNoteRect: ElementRectType | undefined;
  needTransition: boolean;
  onSaveContainerRef: (cntId: number, element: HTMLElement | null) => void;
  onSaveNoteRef: (
    cntId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
  showPlaceholder: boolean;
  noteStates: NoteStateType[];
}

export interface NoteInterface {
  cntId: number;
  rowIndex: number;
  state: NoteStateType;
  noteId: number;
  noteText: string;
  onSaveNoteRef: (
    cntId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
}
