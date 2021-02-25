const CompilerUtil = {
    getValue: function (value, data) {
        const result = value.split('.').reduce((data, currentKey) => {
            // console.log(data,currentKey,data[currentKey]);
            return data[currentKey]
        }, data)
        return result
    },
    model: function (node, value, data) {
        node.value = this.getValue(value, data)
    },
    html: function (node, value, data) {
        node.innerHTML = this.getValue(value, data)
    },
    text: function (node, value, data) {
        node.innerText = this.getValue(value, data)
    },
    content: function (node, text, data) {
        let reg = /\{\{(.+?)\}\}/gi
        node.textContent = text.replace(reg, (...args) => {
            return data[args[1]]
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