import { runReactionWrap } from './reaction.js';
import { releaseReaction } from './store.js';

const IS_REACTION = Symbol('is reaction');

/**
 * 观察函数
 * 在传入的函数里去访问响应式的proxy 会收集传入的函数作为依赖
 * 下次访问的key发生变化的时候 就会重新运行这个函数
 */
export function observe(fn) {
  if (fn[IS_REACTION]) {
    return fn;
  }

  // reaction是包装了原始函数只后的观察函数
  // 在runReactionWrap的上下文中执行原始函数 可以收集到依赖。
  const reaction = (...args) => {
    return runReactionWrap(reaction, fn, this, args);
  };

  // 先执行一遍reaction
  reaction();

  // 返回出去 让外部也可以手动调用
  return reaction;
}

/** 停止观察函数 */
export function unobserve(reaction) {
  if (!reaction.unobserved) {
    reaction.unobserved = true;
    releaseReaction(reaction);
  }
}
