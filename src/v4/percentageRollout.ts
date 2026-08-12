import murmur from "murmurhash3js-revisited";

/**
 * Buckets a targeting key into a percentage rollout. Hashing the flag's evaluation key together with
 * the targeting key keeps a bucket stable across evaluations, while giving each flag an independent
 * spread of targeting keys.
 *
 * The v3 path shares this implementation, so a rollout lands on the same users across versions and
 * provider libraries.
 *
 * @internal
 */
export function includes(evaluationKey: string, targetingKey: string, percentage: number): boolean {
    return getNormalizedNumber(evaluationKey, targetingKey) <= percentage;
}

/**
 * A deterministic bucket in the inclusive range 1–100 for the given evaluation and targeting keys.
 *
 * Exported rather than kept private so the shared cross-library vectors can assert on the bucket
 * itself, as the other provider libraries do.
 *
 * @internal
 */
export function getNormalizedNumber(evaluationKey: string, targetingKey: string): number {
    const bytes = new TextEncoder().encode(`${evaluationKey}:${targetingKey}`);

    // MurmurHash3 32-bit, seed 0. x86.hash32 processes tail bytes in little-endian order,
    // matching the reference C spec and equivalent to .NET's MurmurHash.Create32() +
    // BinaryPrimitives.ReadUInt32LittleEndian().
    const hash = murmur.x86.hash32(bytes, 0);

    // JavaScript's >>> 0 reinterprets the signed int as an unsigned 32-bit value —
    // equivalent to Integer.toUnsignedLong() in Java or casting to uint in C#.
    const unsignedHash = hash >>> 0;

    return (unsignedHash % 100) + 1;
}
