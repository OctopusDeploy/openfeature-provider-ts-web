// Core's tsconfig leaves out the DOM lib and @types/node, so browser-only and Node-only APIs are a
// compile error. Some globals exist in both browsers and Node, but TypeScript only declares them
// in one of those two, so core declares the ones it uses here.
// Only add a global here once it's confirmed available in every browser and Node version the
// providers support. Declare just the members core calls, so nothing else creeps in unnoticed.

/** Available in all supported browsers and in Node since v11. */
interface TextEncoder {
    encode(input?: string): Uint8Array<ArrayBuffer>;
}

declare const TextEncoder: {
    prototype: TextEncoder;
    new (): TextEncoder;
};
