// Parameter properties can only be declared on the constructor implementation, which the surface otherwise skips in favour of its overloads.
export class Pair {
    constructor(name: string);
    constructor(name: string, extra: string);
    constructor(
        readonly name: string,
        readonly extra?: string
    ) {}
}
