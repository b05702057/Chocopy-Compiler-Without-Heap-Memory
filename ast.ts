import { BinaryOperator } from "typescript"

// The export keyword allow it to be imported by other programs.
export type Program<A> = { a?: A, varinits: VarInit<A>[], fundefs: FunDef<A>[], stmts: Stmt<A>[] }

// typed_var (name + type) + literal
export type VarInit<A> = { a?: A, name: string, type: Type, init: Literal<A> }

export type TypedVar<A> = { a?: A, name: string, type: Type }

// inits + body => func_body
export type FunDef<A> = { name: string, params: TypedVar<A>[], ret: Type, inits: VarInit<A>[], body: Stmt<A>[] }

// The abstract syntax tree is a tree form of the parsed program.
export type Stmt<A> =
  | { a?: A, tag: "assign", name: string, value: Expr<A> }
  | { a?: A, tag: "if", cond: Expr<A>, stmtBody: Stmt<A>[], elifCond: Expr<A>, elifBody: Stmt<A>[], elseBody: Stmt<A>[] }
  | { a?: A, tag: "while", cond: Expr<A>, stmtBody: Stmt<A>[] }
  | { a?: A, tag: "pass" }
  | { a?: A, tag: "return", value: Expr<A> }
  | { a?: A, tag: "expr", expr: Expr<A> }
  
export type Expr<A> =
  | { a?: A, tag: "literal", literal: Literal<A> }
  | { a?: A, tag: "id", name: string }
  | { a?: A, tag: "builtin1", name: string, arg: Expr<A> }
  | { a?: A, tag: "builtin2", name: string, arg1: Expr<A>, arg2: Expr<A> }
  | { a?: A, tag: "uniexpr", op: UniOp, right: Expr<A> }
  | { a?: A, tag: "binexpr", op: BinOp, left: Expr<A>, right: Expr<A> }
  | { a?: A, tag: "bracket", expr: Expr<A> }
  | { a?: A, tag: "call", name: string, args: Expr<A>[] }
  | { a?: A, tag: "empty" } // empty expression => used for empty else if condition

export enum UniOp {
  Not = "not",
  Neg = "-",
}
  
export enum BinOp { 
  Plus = "+", 
  Minus = "-", 
  Mul = "*", 
  Div = "//",
  Mod = "%",
  Eq = "==",
  NotEq = "!=",
  Lte = "<=",
  Gte = ">=", 
  Lt = "<",
  Gt = ">",
  Is = "is",
}

export type Literal<A> = 
  | { a?: A, tag: "num", value: number }
  | { a?: A, tag: "bool", value: boolean }
  | { a?: A, tag: "none" }

export enum Type { int, bool, none }

/*
A = a
s = <A>+

+: either 1 time or multiple times
?: either 0 time or 1 time
*: either 0 time or multiple times

*/
