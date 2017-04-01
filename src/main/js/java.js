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

let JavaField = function(access, name, descriptor, attributes) {
    this.access = access;
    this.name = name;
    this.descriptor = descriptor;
    this.attributes = attributes;
}

let JavaMethod = function(access, name, descriptor, attributes) {
    this.access = access;
    this.name = name;
    this.descriptor = descriptor;
    this.attributes = attributes;
}

let JavaClass = function(access, name, parent, interfaces, constants, fields, methods, attributes) {
    this.access = access;
    this.name = name;
    this.parent = parent;
    this.interfaces = interfaces;
    this.constants = constants;
    this.fields = fields;
    this.methods = methods;
    this.attributes = attributes;
}

const prv = {
    magic : 0xCAFEBABE,
    supportedVersion : [52, 0],

    u1 : function(arr, offset) {
        return arr[offset] >>> 0;
    },

    u2 : function(arr, offset) {
        return (arr[offset] << 8 >>> 0) + (arr[offset + 1] >>> 0);
    },

    u4 : function(arr, offset) {
        return (arr[offset] << 24 >>> 0) + (arr[offset + 1] << 16 >>> 0) + (arr[offset + 2] << 8 >>> 0) + (arr[offset + 3] >>> 0);
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

    readMultiple : function(arr, base, entryReader, seed) {
        let size = prv.u2(arr, base);
        let offset = base + 2;
        let entries = seed === undefined ? [] : seed;
        for (let i = entries.length; i < size; ++i) {
            var [entry, next] = entryReader(arr, offset);
            entries.push(entry);
            offset += next;
        }
        return [entries, offset];
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
        return prv.readMultiple(arr, base, prv.readConstant, [null]);
    },

    readMeta : function(arr, base) {
        let offset = base;
        let meta = {};
        meta.access = prv.u2(arr, offset);
        meta.name = new ConstantRef("this", prv.u2(arr, offset + 2))
        meta.parent = new ConstantRef("super", prv.u2(arr, offset + 4))
        let [interfaces, lastOffset] = prv.readInterfaces(arr, offset + 6);
        meta.interfaces = interfaces;
        return [meta, lastOffset];
    },

    readInterface : function(arr, base) {
        return [new ConstantRef("interface", prv.u2(arr, base)), 2];
    },

    readInterfaces : function(arr, base) {
        return prv.readMultiple(arr, base, prv.readInterface);
    },

    readFieldOrMethod : function(Factory) {
        return function(arr, base) {
            let access = prv.u2(arr, base);
            let name = new ConstantRef("name", prv.u2(arr, base + 2));
            let descriptor = new ConstantRef("name", prv.u2(arr, base + 4));
            let [attributes, lastOffset] = prv.readAttributes(arr, base + 6);
            let field = new Factory(access, name, descriptor, attributes);
            return [field, lastOffset - base];
        }
    },

    readFields : function(arr, base) {
        return prv.readMultiple(arr, base, prv.readFieldOrMethod(JavaField));
    },

    readMethods : function(arr, base) {
        return prv.readMultiple(arr, base, prv.readFieldOrMethod(JavaMethod));
    },

    readAttribute : function(arr, base) {
        let name = prv.u2(arr, base);
        let size = prv.u4(arr, base + 2);
        console.info("readAttribute", base, size + 6);
        return [{}, size + 6];
    },

    readAttributes : function(arr, base) {
        return prv.readMultiple(arr, base, prv.readAttribute);
    },
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
    console.log("Read:", binary.byteLength);
    let clazz = new Uint8Array(binary);
    console.log(clazz);

    prv.validateClass(clazz);

    let constantsOffset = 8;
    let [constants, metaOffset] = prv.readConstants(clazz, constantsOffset);
    let [meta, fieldsOffset] = prv.readMeta(clazz, metaOffset);
    let [fields, methodsOffset] = prv.readFields(clazz, fieldsOffset);
    let [methods, attribsOffset] = prv.readMethods(clazz, methodsOffset);
    let [attributes, end] = prv.readAttributes(clazz, attribsOffset);

    if (end !== binary.byteLength) {
        console.warn("Class binary was not fully consumed");
    }

    let newClass = new JavaClass(meta.access, meta.name, meta.parent, meta.interfaces, constants, fields, methods, attributes);
    if (this.register(newClass)) {
        console.info("Class", newClass, "registered");
    }
    else {
        console.warn("Class", newClass, "not registered");
    }
}

global.Java = new JavaJS();
})(window);
