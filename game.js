// game.js - load the WASM, display the game, update the engine

let console_log_buffer = "";
let memory = null; //hack for decodeString to work

const decodeString = (pointer, length) => {
    const slice = new Uint8Array(
      memory.buffer,
      pointer,
      length
    )
    return new TextDecoder().decode(slice)
  }

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
        jsConsoleLogWrite: function (ptr, len) {
            console_log_buffer += decodeString(ptr, len);
        },
        jsConsoleLogFlush: function () {
            console.log(console_log_buffer);
            console_log_buffer = "";
        }
    } };

    WebAssembly.instantiateStreaming(fetch("game.wasm"), env).then(result => {
	console.log("Loaded the WASM!");
	App = result.instance.exports;
    memory = App.memory; //hack
    console.log(App);
	AppState.loaded = true;
	AppState.running = true;
	//App.init();
	App.main(); // begin
    });
};

