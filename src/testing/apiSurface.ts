import * as path from "path";
// This is the TS 6 JS API (the `typescript` alias). TS 7 has no stable equivalent yet, so this needs porting when the alias goes.
import * as ts from "typescript";

export interface ApiSurface {
    /** One readable block per export, sorted by export name. */
    surface: string;
    /** Types reachable from the surface that are neither exported from the entry point nor declared in @openfeature/* or the TS lib. */
    leaks: string[];
}

interface Member {
    key: string;
    text: string;
}

type Root = { type: ts.Type; isAlias?: boolean } | { signature: ts.Signature };

const formatFlags = ts.TypeFormatFlags.NoTruncation;

export function analyseApiSurface(entryFile: string, tsconfigPath: string): ApiSurface {
    const projectDirectory = path.dirname(path.resolve(tsconfigPath));
    const program = createProgram(entryFile, tsconfigPath);
    const checker = program.getTypeChecker();
    const entry = program.getSourceFile(path.resolve(entryFile))!;
    const moduleSymbol = checker.getSymbolAtLocation(entry)!;

    const exportSymbols = checker.getExportsOfModule(moduleSymbol).sort((a, b) => a.name.localeCompare(b.name));
    const exported = new Set(exportSymbols.map(resolveAlias));
    const typeOnlyStarExports = findTypeOnlyStarExports();

    const blocks: string[] = [];
    const leaks = new Set<string>();

    for (const symbol of exportSymbols) {
        const roots: Root[] = [];
        blocks.push(...describeExport(symbol, roots));

        const seen = new Set<ts.Type>();
        for (const root of roots) {
            if ("signature" in root) walkSignature(root.signature, symbol.name, seen);
            else walkType(root.type, symbol.name, seen, root.isAlias);
        }
    }

    return { surface: blocks.join("\n\n") + "\n", leaks: [...leaks] };

    function resolveAlias(symbol: ts.Symbol): ts.Symbol {
        return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    }

    function findTypeOnlyStarExports(): Set<string> {
        const names = new Set<string>();

        for (const statement of entry.statements) {
            if (ts.isExportDeclaration(statement) && statement.isTypeOnly && !statement.exportClause && statement.moduleSpecifier) {
                const target = checker.getSymbolAtLocation(statement.moduleSpecifier);
                if (target) checker.getExportsOfModule(target).forEach((s) => names.add(s.name));
            }
        }

        return names;
    }

    // A class re-exported with `export type` still compiles, but consumers can no longer `new` it.
    function isTypeOnlyExport(symbol: ts.Symbol): boolean {
        if (typeOnlyStarExports.has(symbol.name)) return true;

        let current: ts.Symbol | undefined = symbol;
        while (current && current.flags & ts.SymbolFlags.Alias) {
            if (current.declarations?.some(ts.isTypeOnlyImportOrExportDeclaration)) return true;
            current = checker.getImmediateAliasedSymbol(current);
        }

        return false;
    }

    function describeExport(symbol: ts.Symbol, roots: Root[]): string[] {
        const target = resolveAlias(symbol);
        const suffix = target.flags & ts.SymbolFlags.Value && isTypeOnlyExport(symbol) ? " (type-only export)" : "";
        const name = symbol.name;

        return (target.declarations ?? []).flatMap((declaration) => {
            if (ts.isClassDeclaration(declaration) || ts.isInterfaceDeclaration(declaration)) {
                const keyword = ts.isClassDeclaration(declaration) ? "class" : "interface";
                const heritage = (declaration.heritageClauses ?? []).map((clause) => " " + clause.getText());

                for (const clause of declaration.heritageClauses ?? []) {
                    clause.types.forEach((t) => roots.push({ type: checker.getTypeAtLocation(t) }));
                }

                const header = `${modifiersOf(declaration)}${keyword} ${name}${typeParameters(declaration, roots)}${heritage.join("")}${suffix}`;
                const members = describeMembers(declaration.members, roots);

                return [[header, ...members.map((m) => "    " + m.text)].join("\n")];
            }

            if (ts.isTypeAliasDeclaration(declaration)) {
                const type = checker.getTypeFromTypeNode(declaration.type);
                roots.push({ type, isAlias: true });

                const text = checker.typeToString(type, undefined, formatFlags | ts.TypeFormatFlags.InTypeAlias);
                return [`type ${name}${typeParameters(declaration, roots)} = ${text}`];
            }

            if (ts.isEnumDeclaration(declaration)) {
                const members = declaration.members.map((m) => `    ${m.name.getText()} = ${JSON.stringify(checker.getConstantValue(m))}`);

                return [[`${modifiersOf(declaration)}enum ${name}${suffix}`, ...members].join("\n")];
            }

            if (ts.isFunctionDeclaration(declaration)) {
                if (checker.isImplementationOfOverload(declaration)) return [];

                const signature = checker.getSignatureFromDeclaration(declaration)!;
                roots.push({ signature });

                return [`function ${name}${checker.signatureToString(signature, undefined, formatFlags)}${suffix}`];
            }

            if (ts.isVariableDeclaration(declaration)) {
                const flags = ts.getCombinedNodeFlags(declaration);
                const keyword = flags & ts.NodeFlags.Const ? "const" : flags & ts.NodeFlags.Let ? "let" : "var";

                const type = checker.getTypeOfSymbolAtLocation(target, declaration);
                roots.push({ type });

                return [`${keyword} ${name}: ${checker.typeToString(type, undefined, formatFlags)}${suffix}`];
            }

            throw new Error(`Unsupported export kind ${ts.SyntaxKind[declaration.kind]} for ${name}`);
        });
    }

    function describeMembers(members: ts.NodeArray<ts.ClassElement | ts.TypeElement>, roots: Root[]): Member[] {
        const described: Member[] = [];

        for (const member of members) {
            if (isHidden(member) || ts.isSemicolonClassElement(member)) continue;

            const name = member.name?.getText() ?? "";
            const optional = "questionToken" in member && member.questionToken ? "?" : "";
            const modifiers = modifiersOf(member);

            if (ts.isPropertyDeclaration(member) || ts.isPropertySignature(member)) {
                const type = propertyType(member);
                roots.push({ type });

                described.push({ key: name, text: `${modifiers}${name}${optional}: ${checker.typeToString(type, undefined, formatFlags)}` });
                continue;
            }

            if (ts.isIndexSignatureDeclaration(member)) {
                const type = checker.getTypeFromTypeNode(member.type);
                roots.push({ type });

                const parameters = member.parameters.map((p) => p.getText()).join(", ");
                described.push({ key: "[", text: `${modifiers}[${parameters}]: ${checker.typeToString(type, undefined, formatFlags)}` });
                continue;
            }

            if (ts.isFunctionLike(member)) {
                // Parameter properties can only be declared on the implementation, so collect them before skipping it in favour of the overloads.
                if (ts.isConstructorDeclaration(member)) {
                    for (const parameter of member.parameters) {
                        if (!ts.isParameterPropertyDeclaration(parameter, member) || isHidden(parameter)) continue;

                        const type = propertyType(parameter);
                        roots.push({ type });

                        const parameterName = parameter.name.getText();
                        const parameterOptional = parameter.questionToken ? "?" : "";
                        described.push({
                            key: parameterName,
                            text: `${modifiersOf(parameter)}${parameterName}${parameterOptional}: ${checker.typeToString(type, undefined, formatFlags)}`,
                        });
                    }
                }

                if (checker.isImplementationOfOverload(member)) continue;

                const signature = checker.getSignatureFromDeclaration(member)!;
                roots.push({ signature });

                const prefix = ts.isConstructorDeclaration(member)
                    ? "constructor"
                    : ts.isConstructSignatureDeclaration(member)
                      ? "new"
                      : ts.isGetAccessor(member)
                        ? `get ${name}`
                        : ts.isSetAccessor(member)
                          ? `set ${name}`
                          : `${name}${optional}`;

                const key =
                    ts.isConstructorDeclaration(member) || ts.isConstructSignatureDeclaration(member) || ts.isCallSignatureDeclaration(member) ? "" : name;
                described.push({ key, text: `${modifiers}${prefix}${checker.signatureToString(signature, undefined, formatFlags)}` });
                continue;
            }

            throw new Error(`Unsupported member kind ${ts.SyntaxKind[member.kind]}`);
        }

        // Member order is not part of the API, so reordering source shouldn't churn the snapshot. Sorting is stable, so overloads keep their order.
        return described.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    }

    function isHidden(node: ts.Node): boolean {
        const flags = ts.getCombinedModifierFlags(node as ts.Declaration);
        const name = (node as ts.NamedDeclaration).name;

        return (
            !!(flags & ts.ModifierFlags.Private) ||
            (!!name && ts.isPrivateIdentifier(name)) ||
            ts.getJSDocTags(node).some((tag) => tag.tagName.text === "internal")
        );
    }

    function modifiersOf(node: ts.Node): string {
        const flags = ts.getCombinedModifierFlags(node as ts.Declaration);

        const words: [ts.ModifierFlags, string][] = [
            [ts.ModifierFlags.Protected, "protected"],
            [ts.ModifierFlags.Abstract, "abstract"],
            [ts.ModifierFlags.Static, "static"],
            [ts.ModifierFlags.Readonly, "readonly"],
            [ts.ModifierFlags.Const, "const"],
        ];

        return words
            .filter(([flag]) => flags & flag)
            .map(([, word]) => word + " ")
            .join("");
    }

    function typeParameters(declaration: ts.DeclarationWithTypeParameterChildren, roots: Root[]): string {
        if (!declaration.typeParameters?.length) return "";

        for (const parameter of declaration.typeParameters) {
            if (parameter.constraint) roots.push({ type: checker.getTypeFromTypeNode(parameter.constraint) });
            if (parameter.default) roots.push({ type: checker.getTypeFromTypeNode(parameter.default) });
        }

        return `<${declaration.typeParameters.map((p) => p.getText()).join(", ")}>`;
    }

    function propertyType(declaration: ts.PropertyDeclaration | ts.PropertySignature | ts.ParameterDeclaration): ts.Type {
        // Prefer the annotation so optional properties don't pick up an implicit `| undefined`; fall back to the inferred type.
        if (declaration.type) return checker.getTypeFromTypeNode(declaration.type);

        return checker.getTypeOfSymbolAtLocation(checker.getSymbolAtLocation(declaration.name)!, declaration);
    }

    function walkSignature(signature: ts.Signature, exportName: string, seen: Set<ts.Type>): void {
        signature.typeParameters?.forEach((t) => walkType(t, exportName, seen));
        signature.getParameters().forEach((p) => walkType(checker.getTypeOfSymbol(p), exportName, seen));
        walkType(signature.getReturnType(), exportName, seen);

        // A type guard's return type is just `boolean`, so the guarded type has to be read from the predicate.
        const predicate = checker.getTypePredicateOfSignature(signature);
        if (predicate?.type) walkType(predicate.type, exportName, seen);
    }

    function walkType(type: ts.Type, exportName: string, seen: Set<ts.Type>, isAlias = false): void {
        if (seen.has(type)) return;
        seen.add(type);

        const walk = (t: ts.Type) => walkType(t, exportName, seen);

        if (type.aliasSymbol && !isAlias) {
            type.aliasTypeArguments?.forEach(walk);
            checkSymbol(type.aliasSymbol, exportName);
            return;
        }

        if (type.isUnionOrIntersection()) {
            type.types.forEach(walk);
            return;
        }

        if (type.flags & ts.TypeFlags.TypeParameter) {
            const constraint = type.getConstraint();
            if (constraint) walk(constraint);
            return;
        }

        if (type.flags & ts.TypeFlags.EnumLiteral) {
            const declaration = type.getSymbol()?.declarations?.[0];
            const enumSymbol = declaration && ts.isEnumMember(declaration) ? checker.getSymbolAtLocation(declaration.parent.name) : type.getSymbol();

            if (enumSymbol) checkSymbol(enumSymbol, exportName);
            return;
        }

        if (type.flags & ts.TypeFlags.Index) {
            walk((type as ts.IndexType).type);
            return;
        }

        if (type.flags & ts.TypeFlags.IndexedAccess) {
            walk((type as ts.IndexedAccessType).objectType);
            walk((type as ts.IndexedAccessType).indexType);
            return;
        }

        if (type.flags & ts.TypeFlags.Conditional) {
            const conditional = type as ts.ConditionalType;
            walk(conditional.checkType);
            walk(conditional.extendsType);
            walk(checker.getTypeFromTypeNode(conditional.root.node.trueType));
            walk(checker.getTypeFromTypeNode(conditional.root.node.falseType));
            return;
        }

        if (type.flags & ts.TypeFlags.Object) {
            if ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) {
                checker.getTypeArguments(type as ts.TypeReference).forEach(walk);
            }

            const symbol = type.getSymbol();
            if (symbol && symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface | ts.SymbolFlags.Enum)) {
                checkSymbol(symbol, exportName);
                return;
            }

            // Anonymous object types (literals, inferred shapes, function types) have no declaration of their own to allow, so check what they contain.
            checker.getPropertiesOfType(type).forEach((p) => walk(checker.getTypeOfSymbol(p)));
            [...type.getCallSignatures(), ...type.getConstructSignatures()].forEach((s) => walkSignature(s, exportName, seen));

            checker.getIndexInfosOfType(type).forEach((info) => {
                walk(info.keyType);
                walk(info.type);
            });
        }
    }

    function checkSymbol(symbol: ts.Symbol, exportName: string): void {
        if (exported.has(symbol)) return;

        const declarations = symbol.declarations ?? [];
        const isAllowed = (file: ts.SourceFile) => program.isSourceFileDefaultLibrary(file) || file.fileName.includes("/node_modules/@openfeature/");

        if (declarations.length > 0 && declarations.every((d) => isAllowed(d.getSourceFile()))) return;

        const file = declarations[0] ? path.relative(projectDirectory, declarations[0].getSourceFile().fileName) : "unknown";
        leaks.add(`${exportName} exposes ${symbol.name} (${file})`);
    }
}

function createProgram(entryFile: string, tsconfigPath: string): ts.Program {
    const config = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
    if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));

    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.dirname(path.resolve(tsconfigPath)));
    const program = ts.createProgram([path.resolve(entryFile)], parsed.options);

    // A surface read from code that doesn't compile is meaningless, so fail loudly instead.
    const errors = ts.getPreEmitDiagnostics(program).filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (errors.length > 0) {
        throw new Error(
            ts.formatDiagnostics(errors, { getCanonicalFileName: (f) => f, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => "\n" })
        );
    }

    return program;
}
