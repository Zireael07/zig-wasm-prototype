// game.js - load the WASM, display the game, update the engine

let console_log_buffer = "";
//let memory = null; //hack for decodeString to work
//let allocUint8 = null;

//based on https://github.com/daneelsan/zig-wasm-logger/blob/master/script.js
let wasm = {
    instance: undefined,

    init: function (obj) {
        this.instance = obj.instance;
    },
    decodeString: function(pointer, length){
        const memory = this.instance.exports.memory;
        const slice = new Uint8Array(
            memory.buffer,
            pointer,
            length
          )
          return new TextDecoder().decode(slice)
    },
    encodeString: function(string){
        const bytes = new TextEncoder().encode(string)
        const len = bytes.byteLength
        //this can potentially invalidate the memory buffer
        const ptr = this.instance.exports.allocString(len) // ask Zig to allocate memory
        // console.log("Pointer hex: ", "0x"+ptr.toString(16)); //since it's a pointer, no negative values are possible
        //..so we have to always do new/recreate here
        const view = this.getMemory()
        view.subarray(ptr, ptr + len).set(bytes)

        return ptr
    },
    getMemory: function () {
        const memory = this.instance.exports.memory
        if (
            this.wasmMemory === undefined ||
            this.wasmMemory !== memory.buffer
        ) {
            this.wasmMemory = new Uint8Array(memory.buffer)
        }
        return this.wasmMemory
    },
    encodeBytes: function(){
        var input = new Uint8Array([1, 2, 3, 4, 5]);
        const length = input.byteLength;
        var bytes = new Uint8Array(length+1);
        // make the first entry encode length
        bytes[0] = length;
        bytes.set(input, 1);
        console.log(bytes);
        const ptr = this.instance.exports.alloc(length+1); //ask Zig to allocate

        const view = this.getMemory()
        view.subarray(ptr, ptr + length+1).set(bytes) //begin is inclusive, end is exclusive
        //this.u8a(ptr + this.LENGTH_WIDTH, length).set(bytes);
        console.log("Pointer hex: ", "0x"+ptr.toString(16)); //since it's a pointer, no negative values are possible
        return ptr;
    }
}

//any JS functions we want to expose to WASM go here
var envObject = { env: {
    //initialize memory here
    memoryBase: 0,
    tableBase: 0,
    memory: new WebAssembly.Memory({ initial: 512 }),
    _throwError(pointer, length) {
        const message = wasm.decodeString(pointer, length)
        throw new Error(message)
    },
    jsConsoleLogWrite: function (ptr, len) {
        console_log_buffer += wasm.decodeString(ptr, len);
    },
    jsConsoleLogFlush: function () {
        console.log(console_log_buffer);
        console_log_buffer = "";
    },
    jsAskForString: function(ptr, len) {
        return wasm.decodeString(ptr, len);
    }
} };

//those will hold App and its state
//App is WASM exports which is immutable, hence separate AppState
var App = {
};

var AppState = {
    'loaded': false,
    'running': false,
};

async function bootstrap() {
    

    wasm.init(await WebAssembly.instantiateStreaming(fetch("game.wasm"), envObject));
    
    //.then(result => {
    if (wasm != null){ 
    console.log("Loaded the WASM!");
    //App = wasm.instance.exports;
    console.log(wasm);
    AppState.loaded = true;
    AppState.running = true;
    //App.init();
    wasm.instance.exports.main(); // begin

    document.getElementById("1").onclick = function(){
        if (wasm != null) {
            var str = wasm.encodeString("test")
            console.log(str)
            wasm.instance.exports.update(str)
            //test
            var arr_ptr = wasm.encodeBytes();
            wasm.instance.exports.sumArray(arr_ptr)
        }
    }
    
    document.getElementById("2").onclick = function(){
        if (wasm != null){
            var str = wasm.encodeString("other")
            console.log(str)
            wasm.instance.exports.update(str)
        }
    }

    } //);
}

window.document.body.onload = function() {
   bootstrap()
};

