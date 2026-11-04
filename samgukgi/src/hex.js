// 헥스 좌표계: 뾰족한 위(pointy-top), 홀수 행 오른쪽 밀기(odd-r offset).
// 저장은 (col,row) 오프셋, 계산은 큐브 좌표로 한다.

const SQRT3 = Math.sqrt(3);
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

export function toCube(col, row) {
  const q = col - (row - (row & 1)) / 2;
  return { q, r: row, s: -q - row };
}

export function fromCube(q, r) {
  return { col: q + (r - (r & 1)) / 2, row: r };
}

export function neighbors(col, row) {
  const { q, r } = toCube(col, row);
  return DIRS.map(([dq, dr]) => fromCube(q + dq, r + dr));
}

export function distance(a, b) {
  const A = toCube(a.col, a.row);
  const B = toCube(b.col, b.row);
  return Math.max(Math.abs(A.q - B.q), Math.abs(A.r - B.r), Math.abs(A.s - B.s));
}

export function toPixel(col, row, size) {
  return { x: size * SQRT3 * (col + 0.5 * (row & 1)), y: size * 1.5 * row };
}

export function key(col, row) {
  return `${col},${row}`;
}
