const std = @import("std");
const allocator = std.heap.page_allocator; //it maps directly to WebAssembly memory.

//based on https://github.com/daneelsan/zig-wasm-logger
const Imports = struct {
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
    return slice.ptr;
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
    //only accepts slices so we need to transform pointer into a slice
    defer std.heap.page_allocator.free(std.mem.sliceTo(name_pointer, 0)); //we need to deallocate on Zig side since we allocated on JS side above
    const name: []const u8 = std.mem.span(name_pointer); //get Zig-style slice
    Console.log("Hi, {s}\n", .{name});
}
