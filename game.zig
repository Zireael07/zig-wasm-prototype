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

export fn allocString(length: u32) [*]const u8 {
    const slice = allocator.allocSentinel(u8, length, 0) catch
        @panic("failed to allocate memory");
    //note: 0 is a valid WASM pointer
    return slice.ptr;
}

export fn alloc(length: u32) [*]const u8 {
    const slice = allocator.alloc(u8, length) catch
        @panic("failed to allocate memory");
    return slice.ptr;
}

export fn free(pointer: [*:0]u8) void {
    allocator.free(std.mem.span(pointer));
}

fn to_slice(pointer: [*]u8, len: usize) []u8 {
    return pointer[0..len];
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
//instead, accepts a string pointer (linear memory offset)
export fn update(message_pointer: [*:0]const u8) void {
    //only accepts slices so we need to transform pointer into a slice
    defer allocator.free(std.mem.sliceTo(message_pointer, 0)); //we need to deallocate on Zig side since we allocated on JS side above
    const name: []const u8 = std.mem.span(message_pointer); //get Zig-style slice
    Console.log("Hi, {s}\n", .{name});
}

export fn sumArray(ptr: [*]u8) void {
    var len: usize = ptr[0]; //first entry encodes length (think BSON)
    const array: []const u8 = to_slice(ptr, len);
    Console.log("sum: {any}\n", .{_sumArray(array)});
}

fn _sumArray(array: []const u8) u8 {
    var total: u8 = 0;

    for (array) |byte| {
        total += byte;
    }

    return total;
}

export fn parse(message_pointer: [*:0]const u8) void {
    //only accepts slices so we need to transform pointer into a slice
    defer allocator.free(std.mem.sliceTo(message_pointer, 0)); //we need to deallocate on Zig side since we allocated on JS side above
    const script_payload: []const u8 = std.mem.span(message_pointer); //get Zig-style slice
    Console.log("Script: {s}\n", .{script_payload});
}
