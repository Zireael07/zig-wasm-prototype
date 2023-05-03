// game.js - load the WASM, display the game, update the engine

let console_log_buffer = "";
let memory = null; //hack for decodeString to work
let allocUint8 = null;

//based on https://blog.battlefy.com/zig-made-it-easy-to-pass-strings-back-and-forth-with-webassembly
const decodeString = (pointer, length) => {
    const slice = new Uint8Array(
      memory.buffer,
      pointer,
      length
    )
    return new TextDecoder().decode(slice)
  }

const encodeString = (string) => {
    const buffer = new TextEncoder().encode(string);
    //console.log("len: ", buffer.length);
    const pointer = allocUint8(buffer.length + 1); // ask Zig to allocate memory
    const slice = new Uint8Array(
      memory.buffer, // memory exported from Zig
      pointer,
      buffer.length + 1
    );
    slice.set(buffer);
    slice[buffer.length] = 0; // null byte to null-terminate the string
    //console.log(pointer);
    return pointer;
  };

//those will hold App and its state
//App is WASM exports which is immutable, hence separate AppState
var App = {
};

var AppState = {
    'loaded': false,
    'running': false,
};

window.document.body.onload = function() {
    //any JS functions we want to expose to WASM go here
    var env = { env: {
        _throwError(pointer, length) {
            const message = decodeString(pointer, length)
            throw new Error(message)
        },
        jsConsoleLogWrite: function (ptr, len) {
            console_log_buffer += decodeString(ptr, len);
        },
        jsConsoleLogFlush: function () {
            console.log(console_log_buffer);
            console_log_buffer = "";
        },
        jsAskForString: function(ptr, len) {
            return decodeString(ptr, len);
        }
    } };

    WebAssembly.instantiateStreaming(fetch("game.wasm"), env).then(result => {
	console.log("Loaded the WASM!");
	App = result.instance.exports;
    memory = App.memory; //hack
    allocUint8 = App.allocUint8; //another hack
    console.log(App);
	AppState.loaded = true;
	AppState.running = true;
	//App.init();
	App.main(); // begin
    });
};

document.getElementById("1").onclick = function(){
    App.update(encodeString("test"))
}

document.getElementById("2").onclick = function(){
    
    App.update(encodeString("other"))
}