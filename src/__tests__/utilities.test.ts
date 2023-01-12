import { describe, expect, test } from "@jest/globals";

import { isPosInRect } from "../utilities";
import { TopHeight } from "../types";
import {
  removeItemFromTopHeightList,
  insertItemIntoTopHeightList,
  findInsertingIndexFromTopHeightList,
  minusTwoTopHeightList,
} from "../utilities";

describe("Test isPosInRect()", () => {
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

describe("Test the abstraction of list of notes", () => {
  let initialList: TopHeight[] = [];
  beforeEach(() => {
    initialList = [
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 304, height: 288 },
      { id: 2, top: 592, height: 168 },
    ];
  });
  test("removeItemFromTopHeightList(0)", () => {
    expect(removeItemFromTopHeightList(0, initialList)).toEqual([
      { id: 1, top: 160, height: 288 },
      { id: 2, top: 448, height: 168 },
    ]);
  });
  test("removeItemFromTopHeightList(1)", () => {
    expect(removeItemFromTopHeightList(1, initialList)).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 2, top: 304, height: 168 },
    ]);
  });

  test("insertItemIntoTopHeightList(0)", () => {
    expect(insertItemIntoTopHeightList(0, 200, 3, false, initialList)).toEqual([
      { id: 0, top: 360, height: 144 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
  });

  test("insertItemIntoTopHeightList(1)", () => {
    expect(insertItemIntoTopHeightList(1, 200, 3, false, initialList)).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
  });

  test("insertItemIntoTopHeightList(1, true)", () => {
    expect(insertItemIntoTopHeightList(1, 200, 3, true, initialList)).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 3, top: 304, height: 200 },
      { id: 1, top: 504, height: 288 },
      { id: 2, top: 792, height: 168 },
    ]);
  });

  test("insertItemIntoTopHeightList(10, true)", () => {
    expect(insertItemIntoTopHeightList(10, 200, 3, true, initialList)).toEqual([
      { id: 0, top: 160, height: 144 },
      { id: 1, top: 304, height: 288 },
      { id: 2, top: 592, height: 168 },
      { id: 3, top: 760, height: 200 },
    ]);
  });

  test("insertItemIntoTopHeightList(0, false, [])", () => {
    expect(insertItemIntoTopHeightList(0, 200, 0, false, [])).toEqual([]);
  });

  test("insertItemIntoTopHeightList(20, true, [])", () => {
    expect(insertItemIntoTopHeightList(20, 200, 0, true, [])).toEqual([
      { id: 0, top: 0, height: 200 },
    ]);
  });

  test("findInsertingIndex()=0", () => {
    expect(findInsertingIndexFromTopHeightList(50, 200, initialList)).toEqual(
      0
    );
  });

  test("findInsertingIndex()=2", () => {
    expect(findInsertingIndexFromTopHeightList(480, 144, initialList)).toEqual(
      2
    );
  });

  test("findInsertingIndex()=3", () => {
    expect(findInsertingIndexFromTopHeightList(650, 144, initialList)).toEqual(
      3
    );
  });

  test("findInsertingIndex()=-1", () => {
    expect(findInsertingIndexFromTopHeightList(650, 144, [])).toEqual(-1);
  });

  test("minusTwoTopHeightList(-100)", () => {
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
