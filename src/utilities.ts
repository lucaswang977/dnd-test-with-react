import { useState, useRef } from "react";
import { TopHeight } from "./types";

// To remove one element from the list, meanwhile change
// the position of belowed elements.
// Returned value is cloned from input parameter.
export const removeItemFromTopHeightList = (
  index: number,
  items: TopHeight[]
): TopHeight[] => {
  if (!items || items.length === 0 || !items[index]) return [];

  const newItems: TopHeight[] = [];
  items.forEach((item, row) => {
    if (row > index)
      newItems.push({ ...item, top: item.top - items[index].height });
    else if (row < index) newItems.push({ ...item });
  });
  return newItems;
};

// To insert an element into the list, meanwhile the belowed elments'
// position will be modified.
// Not really insert an elment only changes position when fake is true.
// Returned value is cloned from input parameter.
export const insertItemIntoTopHeightList = (
  index: number,
  height: number,
  id: number,
  fake: boolean,
  items: TopHeight[],
  firstItemTop: number
): TopHeight[] => {
  if (!items) return items;

  if (index < 0) index = 0;
  if (index > items.length) index = items.length;

  let newItems: TopHeight[] = [];
  let insertedTop = firstItemTop;
  items.forEach((item, row) => {
    if (row >= index) {
      newItems.push({ ...item, top: item.top + height });
      if (row === index) insertedTop = item.top;
    } else newItems.push({ ...item });
  });

  if (index > 0 && index === items.length)
    insertedTop = items[items.length - 1].top + items[items.length - 1].height;

  if (fake)
    newItems = [
      ...newItems.slice(0, index),
      { id: id, top: insertedTop, height: height },
      ...newItems.slice(index),
    ];
  return newItems;
};

// To find the suitable index for insertion.
// Return items.length if current y is bigger than the last item's center y.
export const findInsertingIndexFromTopHeightList = (
  currentItemTop: number,
  items: TopHeight[]
): number => {
  let index = items.findIndex(
    (item) => currentItemTop < item.top + item.height / 2
  );

  if (index < 0) index = items.length;

  return index;
};

// Return a number array which contains T2.top - T1.top
export const minusTwoTopHeightList = (
  t1: TopHeight[],
  t2: TopHeight[]
): { id: number; delta: number }[] | undefined => {
  if (!t1 || !t2 || t1.length !== t2.length) return undefined;

  const result: { id: number; delta: number }[] = [];
  t1.forEach((item1) => {
    const item2 = t2.find((i) => i.id === item1.id);
    if (item2) result.push({ id: item2.id, delta: item2.top - item1.top });
  });

  return result;
};

// To check if the position is inside the rect
export const isPosInRect = (
  pos: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number }
) =>
  pos.x >= rect.x &&
  pos.x <= rect.x + rect.width &&
  pos.y >= rect.y &&
  pos.y <= rect.y + rect.height;

export const removeElementByIndex = <T>(list: T[], index: number): T[] => [
  ...list.slice(0, index),
  ...list.slice(index + 1),
];

export const insertElementIntoArray = <T>(
  list: T[],
  index: number,
  element: T
): T[] => [...list.slice(0, index), element, ...list.slice(index)];

export const useStateRef = <T>(
  initial: T
): [React.MutableRefObject<T>, (prop: T) => void] => {
  const [_state, _setState] = useState<T>(initial);
  const _stateRef = useRef<T>(_state);
  const setState = (p: T) => {
    _stateRef.current = p;
    _setState(p);
  };

  return [_stateRef, setState];
};
