import { MakeAThing } from "./index";

test('makes a thing', () => {
   const thing = MakeAThing("Andrew");

   expect(thing.name).toBe("Andrew");
})