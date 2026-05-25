import { ProductMetadata } from "./productMetadata";

describe("ProductMetadata", () => {
    describe("name", () => {
        test("valid name characters are preserved unchanged", () => {
            const metadata = new ProductMetadata("OctopusDeploy");
            expect(metadata.name).toBe("OctopusDeploy");
        });

        test("spaces and punctuation are stripped from name", () => {
            const metadata = new ProductMetadata("My ,Product (v2.0)/release@2024:final");
            expect(metadata.name).toBe("MyProductv2.0release2024final");
        });

        test("hyphens are preserved in name", () => {
            const metadata = new ProductMetadata("My-Product");
            expect(metadata.name).toBe("My-Product");
        });

        test("throws when name is whitespace only", () => {
            expect(() => new ProductMetadata("   ")).toThrow("Product name");
        });

        test("throws when name becomes empty after stripping invalid chars", () => {
            expect(() => new ProductMetadata("   @@@   ")).toThrow("Product name");
        });
    });

    describe("version", () => {
        test("version is undefined when not provided", () => {
            const metadata = new ProductMetadata("MyProduct");
            expect(metadata.version).toBeUndefined();
        });

        test("valid version characters are preserved unchanged", () => {
            const metadata = new ProductMetadata("MyProduct", "2024.1.0");
            expect(metadata.version).toBe("2024.1.0");
        });

        test("unsupported chars in version are stripped", () => {
            const metadata = new ProductMetadata("MyProduct", "2024.1 (beta)");
            expect(metadata.version).toBe("2024.1beta");
        });

        test("throws when version is whitespace only", () => {
            expect(() => new ProductMetadata("MyProduct", "   ")).toThrow("Product version");
        });

        test("throws when version becomes empty after stripping invalid chars", () => {
            expect(() => new ProductMetadata("MyProduct", "   @@@   ")).toThrow("Product version");
        });
    });
});
