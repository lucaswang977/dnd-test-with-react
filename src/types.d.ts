import { CSSProperties } from "react";

export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type InputPosType = {
  cur: { x: number; y: number };
  last?: { x: number; y: number };
};

export type InputStateType = {
  started: boolean;
  mouseDownPos?: { x: number; y: number };
  mouseUpPos?: { x: number; y: number };
};
type ElementRectType = {
  top: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
  gap: number;
};

type ContainerStateEnumType = "still" | "inserting" | "selected";
type ContainerStateType = {
  cntId: number;
  state: ContainerStateEnumType;
  transition: boolean;
};

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
  selectedContainerId: number;
  selectedRowIndex: number;
  selectedRect: ElementRectType;

  // The position when mouse clicked down
  mouseDownX: number;
  mouseDownY: number;
  // Inserting related state
  insertingContainerId: number;
  insertingRowIndex: number;

  containerStates?: ContainerStateType[];
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
};

export type TopHeight = { id: number; top: number; height: number };

export interface ContainerInterface {
  cntId: number;
  gridData: Note[];
  state: ContainerStateType;
  selectedNoteRect: ElementRectType | undefined;
  onSaveContainerRef: (cntId: number, element: HTMLElement | null) => void;
  onSaveNoteRef: (
    cntId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
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
