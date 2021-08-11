// import { handlers } from './handler/index.js';

export const proxyToRaw = new WeakMap();
export const rawToProxy = new WeakMap();

export function isObject(val) {
  return typeof val === 'object' && val !== 'null';
}

export const hasOwnProperty = Object.prototype.hasOwnProperty;
