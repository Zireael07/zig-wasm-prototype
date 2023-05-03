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
        //const memory = this.instance.exports.memory;
        const bytes = new TextEncoder().encode(string);
        //console.log("len: ", buffer.length);
        //this can potentially invalidate the memory buffer
        const pointer = this.instance.exports.allocUint8(bytes.length + 1); // ask Zig to allocate memory
        console.log("Pointer hex: ", "0x"+pointer.toString(16)); //since it's a pointer, no negative values are possible
        //..so we have to always do new/recreate here
        var buffer_view = new Uint8Array(
          this.instance.exports.memory.buffer, // memory exported from Zig
          pointer,
          bytes.length + 1
        );
        buffer_view.set(bytes);
        buffer_view[bytes.length] = 0; // null byte to null-terminate the string
        console.log(buffer_view);
        //console.log(pointer);
        return pointer;
    }
}

//any JS functions we want to expose to WASM go here
var envObject = { env: {
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

//based on https://blog.battlefy.com/zig-made-it-easy-to-pass-strings-back-and-forth-with-webassembly
// const decodeString = (pointer, length) => {
//     const slice = new Uint8Array(
//       memory.buffer,
//       pointer,
//       length
//     )
//     return new TextDecoder().decode(slice)
//   }

// const encodeString = (string) => {
//     const buffer = new TextEncoder().encode(string);
//     //console.log("len: ", buffer.length);
//     const pointer = allocUint8(buffer.length + 1); // ask Zig to allocate memory
//     const slice = new Uint8Array(
//       memory.buffer, // memory exported from Zig
//       pointer,
//       buffer.length + 1
//     );
//     slice.set(buffer);
//     slice[buffer.length] = 0; // null byte to null-terminate the string
//     //console.log(pointer);
//     return pointer;
//   };

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
    //memory = App.memory; //hack
    //allocUint8 = App.allocUint8; //another hack
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
//bootstrap()

