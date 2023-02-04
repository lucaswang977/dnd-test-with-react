import { CSSProperties } from "react";

export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type PosType = { x: number; y: number };

export type InputPosType = {
  cur: PosType;
  last?: PosType;
};

export type InputStateType = {
  started: boolean;
  mouseDownPos?: PosType;
  mouseUpPos?: PosType;
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
type ContainerTransformStateType = {
  cntId: number;
  state: ContainerStateEnumType;
  transition: boolean;
  duration: number;
};

type NoteStateEnumType = "still" | "dragging";
type NoteTransformStateType = {
  cntId: number;
  rowIndex: number;
  state: NoteStateEnumType;
  transition: boolean;
  duration: number;
  data: { dx: number; dy: number; w: number };
};

export type DraggingStateType = {
  // List is the vertical line, every list contains some notes.
  selectedContainerIndex: number;
  selectedRowIndex: number;
  selectedRect: ElementRectType;

  // Inserting related state
  insertingContainerIndex: number;
  insertingRowIndex: number;

  // The mouse position when a note is selected
  mouseDownPos: PosType;

  // Avoid first frame transition problem
  justStartDragging: boolean;

  // For the calculation when note is released
  isOutsideOfAnyContainer: boolean;

  // We calculate those states when note is being dragged.
  noteTransformStates?: NoteTransformStateType[];
  containerTransformStates?: ContainerTransformStateType[];
  releasingNoteTransformStates?: NoteTransformStateType[];
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
  state: ContainerTransformStateType;
  selectedNoteRect: ElementRectType | undefined;
  onSaveContainerRef: (cntId: number, element: HTMLElement | null) => void;
  onSaveNoteRef: (
    cntId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
  noteTransformStates: NoteTransformStateType[];
}

export interface NoteInterface {
  cntId: number;
  rowIndex: number;
  state: NoteTransformStateType;
  noteId: number;
  noteText: string;
  onSaveNoteRef: (
    cntId: number,
    rowIndex: number,
    element: HTMLElement | null
  ) => void;
}
