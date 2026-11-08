import { LocalStorageCache } from "./localStorageCache.js";
import { silentLogger } from "../../core/src/testing/logger.js";

const key = "octopus-openfeature-ts-feature-manifest";
const raw = { evaluations: [{ slug: "my-feature", value: true }], contentHash: "aGFzaA==" };

describe("LocalStorageCache", () => {
    const mockedLocalStorage = global.localStorage;

    beforeEach(() => {
        const store = new Map<string, string>();
        global.localStorage = {
            getItem: (key) => (store.has(key) ? store.get(key)! : null),
            setItem: (key, value) => {
                store.set(key, String(value));
            },
            removeItem: (key) => {
                store.delete(key);
            },
            clear: () => {
                store.clear();
            },
            key: (index) => Array.from(store.keys())[index] ?? null,
            get length() {
                return store.size;
            },
        };
    });

    // The store above stands in for the jest-localstorage-mock global, which resetMocks strips of its
    // implementation before every test. Put it back so nothing added after this block inherits it.
    afterEach(() => {
        global.localStorage = mockedLocalStorage;
    });

    test("Writes the evaluations as a current schema version entry", () => {
        new LocalStorageCache(silentLogger()).write(raw);

        expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ cacheSchemaVersion: 3, contents: raw });
    });

    test("Reads back the entry it wrote", () => {
        const cache = new LocalStorageCache(silentLogger());

        cache.write(raw);

        expect(cache.read()).toEqual(raw);
    });

    test("Reads nothing when there is no entry", () => {
        expect(new LocalStorageCache(silentLogger()).read()).toBeUndefined();
    });

    test("Removes an entry from a previous schema version, reading it as nothing", () => {
        localStorage.setItem(key, JSON.stringify({ schemaVersion: "v2", contents: { evaluations: [], contentHash: "cached-hash" } }));

        expect(new LocalStorageCache(silentLogger()).read()).toBeUndefined();
        expect(localStorage.getItem(key)).toBeNull();
    });

    test("Reads an entry that is not valid JSON as nothing, warning that it could not", () => {
        localStorage.setItem(key, "not json");
        const logger = silentLogger();

        expect(new LocalStorageCache(logger).read()).toBeUndefined();
        expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    // The warning is the only trace a failed write leaves: this start succeeds either way, and what was really
    // lost is the fallback on the next page load.
    test("Does not throw when the entry cannot be written, warning that it was not", () => {
        const error = new Error("QuotaExceededError");
        global.localStorage.setItem = () => {
            throw error;
        };
        const logger = silentLogger();

        expect(() => new LocalStorageCache(logger).write(raw)).not.toThrow();
        expect(logger.warn).toHaveBeenCalledWith(expect.any(String), error);
    });

    // Browsers throw a SecurityError on access when storage is blocked, such as in a third-party iframe.
    test("Reads nothing when local storage cannot be read, warning that it could not", () => {
        const error = new Error("SecurityError");
        global.localStorage.getItem = () => {
            throw error;
        };
        const logger = silentLogger();

        expect(new LocalStorageCache(logger).read()).toBeUndefined();
        expect(logger.warn).toHaveBeenCalledWith(expect.any(String), error);
    });
});
