let uid = 0;
let count = 0
class Dep {
    constructor() {
        this.id = uid++
        this.deps = []
    }
    addDeps(watcher, key) {
        this.deps.push({ key, watcher })
    }
    depend(key) {
        for (let i = 0; i < this.deps.length; i++) {
            // 防止添加重复依赖
            if (this.deps[i].key == `${key}_${Dep.target.getter.name}`) {
                return
            }
        }
        if (Dep.target) {
            Dep.target.addDeps(this, key)
        }
    }
    notify(watcher) {
        console.log('1-执行dep的notify方法，调用watcher的更新');
        watcher.update()
    }
}
let cdep = new Dep()
const CompilerUtil = {
    getValue(value, data) {
        const result = value.split('.').reduce((data, currentKey) => {
            // console.log(data,currentKey,data[currentKey]);
            return data[currentKey.trim()]
        }, data)
        return result
    },
    getContent(value, data) {
        // console.log(value); //  {{name}}-{{age}} -> 李南江-{{age}}  -> 李南江-33
        let reg = /\{\{(.+?)\}\}/gi;
        let result = value.replace(reg, (...args) => {
            // 第一次执行 args[1] = name
            // 第二次执行 args[1] = age
            return this.getValue(args[1], data);
        });
        return result;
    },
    setValue(inputVal, attr, data) {
        attr.split('.').reduce((data, currentKey, index, arr) => {
            // console.log('当前index：', index, '数组长度：', arr.length);
            if (index === arr.length - 1) {
                // 取到最后一层才赋值
                data[currentKey] = inputVal;
            }
            // 下一次循环的data就是 return出去的
            return data[currentKey]
        }, data)
    },
    model: function (node, value, data) {
        new Watcher(data, value, (newValue, oldValue) => {
            node.value = newValue
        })
        node.value = this.getValue(value, data)
        node.addEventListener('input', (e) => {
            let inputVal = e.target.value;
            this.setValue(inputVal, value, data)
        })
    },
    html: function (node, value, data) {
        new Watcher(data, value, (newValue, oldValue) => {
            node.innerHTML = newValue
        })
        node.innerHTML = this.getValue(value, data)
    },
    text: function (node, value, data) {
        new Watcher(data, value, (newValue, oldValue) => {
            node.innerText = newValue
        })
        node.innerText = this.getValue(value, data)
    },
    content: function (node, text, data, vm) {
        let reg = /\{\{(.+?)\}\}/gi
        /* 
        你可以指定一个函数作为第二个参数。在这种情况下，当匹配执行后，该函数就会执行。 函数的返回值作为替换字符串。
        另外要注意的是，如果第一个参数是正则表达式，并且其为全局匹配模式，那么这个方法将被多次调用，每次匹配都会被调用。
        */
        node.textContent = text.replace(reg, (...args) => {
            new Watcher(data, args[1], (newValue, oldValue) => {
                node.textContent = this.getContent(text, data)
            })
            return this.getValue(args[1], data) ? this.getValue(args[1], data) : this.getComputedVal(args[1], vm, node)
        })
    },
    on: function (node, value, data, directiveType, vm) {
        node.addEventListener(directiveType, (e) => {
            vm.$methods[value].call(vm, e)
        })
    },
    getComputedVal: function (name, vm, node) {
        cdep.deps.forEach((item, index) => {
            if (item.watcher.getter.name == name) {
                item.watcher.nodeList.push({ key: item.key, node })
                console.log('=====模板编译到计算属性添加node节点到watcher', node, item.watcher.nodeList);
            }
        })
        let value = vm[name]
        return value
    }
}
class MyVue {
    constructor(options) {
        // 挂载 el 和 data
        if (this.isElement(options.el)) {
            this.$el = options.el
        } else {
            this.$el = document.querySelector(options.el)
        }
        this.$data = options.data
        this.$methods = options.methods
        this.$computed = options.computed
        this.proxyMethod()//把方法代理到data
        this.proxyData() //把data代理到vue实例
        this.initComputed() //初始化计算属性
        // this.proxyComputed()

        // this.proxyComputed()
        // 编译渲染指定区域
        if (this.$el) {
            new Observe(this.$data)
            new Compiler(this)
            count++
        }
    }
    isElement(node) {
        // 判断是否是元素节点
        return node.nodeType === 1
    }
    proxyData() {
        for (const key in this.$data) {
            Object.defineProperty(this, key, {
                get() {
                    // 如果get方法被触发了 就证明在方法或者 计算属性中调用了该值
                    Dep.target && cdep.depend(key)
                    console.log('2-获取对应依赖：', key, cdep.deps, cdep);
                    return this.$data[key]
                },
                set(newValue) {
                    this.$data[key] = newValue
                }
            })
        }
    }
    proxyMethod() {
        for (const key in this.$methods) {
            Object.defineProperty(this.$data, key, {
                get: () => {
                    return this.$methods[key].call(this)
                }
            })
        }
    }
    initComputed() {
        const watchers = this.computedWatchers = {}
        for (const key in this.$computed) {
            const userDef = this.$computed[key]
            const getter = userDef
			// 初始化计算属性dirty
            watchers[key] = new ComputedWatcher(this, getter, { lazy: false })
            console.log('初始化计算属性实例：', watchers[key], key,);
            this.defineComputed(this, key, userDef)
        }
    }
    defineComputed(vm, key, userDef) {
        let sharedProperty = {}
        if (typeof userDef === 'function') {
            sharedProperty.get = this.createComputedGetter(key)
        }
		// 只要调用了key 即计算属性方法 则会出发sharedProperty.get
		Object.defineProperty(vm, key, sharedProperty)
    }
    createComputedGetter(key) {
        return function computedGetter() {
			console.log('this.computedWatchers----',this.computedWatchers);
            var watcher = this.computedWatchers && this.computedWatchers[key];
            if (watcher) {
                console.log('该计算属性getter触发，watcher：', watcher);
                if (watcher.dirty) {
                    watcher.evaluate();
                }
                // if (Dep.target) {
                //     watcher.depend();
                // }
                return watcher.value
            }
        }
    }
}

