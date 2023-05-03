const std = @import("std");

const builtin = std.builtin;

const allocator = std.heap.page_allocator; //it maps directly to WebAssembly memory.

//based on https://github.com/daneelsan/zig-wasm-logger
const Imports = struct {
    extern "env" fn _throwError(pointer: [*]const u8, length: u32) noreturn;
    pub fn throwError(message: []const u8) noreturn {
        _throwError(message.ptr, message.len);
    }
    extern fn jsConsoleLogWrite(ptr: [*]const u8, len: usize) void;
    extern fn jsConsoleLogFlush() void;
    extern fn jsAskForString(pointer: [*]const u8) [*:0]u8; //slice of u8
};

pub const Console = struct {
    pub const Logger = struct {
        pub const Error = error{};
        pub const Writer = std.io.Writer(void, Error, write);

        fn write(_: void, bytes: []const u8) Error!usize {
            Imports.jsConsoleLogWrite(bytes.ptr, bytes.len);
            return bytes.len;
        }
    };

    const logger = Logger.Writer{ .context = {} };
    pub fn log(comptime format: []const u8, args: anytype) void {
        logger.print(format, args) catch return;
        Imports.jsConsoleLogFlush();
    }
};

export fn allocUint8(length: u32) [*]const u8 {
    const slice = allocator.alloc(u8, length) catch
        @panic("failed to allocate memory");
    //note: 0 is a valid WASM pointer
    return slice.ptr;
}

export fn free(pointer: [*:0]u8) void {
    allocator.free(std.mem.span(pointer));
}

// Calls to @panic are sent here.
// See https://ziglang.org/documentation/master/#panic
pub fn panic(message: []const u8, _: ?*builtin.StackTrace, _: ?usize) noreturn {
    Imports.throwError(message);
}

export fn main() void {
    //std.debug.print("Hello, {s}!\n", .{"World"});
    Console.log("Hello, {s}!\n", .{"World"});
}

//no string arguments in WASM land :(
export fn update(
    message_pointer: [*]const u8,
    //message_length: u32,
) void {
    //_ = message_length;
    const name_pointer: [*:0]u8 = Imports.jsAskForString(message_pointer);
    //[*:0] is a 'many-item pointer' so it doesn't have len :(
    if (name_pointer[0] == @intCast(u8, 0)) {
        //something went really wrong
        Console.log("Null pointer!", .{}); //no args
        allocator.free(std.mem.sliceTo(name_pointer, 0));
        return;
    }
    Console.log("Pointer, {s}", .{name_pointer});
    //only accepts slices so we need to transform pointer into a slice
    defer allocator.free(std.mem.sliceTo(name_pointer, 0)); //we need to deallocate on Zig side since we allocated on JS side above
    const name: []const u8 = std.mem.span(name_pointer); //get Zig-style slice
    Console.log("Hi, {s}\n", .{name});
}
