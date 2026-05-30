// Loose ambient declarations for the vendored open-source SysML parser
// (syside-languageserver) and langium. We treat the parser AST as `any` at this
// boundary and convert to our own typed IR in the extractors (anti-corruption layer).

declare module "syside-languageserver" {
  export function createSysMLServices(fileSystem: unknown): {
    shared: any;
    SysML: any;
    KerML: any;
  };
  export const ast: any;
}

declare module "syside-languageserver/node" {
  export const SysMLNodeFileSystem: unknown;
}

declare module "langium" {
  export type AstNode = any;
  export type CstNode = any;
  export type LangiumDocument = any;
  export function findLeafNodeAtOffset(node: any, offset: number): any;
  export function findDeclarationNodeAtOffset(node: any, offset: number): any;
  export function streamAllContents(node: any): Iterable<any>;
  export function streamAst(node: any): Iterable<any>;
  export function getDocument(node: any): any;
}
