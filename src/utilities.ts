export type TopHeight = { id: number; top: number; height: number };

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
  items: TopHeight[]
): TopHeight[] => {
  if (!items) return items;

  if (index < 0) index = 0;
  if (index > items.length) index = items.length;

  let newItems: TopHeight[] = [];
  let insertedTop = 0;
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
// Return -1 if parameters are invalid or not found
export const findInsertingIndexFromTopHeightList = (
  top: number,
  height: number,
  items: TopHeight[]
): number => {
  if (!items || items.length === 0) return -1;

  const y = top + height / 2;
  let index = undefined;
  const bottom = items[items.length - 1].top + items[items.length - 1].height;

  index = items.findIndex((item) => y < item.top + item.height / 2);

  if (index < 0 && y < bottom) index = items.length;

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
