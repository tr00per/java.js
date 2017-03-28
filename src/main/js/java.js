(function(global) {
"use strict";

let ConstantRef = function(type, idx) {
    this.type = type;
    this.idx = idx;
}

let CompositeConstantRef = function(type, idx1, idx2) {
    this.type = type;
    this.idx1 = idx1;
    this.idx2 = idx2;
}

let JavaClass = function(access, name, parent, interfaces, constants, attributes, fields, methods) {
    this.access = access;
    this.name = name;
    this.parent = parent;
    this.interfaces = interfaces;
    this.constants = constants;
    this.attributes = attributes;
    this.fields = fields;
    this.methods = methods;
}

const prv = {
    magic : 0xCAFEBABE,
    supportedVersion : [52, 0],

    u1 : function(arr, offset) {
        return arr[offset] >>> 0;
    },

    u2 : function(arr, offset) {
        return (arr[offset] << 8 >>> 0) + arr[offset + 1];
    },

    u4 : function(arr, offset) {
        return (arr[offset] << 24 >>> 0) + (arr[offset + 1] << 16) + (arr[offset + 2] << 8) + arr[offset + 3];
    },

    compareArrays : function(a, b) {
        if (a.length === undefined || b.length === undefined || !isFinite(a.length) || !isFinite(b.length)) {
            return false;
        }
        if (a.length !== b.length) {
            return false;
        }
        const length = a.length;
        for (let i = 0; i < length; ++i) {
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    },

    checkMagic : function(arr) {
        let magic = prv.u4(arr, 0);
        return magic === prv.magic;
    },

    checkVersion : function(arr) {
        let minor = prv.u2(arr, 4);
        let major = prv.u2(arr, 6);
        return this.compareArrays([major, minor], prv.supportedVersion);
    },

    validateClass : function(arr) {
        if (prv.checkMagic(arr)) {
            console.debug("It's a Java class!");
        }
        else {
            throw new Error("It's not a Java class - magic bytes do not match");
        }
        if (prv.checkVersion(arr)) {
            console.debug("Detected supported class file format version")
        }
        else {
            console.warn("Detected unsupported class file format version")
        }
    },

    readConstant : function(arr, offset) {
        let tag = prv.u1(arr, offset);
        offset += 1;

        switch (tag) {
            // Utf8
            case 1:
                let length = prv.u2(arr, offset);
                return [new StringView(arr, "UTF-8", offset + 2, length), length + 3 ]
                break;
            // Methodref
            case 10:
                return [new CompositeConstantRef("method", prv.u2(arr, offset), prv.u2(arr, offset + 2)), 5];
                break;
            // Fieldref
            case 9:
                return [new CompositeConstantRef("field", prv.u2(arr, offset), prv.u2(arr, offset + 2)), 5];
                break;
            // String
            case 8:
                return [new ConstantRef("string", prv.u2(arr, offset)), 3];
                break;
            // Class
            case 7:
                return [new ConstantRef("class", prv.u2(arr, offset)), 3];
                break;
            // NameAndType
            case 12:
                return [new CompositeConstantRef("name&type", prv.u2(arr, offset), prv.u2(arr, offset + 2)), 5];
                break;
            default:
                throw new Error("Unsupported tag: " + tag);
        }
    },

    readConstants : function(arr, base) {
        let size = prv.u2(arr, base);

        let offset = base + 2;
        let constants = [null];
        for (let i = 1; i < size; ++i) {
            var [constant, next] = prv.readConstant(arr, offset);
            constants.push(constant);
            offset += next;
        }
        return constants;
    }
}

let JavaJS = function() {
    this.classes = new Map();
}

JavaJS.prototype.register = function(javaClass) {
    if (this.classes.has(javaClass.name)) {
        return false;
    }

    this.classes.set(javaClass.name, javaClass);
    return true;
}

JavaJS.prototype.load = function(binary) {
    console.log(binary.byteLength);
    let clazz = new Uint8Array(binary);
    console.log(clazz);

    prv.validateClass(clazz);

    let constants = prv.readConstants(clazz, 8);
    let meta = prv.readMeta(binary, constants);
    let fields = prv.readFields(binary, constants);
    let methods = prv.readFields(binary, constants);
    let attributes = prv.readAttributes(binary, constants);

    let newClass = new JavaClass();
    if (this.register(newClass)) {
        console.info("Class", newClass, "registered");
    }
    else {
        console.warn("Class", newClass, "not registered");
    }
}

global.Java = new JavaJS();
})(window);
