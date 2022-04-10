import { split } from 'ts-node';
import { Stmt, Expr, BinOp } from './ast';
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

type CompileResult = {
  wasmSource: string,
};

export function compile(source: string) : CompileResult {
  const ast = parse(source);
  const definedVars = new Set();
  ast.forEach(s => {
    switch(s.tag) {
      case "define":
        definedVars.add(s.name);
        break;
    }
  }); 
  const scratchVar : string = `(local $$last i32)`;
  const localDefines = [scratchVar];
  definedVars.forEach(v => {
    localDefines.push(`(local $${v} i32)`);
  })
  const commandGroups = ast.map((stmt) => codeGen(stmt));
  const commands = localDefines.concat([].concat.apply([], commandGroups));
  const joinedCommands = commands.join("\n");
  const commandList = joinedCommands.split("\n");
  for (var i = 0; i < commandList.length; i++) {
    const splitCommand = commandList[i].split(" "); 
    if (splitCommand[0] === "(local.get") {
      if (!definedVars.has(splitCommand[1].substring(1, splitCommand[1].length - 1))) {
        throw new Error("ReferenceError");
      }

      console.log(commandList[i]); 
      console.log(splitCommand);
      console.log(splitCommand[1].substring(1, splitCommand[1].length - 1))
      console.log(definedVars.has(splitCommand[1].substring(1, splitCommand[1].length - 1)));
    }
  }
  console.log("Generated: ", commands.join("\n"));
  return {
    wasmSource: commands.join("\n"),
  };
}

function codeGen(stmt: Stmt) : Array<string> {
  switch(stmt.tag) {
    case "define":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}

function codeGenExpr(expr : Expr) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg); // call the function recursively
      return argStmts.concat([`(call $${expr.name})`]);
    case "builtin2":
      const arg1Stmts = codeGenExpr(expr.arg1); // call the function recursively
      const arg2Stmts = codeGenExpr(expr.arg2); // call the function recursively
      return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
    case "num":
      return ["(i32.const " + expr.value + ")"];
    case "id":
      return [`(local.get $${expr.name})`];
    case "binexpr":
      const leftStmts = codeGenExpr(expr.left);
      const rightStmts = codeGenExpr(expr.right);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]; // "..." can unpack the left and right statements.
  }
}

function codeGenBinOp(op: BinOp) : string {
  switch(op) {
    case BinOp.Plus:
      return "(i32.add)"
    case BinOp.Minus:
      return "(i32.sub)"
    case BinOp.Mul:
      return "(i32.mul)"
  }
}
