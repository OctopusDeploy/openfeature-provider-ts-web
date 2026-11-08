// RFC 9110 token characters: https://www.rfc-editor.org/rfc/rfc9110.html#name-tokens
const INVALID_TCHAR = /[^a-zA-Z0-9!#$%&'*+\-.^_`|~]/g;

function clean(value: string): string {
    return value.replace(INVALID_TCHAR, "");
}

export class ProductMetadata {
    readonly name: string;
    readonly version: string | undefined;

    constructor(name: string);
    constructor(name: string, version: string);
    constructor(name: string, version?: string) {
        this.name = clean(name);
        this.validateName();

        if (version !== undefined) {
            this.version = clean(version);
            this.validateVersion();
        } else {
            this.version = undefined;
        }
    }

    private validateName(): void {
        if (!this.name) {
            throw new Error("Product name must contain at least one valid token character.");
        }
    }

    private validateVersion(): void {
        if (!this.version) {
            throw new Error("Product version must contain at least one valid token character.");
        }
    }
}
