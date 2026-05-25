// RFC 9110 token characters: https://www.rfc-editor.org/rfc/rfc9110.html#name-tokens
const INVALID_TCHAR = /[^a-zA-Z0-9!#$%&'*+\-.^_`|~]/g;

function clean(value: string): string {
    return value.replace(INVALID_TCHAR, "");
}

export class ProductMetadata {
    readonly name: string;
    readonly version: string | undefined;

    constructor(name: string, version?: string) {
        const cleanedName = clean(name);
        if (!cleanedName) {
            throw new Error("Product name must contain at least one valid token character.");
        }
        this.name = cleanedName;

        if (version !== undefined) {
            const cleanedVersion = clean(version);
            if (!cleanedVersion) {
                throw new Error("Product version must contain at least one valid token character.");
            }
            this.version = cleanedVersion;
        } else {
            this.version = undefined;
        }
    }
}
