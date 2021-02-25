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
    content: function (node, text, data) {
        let reg = /\{\{(.+?)\}\}/gi
        /* 
        你可以指定一个函数作为第二个参数。在这种情况下，当匹配执行后，该函数就会执行。 函数的返回值作为替换字符串。
        另外要注意的是，如果第一个参数是正则表达式，并且其为全局匹配模式，那么这个方法将被多次调用，每次匹配都会被调用。
        */
        node.textContent = text.replace(reg, (...args) => {
            new Watcher(data, args[1], (newValue, oldValue) => {
                // console.log(newValue,args[1]);
                node.textContent = this.getContent(text, data)
            })
            return this.getValue(args[1], data)
        })
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
        // 编译渲染指定区域
        if (this.$el) {
            new Observe(this.$data)
            new Compiler(this)
        }
    }
    isElement(node) {
        // 判断是否是元素节点
        return node.nodeType === 1
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
                const [v, directive] = name.split('-')
                CompilerUtil[directive](node, value, this.vm.$data)
            }
        })
    }
    buildText(node) {
        let reg = /\{\{.+?\}\}/gi;
        const text = node.textContent
        if (reg.test(text)) {
            CompilerUtil['content'](node, text, this.vm.$data)
        }
    }
}

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
                    console.log(`监听到${key}属性的变化 更新UI`);
                    dep.notify()
                }
            },
        });
    }
}
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
// 先定义一个观察者类Watcher，再定义一个发布订阅类Subscribe，然后再通过发布订阅的类来管理观察者类
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
            console.log('新值newValue：',newValue,'旧值：',this.oldValue);
            this.cb(newValue, this.oldValue)
            this.oldValue = this.getOldValue()
        }
    }
}
