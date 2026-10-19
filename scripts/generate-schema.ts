/**
 * Extracts the API's own OpenAPI document's description of each adopted entity (see
 * ADOPTED_SCHEMAS) and writes it as a SchemaObject ready for ApiResponse.expectJsonSchema().
 * schemas/generated/ mirrors schemas/ 1:1 — see docs/structure.md.
 *
 * Usage: npx ts-node scripts/generate-schema.ts [outDir]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import RefParser from '@apidevtools/json-schema-ref-parser';

dotenv.config();

const DEFAULT_OUT_DIR = 'schemas/generated';

// OpenAPI component schemas this project actually adopts as a committed schemas/*.schema.ts
// file. Keeps schemas/generated/ mirroring schemas/ 1:1 instead of dumping every entity the
// API happens to expose — add a name here only once something imports the committed file for it.
const ADOPTED_SCHEMAS = ['Todo'];

// OpenAPI-only keywords that aren't part of JSON Schema's validation vocabulary — ajv's strict
// mode (as used by ApiResponse.expectJsonSchema) rejects unknown keywords like "example".
const OPENAPI_ONLY_KEYWORDS = ['example', 'examples', 'discriminator', 'xml', 'externalDocs'];

interface OpenApiDocument {
    components: {
        schemas: Record<string, object>;
    };
}

function buildAuthHeader(username: string, password: string): string {
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

async function fetchOpenApiDocument(baseUrl: string, authHeader: string): Promise<OpenApiDocument> {
    const response = await fetch(`${baseUrl}/openapi.json`, { headers: { Authorization: authHeader } });
    if (!response.ok) {
        throw new Error(`GET /openapi.json → ${response.status}`);
    }
    return (await response.json()) as OpenApiDocument;
}

function extractSchema(document: OpenApiDocument, schemaName: string): object {
    const schema = document.components.schemas[schemaName];
    if (!schema) {
        throw new Error(`No component schema named "${schemaName}" in the OpenAPI document`);
    }
    return schema;
}

function isPlainObject(node: unknown): node is Record<string, unknown> {
    return typeof node === 'object' && node !== null;
}

function stripObjectKeywords(node: Record<string, unknown>): Record<string, unknown> {
    const entries = Object.entries(node).filter(([key]) => !OPENAPI_ONLY_KEYWORDS.includes(key));
    return Object.fromEntries(entries.map(([key, value]) => [key, stripOpenApiOnlyKeywords(value)]));
}

function stripIfObject(node: unknown): unknown {
    return isPlainObject(node) ? stripObjectKeywords(node) : node;
}

function stripOpenApiOnlyKeywords(node: unknown): unknown {
    return Array.isArray(node) ? node.map(stripOpenApiOnlyKeywords) : stripIfObject(node);
}

function toExportName(schemaName: string): string {
    return `${schemaName[0]!.toLowerCase()}${schemaName.slice(1)}Schema`;
}

function renderSchemaFile(schemaName: string, schema: unknown): string {
    const exportName = toExportName(schemaName);
    return [
        `// Generated from /openapi.json by scripts/generate-schema.ts — do not edit by hand.`,
        `import type { SchemaObject } from '@jirivondra/chronos-test-toolkit-api-ts';`,
        '',
        `export const ${exportName}: SchemaObject = ${JSON.stringify(schema, null, 4)};`,
        '',
    ].join('\n');
}

async function dereferenceDocument(document: OpenApiDocument): Promise<OpenApiDocument> {
    return (await RefParser.dereference(document as never)) as unknown as OpenApiDocument;
}

function writeSchemaFile(document: OpenApiDocument, schemaName: string, outDir: string): string {
    const schema = stripOpenApiOnlyKeywords(extractSchema(document, schemaName));
    const outFile = path.join(outDir, `${schemaName.toLowerCase()}.schema.ts`);
    fs.writeFileSync(outFile, renderSchemaFile(schemaName, schema));
    return outFile;
}

async function generateAllSchemas(outDir: string): Promise<string[]> {
    const authHeader = buildAuthHeader(process.env.API_USERNAME!, process.env.API_PASSWORD!);
    const document = await fetchOpenApiDocument(process.env.BASE_URL!, authHeader);
    const dereferenced = await dereferenceDocument(document);
    fs.mkdirSync(outDir, { recursive: true });
    return ADOPTED_SCHEMAS.map((name) => writeSchemaFile(dereferenced, name, outDir));
}

function argOrDefault(value: string | undefined, fallback: string): string {
    return value ?? fallback;
}

async function main(): Promise<void> {
    const outDir = argOrDefault(process.argv[2], DEFAULT_OUT_DIR);
    const outFiles = await generateAllSchemas(outDir);
    outFiles.forEach((outFile) => console.log(`Wrote ${outFile}`));
}

main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