class Compiler {
    constructor(vm) {
        this.vm = vm
        // 1.将节点添加至内存
        let fragment = this.eleToFragment(this.vm.$el)
        // 2.编译内存中的节点元素
        this.buildTemplate(fragment)
        // 3.将编译好的节点元素添加到页面
        this.vm.$el.appendChild(fragment)
    }
    eleToFragment(el) {
        let node = el.firstChild
        let Fragment = document.createDocumentFragment()
        while (node) {
            Fragment.appendChild(node)
            node = el.firstChild
        }
        return Fragment
    }
    buildTemplate(fragment) {
        let nodeList = [...fragment.childNodes]
        nodeList.forEach(node => {
            if (this.vm.isElement(node)) {
                // 是元素节点
                this.buildEle(node)
                this.buildTemplate(node)
            } else {
                // 不是元素节点
                this.buildText(node)
            }
        })
    }
    buildEle(node) {
        let attrs = [...node.attributes]
        attrs.forEach(attr => {
            const { name, value } = attr
            if (name.startsWith('v-')) {
                const [directiveName, directiveType] = name.split(':')
                const [_, directive] = directiveName.split('-')
                CompilerUtil[directive](node, value, this.vm.$data, directiveType, this.vm)
            }
        })
    }
    buildText(node) {
        let reg = /\{\{.+?\}\}/gi;
        const text = node.textContent
        if (reg.test(text)) {
            CompilerUtil['content'](node, text, this.vm.$data, this.vm)
        }
    }
}
// 监听data的类
class Observe {
    constructor(data) {
        this.observer(data);
    }
    observer(obj) {
        if (obj && typeof obj === "object") {
            for (const key in obj) {
                this.defineReactive(obj, key, obj[key]);
            }
        }
    }
    defineReactive(obj, key, value) {
        this.observer(value)
        let dep = new Subscribe()
        Object.defineProperty(obj, key, {
            get() {
                Subscribe.target && dep.addSub(Subscribe.target)
                return value;
            },
            set: (newVal) => {
                if (newVal !== value) {
                    this.observer(newVal);
                    value = newVal;
                    console.log(`监听到${key}属性的变化 更新UI---deps:`, cdep.deps);
                    cdep.deps.forEach(dep => {
                        const { key: dkey, watcher } = dep
                        if (dkey.startsWith(key)) {
                            cdep.notify(watcher)
                        }
                    })
                    dep.notify()
                }
            },
        });
    }
}
// 发布订阅者
class Subscribe {
    constructor() {
        this.subs = []
    }
    addSub(watcher) {
        if (watcher) {
            this.subs.push(watcher)
        }
    }
    notify() {
        this.subs.forEach(sub => { sub.update() })
    }
}
// 想要实现数据变化之后更新UI界面，可以使用发布订阅模式来实现
// 观察者
class Watcher {
    constructor(data, attr, cb) {
        this.data = data;
        this.attr = attr;
        this.cb = cb;
        this.oldValue = this.getOldValue()
    }
    getOldValue() {
        Subscribe.target = this;
        const result = CompilerUtil.getValue(this.attr, this.data)
        Subscribe.target = null;
        return result
    }
    // 定义一个更新的方法, 用于判断新值和旧值是否相同
    update() {
        let newValue = CompilerUtil.getValue(this.attr, this.data)
        if (newValue !== this.oldValue) {
            // console.log('新值newValue：',newValue,'旧值：',this.oldValue);
            this.cb(newValue, this.oldValue)
            this.oldValue = this.getOldValue()
        }
    }
}

// computed 观察者
class ComputedWatcher {
    constructor(vm, getter, options, cb) {
        this.vm = vm
        this.getter = getter
        this.lazy = options.lazy
        this.dirty = this.lazy
        this.cb = cb
        this.deps = []
        this.nodeList = []
        this.newDeps = [];
        this.depIds = new Set();
        this.newDepIds = new Set();
        this.value = this.lazy ? undefined : this.get()
    }
    get() {
        pushTarget(this)
        let value;
        let vm = this.vm
        value = this.getter.call(vm, vm)
        // popTarget();
        this.dirty = false;
        // this.cleanupDeps();
        console.log('3-调用watcher的get方法，计算得到value的值', value);
        return value
    }
    // 添加一个watcher依赖到这个指令
    addDeps(dep, key) {
        dep.addDeps(this, `${key}_${this.getter.name}`);
    }
   
    // Will be called when a dependency changes.
    update() {
        console.log('2-依赖发生改变，重新计算值，并更新node节点', this);
        this.dirty = true
        if (this.dirty) {
            this.evaluate()
            this.nodeList.forEach(item => {
                item.node.textContent = this.value
            })
        }
    }
    // Evaluate the value of the watcher. This only gets called for lazy watchers.
    evaluate() {
        console.log('evaluate方法：计算watcher的值，修改dirty为false表示计算过');
        this.value = this.get()
        this.dirty = false //表示取过值了
    }
}




// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null;
let targetStack = []
function pushTarget(target) {
    console.log('1-执行pushTarget，给Dep.target赋值watcher', target);
    targetStack.push(target);
    Dep.target = target
}
// function popTarget() {
//     targetStack.pop()
//     Dep.target = targetStack[targetStack.length - 1]
// }
