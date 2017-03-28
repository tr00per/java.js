(function(global) {
"use strict";

const hidden = {
    magic : new Uint8Array([0xCA, 0xFE, 0xBA, 0xBE]),
    supportedVersion : new Uint8Array([0x00, 0x00, 0x00, 0x34]),

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

    checkMagic : function(binary) {
        let viewMagic = new Uint8Array(binary, 0, 4);
        return this.compareArrays(viewMagic, this.magic);
    },

    checkVersion : function(binary) {
        let viewVersion = new Uint8Array(binary, 4, 4);
        return this.compareArrays(viewVersion, this.supportedVersion);
    }
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
    if (hidden.checkMagic(binary)) {
        console.debug("It's a Java class!");
    }
    else {
        console.error("It's not a Java class - magic bytes do not match");
        return;
    }
    if (hidden.checkVersion(binary)) {
        console.debug("Detected supported class file format version")
    }
    else {
        console.warn("Detected unsupported class file format version")
    }

    let clazz = new Uint8Array(binary, 8);
    console.log(clazz);

    let constants = hidden.readConstants(binary);
    let meta = hidden.readMeta(binary, constants);
    let fields = hidden.readFields(binary, constants);
    let methods = hidden.readFields(binary, constants);
    let attributes = hidden.readAttributes(binary, constants);

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
