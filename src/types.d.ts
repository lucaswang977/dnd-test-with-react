import { CSSProperties } from "react";

export type Note = {
  id: number;
  text: string;
};

export type GridData = Note[][];

export type MousePosType = {
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

export type DraggingStateType = {
  // List is the vertical line, every list contains some notes.
  selectedListId: number;
  selectedRowIndex: number;
  selectedRect: ElementRectType;
  // The position when mouse clicked down
  mouseDownX: number;
  mouseDownY: number;
  // Inserting related state
  insertingListId?: number;
  insertingRowIndex?: number;

  transformStyles: CSSProperties[][];
  placeholderHeight: number;
};

export type NoteRef = {
  rowIndex: number;
  listId: number;
  noteRef: HTMLElement | null;
  rect: ElementRectType;
};

export type ListRef = {
  listId: number;
  listRef: HTMLElement | null;
  rect?: ElementRectType;
};

export type TopHeight = { id: number; top: number; height: number };
