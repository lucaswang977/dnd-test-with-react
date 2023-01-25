import { describe, test, expect, beforeEach } from "vitest";

import {
  insertElementIntoArray,
  isPosInRect,
  removeElementByIndex,
} from "../utilities";
import { TopHeight } from "../types";
import {
  removeItemFromTopHeightList,
  insertItemIntoTopHeightList,
  findInsertingIndexFromTopHeightList,
  minusTwoTopHeightList,
} from "../utilities";

describe("Testing array element insertion and deletion", () => {
  test("Insert an element into an array.", () => {
    expect(insertElementIntoArray([1, 2, 3], 2, 5)).toEqual([1, 2, 5, 3]);
    expect(insertElementIntoArray([1, 2, 3], 0, 5)).toEqual([5, 1, 2, 3]);
  });
  test("Delete an element from the array.", () => {
    expect(removeElementByIndex([1, 2, 3], 0)).toEqual([2, 3]);
    expect(removeElementByIndex([1, 2, 3], 1)).toEqual([1, 3]);
    expect(removeElementByIndex([1, 2, 3], 2)).toEqual([1, 2]);

    const arr = removeElementByIndex([1, 2, 3], 2);
    expect(insertElementIntoArray(arr, 2, 3)).toEqual([1, 2, 3]);
  });
});

describe("Testing isPosInRect()", () => {
  test("Inside the rect.", () => {
    expect(
      isPosInRect({ x: 100, y: 100 }, { x: 40, y: 40, width: 100, height: 200 })
    ).toBeTruthy();
  });
  test("Outside the rect.", () => {
    expect(
      isPosInRect({ x: 200, y: 200 }, { x: 40, y: 40, width: 100, height: 200 })
    ).toBeFalsy();
  });
});

describe("Testing the abstraction of list of notes", () => {
  let initialList: TopHeight[] = [];
  beforeEach(() => {
    initialList = [
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 304, height: 288 },
      { id: 2, top: 592, height: 168 },
    ];
  });
  test("removeItemFromTopHeightList", () => {
    expect(removeItemFromTopHeightList(0, initialList)).toEqual([
      { id: 1, top: 160, height: 288 },
      { id: 2, top: 448, height: 168 },
    ]);
    expect(removeItemFromTopHeightList(1, initialList)).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 2, top: 304, height: 168 },
    ]);
  });

  test("insertItemIntoTopHeightList(0)", () => {
    expect(
      insertItemIntoTopHeightList(0, 200, 3, false, initialList, 0)
    ).toEqual([
      { id: 0, top: 360, height: 144 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
    expect(
      insertItemIntoTopHeightList(1, 200, 3, false, initialList, 0)
    ).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
    expect(
      insertItemIntoTopHeightList(1, 200, 3, true, initialList, 0)
    ).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 3, top: 304, height: 200 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
    expect(
      insertItemIntoTopHeightList(10, 200, 3, true, initialList, 0)
    ).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 304, height: 288 },
      { id: 2, top: 592, height: 168 },
      { id: 3, top: 760, height: 200 },
    ]);
    expect(insertItemIntoTopHeightList(0, 200, 0, false, [], 0)).toEqual([]);
    expect(insertItemIntoTopHeightList(20, 200, 0, true, [], 160)).toEqual([
      { id: 0, top: 160, height: 200 },
    ]);
  });

  test("findInsertingIndex()", () => {
    expect(findInsertingIndexFromTopHeightList(50, initialList)).toEqual(0);
    expect(findInsertingIndexFromTopHeightList(480, initialList)).toEqual(2);
    expect(findInsertingIndexFromTopHeightList(650, initialList)).toEqual(2);
    expect(findInsertingIndexFromTopHeightList(750, initialList)).toEqual(3);
    expect(findInsertingIndexFromTopHeightList(650, [])).toEqual(0);
  });

  test("minusTwoTopHeightList()", () => {
    const newList = initialList.map((i) => {
      return { ...i };
    });

    newList[1].top = newList[1].top - 100;

    expect(minusTwoTopHeightList(initialList, newList)).toEqual([
      { id: 0, delta: 0 },
      { id: 1, delta: -100 },
      { id: 2, delta: 0 },
    ]);
  });

  test("minusTwoTopHeightList(100)", () => {
    const newList = initialList.map((i) => {
      return { ...i };
    });

    newList[1].top = newList[1].top - 100;

    expect(minusTwoTopHeightList(newList, initialList)).toEqual([
      { id: 0, delta: 0 },
      { id: 1, delta: 100 },
      { id: 2, delta: 0 },
    ]);
  });
});
