interface MyThing {
    name: string;
}

export function MakeAThing(name: string): MyThing {
    return { name: name };
}