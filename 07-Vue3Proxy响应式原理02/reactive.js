import { proxyToRaw, rawToProxy } from './internals.js';
import { getHandlers } from './handler/index.js';
import { storeObservable } from './store.js';

export function reactive(raw) {
  // 已经被定义成响应式proxy了 或者传入的是内置对象 就直接原封不动的返回
  if (proxyToRaw.has(raw)) {
    return raw;
  }

  // 如果这个原始对象已经被定义过响应式 就返回存储的响应式proxy
  const existProxy = rawToProxy.get(raw);
  if (existProxy) {
    return existProxy;
  }

  // 新建响应式proxy
  return createReactive(raw);
}

function createReactive(raw) {
  const reactive = new Proxy(raw, getHandlers(raw));

  // 双向存储原始值和响应式proxy的映射
  rawToProxy.set(raw, reactive);
  proxyToRaw.set(reactive, raw);

  // 建立一个映射
  // 原始值 -> 存储这个原始值的各个key收集到的依赖函数的Map
  storeObservable(raw);

  // 返回响应式proxy
  return reactive;
}

export function raw(proxy) {
  return proxyToRaw.get(proxy);
}
