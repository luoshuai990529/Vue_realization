import { collectionHandlers } from './collections.js';
import { baseHandlers } from './base.js';

// 根据对象的类型 获取Proxy的handlers
export const handlers = new Map([
  [Map, collectionHandlers],
  [Set, collectionHandlers],
  [WeakMap, collectionHandlers],
  [WeakSet, collectionHandlers],
  [Object, baseHandlers],
  [Array, baseHandlers],
  [Int8Array, baseHandlers],
  [Uint8Array, baseHandlers],
  [Uint8ClampedArray, baseHandlers],
  [Int16Array, baseHandlers],
  [Uint16Array, baseHandlers],
  [Int32Array, baseHandlers],
  [Uint32Array, baseHandlers],
  [Float32Array, baseHandlers],
  [Float64Array, baseHandlers],
]);

/** 获取Proxy的handlers */
export function getHandlers(obj) {
  return handlers.get(obj.constructor);
}
