let CompilerUtil = {
    getValue(vm, value){
        // time.h --> [time, h]
       return value.split('.').reduce((data, currentKey) => {
            // 第一次执行: data=$data, currentKey=time
            // 第二次执行: data=time, currentKey=h
            return data[currentKey.trim()];
        }, vm.$data);
    },
    getContent(vm, value){
        // console.log(value); //  {{name}}-{{age}} -> 李南江-{{age}}  -> 李南江-33
        let reg = /\{\{(.+?)\}\}/gi;
        let val = value.replace(reg, (...args) => {
            // 第一次执行 args[1] = name
            // 第二次执行 args[1] = age
            // console.log(args);
            return this.getValue(vm, args[1]); // 李南江, 33
        });
        // console.log(val);
        return val;
    },
    setValue(vm, attr, newValue){
        attr.split('.').reduce((data, currentAttr, index, arr)=>{
            if(index === arr.length - 1){
                data[currentAttr] = newValue;
            }
            return data[currentAttr];
        }, vm.$data)
    },
    model: function (node, value, vm) { // value=name  value=time.h
        // 第二步: 在第一次渲染的时候, 就给所有的属性添加观察者
        new Watcher(vm, value, (newValue, oldValue)=>{
            node.value = newValue;
            // debugger;
        });
        let val = this.getValue(vm, value);
        node.value = val;

        node.addEventListener('input', (e)=>{
            let newValue = e.target.value;
            this.setValue(vm, value, newValue);
        })
    },
    html: function (node, value, vm) {
        new Watcher(vm, value, (newValue, oldValue)=>{
            node.innerHTML = newValue;
            // debugger;
        });
        let val = this.getValue(vm, value);
        node.innerHTML = val;
    },
    text: function (node, value, vm) {
        new Watcher(vm, value, (newValue, oldValue)=>{
            node.innerText = newValue;
            // debugger;
        });
        let val = this.getValue(vm, value);
        node.innerText = val;
    },
    content: function (node, value, vm) {
        let reg = /\{\{(.+?)\}\}/gi;
        // 外层是为了拿到属性名称
        let val = value.replace(reg, (...args)=>{
            // 内层是为了保证数据完整性
            new Watcher(vm, args[1], (newValue, oldValue)=>{
                node.textContent = this.getContent(vm, value);
            });
            return this.getValue(vm, args[1]);
        });
        node.textContent = val;
    },
    on: function (node, value, vm, type) {
        node.addEventListener(type, (e)=>{
            // alert('事件注册成功了');
            vm.$methods[value].call(vm, e);
        })
    }
}
class MyVue {
    constructor(options){
        // 1.保存创建时候传递过来的数据
        if(this.isElement(options.el)){
            this.$el = options.el;
        }else{
            this.$el = document.querySelector(options.el);
        }
        this.$data = options.data;
        this.proxyData();
        this.$methods = options.methods;
        this.$computed = options.computed;
        // 将computed中的方法添加到$data中,
        // 只有这样将来我们在渲染的时候才能从$data中获取到computed中定义的计算属性
        this.computed2data();
        // 2.根据指定的区域和数据去编译渲染界面
        if(this.$el){
            // 第一步: 给外界传入的所有数据都添加get/set方法
            //         这样就可以监听数据的变化了
            new Observer(this.$data);
            new Compiler(this);
        }
    }
    computed2data(){
        for(let key in this.$computed){
            Object.defineProperty(this.$data, key, {
                get:()=>{
                    return this.$computed[key].call(this)
                }
            })
        }
    }
    // 实现数据代理, 将$data上的数据添加到Vue实例上, 这样将来才能通过this.xxx直接获取数据
    proxyData(){
        for(let key in this.$data){
            Object.defineProperty(this, key, {
                get: () => {
                    return this.$data[key]
                }
            })
        }
    }
    // 判断是否是一个元素
    isElement(node){
        return node.nodeType === 1;
    }
}
class Compiler {
    constructor(vm){
        this.vm = vm;
        // 1.将网页上的元素放到内存中
        let fragment = this.node2fragment(this.vm.$el);
        // 2.利用指定的数据编译内存中的元素
        this.buildTemplate(fragment);
        // 3.将编译好的内容重新渲染会网页上
        this.vm.$el.appendChild(fragment);
    }
    node2fragment(app){
        // 1.创建一个空的文档碎片对象
        let fragment = document.createDocumentFragment();
        // 2.编译循环取到每一个元素
        let node = app.firstChild;
        while (node){
            // 注意点: 只要将元素添加到了文档碎片对象中, 那么这个元素就会自动从网页上消失
            fragment.appendChild(node);
            node = app.firstChild;
        }
        // 3.返回存储了所有元素的文档碎片对象
        return fragment;
    }
    buildTemplate(fragment){
        let nodeList = [...fragment.childNodes];
        nodeList.forEach(node=>{
            // 需要判断当前遍历到的节点是一个元素还是一个文本
            if(this.vm.isElement(node)){
                // 是一个元素
                this.buildElement(node);
                // 处理子元素(处理后代)
                this.buildTemplate(node);
            }else{
                // 不是一个元素
                this.buildText(node);
            }
        })
    }
    buildElement(node){
        let attrs = [...node.attributes];
        attrs.forEach(attr => {
            /*
            v-model='name': name=v-mode / value=name
            v-on:click="myFn": name=v-on:click / value=myFn
            * */
            let {name, value} = attr;
            // console.log(name, value);
            if(name.startsWith('v-')){
                let [directiveName, directiveType] = name.split(':'); // [v-on, click]
                let [_, directive] = directiveName.split('-'); // [v, on]
                CompilerUtil[directive](node, value, this.vm, directiveType);
            }
        })
    }
    buildText(node){
        let content = node.textContent;
        let reg = /\{\{.+?\}\}/gi;
        if(reg.test(content)){
            CompilerUtil['content'](node, content, this.vm);
        }
    }
}
class Observer{
    // 只要将需要监听的那个对象传递给Observer这个类
    // 这个类就可以快速的给传入的对象的所有属性都添加get/set方法
    constructor(data){
        this.observer(data);
    }
    observer(obj){
        if(obj && typeof obj === 'object'){
            // 遍历取出传入对象的所有属性, 给遍历到的属性都增加get/set方法
            for(let key in obj){
                this.defineRecative(obj, key, obj[key])
            }
        }
    }
    // obj: 需要操作的对象
    // attr: 需要新增get/set方法的属性
    // value: 需要新增get/set方法属性的取值
    defineRecative(obj, attr, value){
        // 如果属性的取值又是一个对象, 那么也需要给这个对象的所有属性添加get/set方法
        this.observer(value);
        // 第三步: 将当前属性的所有观察者对象都放到当前属性的发布订阅对象中管理起来
        let dep = new Dep(); // 创建了属于当前属性的发布订阅对象
        Object.defineProperty(obj, attr, {
            get(){
                Dep.target && dep.addSub(Dep.target);
                // debugger;
                return value;
            },
            set:(newValue)=>{
                if(value !== newValue){
                    // 如果给属性赋值的新值又是一个对象, 那么也需要给这个对象的所有属性添加get/set方法
                    this.observer(newValue);
                    value = newValue;
                    dep.notify();
                    console.log('监听到数据的变化, 需要去更新UI');
                }
            }
        })
    }
}
// 想要实现数据变化之后更新UI界面, 我们可以使用发布订阅模式来实现
// 先定义一个观察者类, 再定义一个发布订阅类, 然后再通过发布订阅的类来管理观察者类
class Dep {
    constructor(){
        // 这个数组就是专门用于管理某个属性所有的观察者对象的
        this.subs = [];
    }
    // 订阅观察的方法
    addSub(watcher){
        this.subs.push(watcher);
    }
    // 发布订阅的方法
    notify(){
        this.subs.forEach(watcher=>watcher.update());
    }
}
class Watcher {
    constructor(vm, attr, cb){
        this.vm = vm;
        this.attr = attr;
        this.cb = cb;
        // 在创建观察者对象的时候就去获取当前的旧值
        this.oldValue = this.getOldValue();
    }
    getOldValue(){
        Dep.target = this;
        let oldValue = CompilerUtil.getValue(this.vm, this.attr);
        Dep.target = null;
        return oldValue;
    }
    // 定义一个更新的方法, 用于判断新值和旧值是否相同
    update(){
        let newValue = CompilerUtil.getValue(this.vm, this.attr);
        if(this.oldValue !== newValue){
            this.cb(newValue, this.oldValue);
            this.oldValue = this.getOldValue()
        }
    }
}