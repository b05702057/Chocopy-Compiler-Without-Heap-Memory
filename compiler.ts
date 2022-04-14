import { split } from 'ts-node';
import { Stmt, Expr, BinOp, Program, Type, Literal, UniOp } from './ast';
import { parse } from "./parser";

// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

type CompileResult = {
  wasmSource: string,
};

export function compile(source: string) : CompileResult {
  const program = parse(source);
  console.log(program);
  const varAst = program.varinits;
  const stmtAst = program.stmts;

  const definedVars = new Set(); // record the initialized variable
  const scratchVar : string = `(local $$last i32)`;
  const localDefines = [scratchVar]; // record the variables and their type
  const localAssigns:string[] = [];
  varAst.forEach(s => {
    const name = s.name; 
    switch(s.type) {
      case Type.int:
        localDefines.push(`(local $${name} i32)`);
        break;
      case Type.bool:
        localDefines.push(`(local $${name} i32)`);
        break;
      case Type.none:
        localDefines.push(`(local $${name} none)`);
        break;
      default:
        throw new Error("unknown type");
    }
    definedVars.add(name); 
    codeGen({ 
      tag: "assign", 
      name: s.name, 
      value: { tag: "literal", literal: s.init }
     }).forEach( gen => {
       localAssigns.push(gen);
     })
  }); 

  // Note that concat() doesn't change the original value.
  const localVarInit = localDefines.concat(localAssigns); // define then assign
  const commandGroups = stmtAst.map((stmt) => codeGen(stmt));
  const commands = localVarInit.concat([].concat.apply([], commandGroups));
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

function codeGen(stmt: Stmt<null>) : Array<string> {
  switch(stmt.tag) {
    case "assign":
      var valStmts = codeGenExpr(stmt.value);
      return valStmts.concat([`(local.set $${stmt.name})`]);
    case "if":
      var ifCondStmts = codeGenExpr(stmt.cond);
      ifCondStmts.push(`(if`); // start if
      ifCondStmts.push(`(then`); // start then
      stmt.stmtBody.forEach( ifStmt => {
        (codeGen(ifStmt).forEach( gen => {
          ifCondStmts.push(gen);
        }))
      });
      ifCondStmts.push(`)`); // end of then()

      if (stmt.elifCond.tag != "empty") { // else if
        ifCondStmts.push(`(else`);
        codeGenExpr(stmt.elifCond).forEach( gen => {
          ifCondStmts.push(gen);
        })
        ifCondStmts.push(`(if`);
        ifCondStmts.push(`(then`);
        stmt.elifBody.forEach( elifStmt => {
          codeGen(elifStmt).forEach( gen => {
            ifCondStmts.push(gen);
          })
        })
        ifCondStmts.push(`)`); // end of then()

        if (stmt.elseBody.length != 0) { // else if, then else
          ifCondStmts.push(`(else`);
          stmt.elseBody.forEach( elseStmt => {
            ifCondStmts.concat(codeGen(elseStmt));
          })
          ifCondStmts.push(`)`); // end of else
        }
        ifCondStmts.push(`)`); // end of else if
        ifCondStmts.push(`)`); // end of else
      } else if (stmt.elseBody.length != 0) { // only else
        ifCondStmts.push(`(else`);
        stmt.elseBody.forEach( elseStmt => {
          codeGen(elseStmt).forEach( gen => {
            ifCondStmts.push(gen);
          })
        })
        ifCondStmts.push(`)`); // end of else
      }
      ifCondStmts.push(`)`); // end of if
      return ifCondStmts;
    case "while":
      var whileCondStmts = codeGenExpr(stmt.cond);
      whileCondStmts.push(`(if`);
      whileCondStmts.push(`(then`);
      whileCondStmts.push(`(loop $my_loop`); // start the loop if the condition meets
      stmt.stmtBody.forEach( whileStmt => {
        codeGen(whileStmt).forEach( gen => {
          whileCondStmts.push(gen);
        })
      })
      codeGenExpr(stmt.cond).forEach( gen => { // check the condition again
        whileCondStmts.push(gen);
      })
      whileCondStmts.push(`(br_if $my_loop)`); // go back to the loop if the condition meets
      whileCondStmts.push(`)`); // end of loop
      whileCondStmts.push(`)`); // end of then
      whileCondStmts.push(`)`); // end of if
      return whileCondStmts;
    case "pass":
      var passStmts = [``]; // just add a blank line
      return passStmts;
    case "return": // We don't need this because we haven't implement a function.
      var returnStmts = [``];
      return returnStmts;
    case "expr":
      var exprStmts = codeGenExpr(stmt.expr);
      return exprStmts.concat([`(local.set $$last)`]);
  }
}

function codeGenExpr(expr : Expr<null>) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg); // call the function recursively
      return argStmts.concat([`(call $${expr.name})`]);
    case "builtin2":
      const arg1Stmts = codeGenExpr(expr.arg1); // call the function recursively
      const arg2Stmts = codeGenExpr(expr.arg2); // call the function recursively
      return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
    case "literal":
      const literal = expr.literal;
      switch(literal.tag) {
        case "num":
          return ["(i32.const " + literal.value + ")"];
        case "bool":
          if (literal.value == true){
            return ["(i32.const 1)"];
          }
          return ["(i32.const 0)"];
        case "none":
          return ["(none.const)"];
      }      
    case "id":
      return [`(local.get $${expr.name})`];
    case "uniexpr":
      const uniOpStmt = codeGenUniOp(expr.op);
      const uniRightStmts = codeGenExpr(expr.right);
      if (uniOpStmt == "(i32.neg)") {
        return [...uniRightStmts, uniOpStmt, "(i32.sub)"];
      }
      return [...uniRightStmts, uniOpStmt];
    case "binexpr":
      const leftStmts = codeGenExpr(expr.left);
      const rightStmts = codeGenExpr(expr.right);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]; // "..." can unpack the left and right statements.
    case "bracket":
      const stmts = codeGenExpr(expr.expr);
      return [...stmts];
    case "call":
      const output : string[] = [];
      expr.args.forEach(arg => {
        const argStmts = codeGenExpr(arg);
        output.concat([...argStmts]);
      })
      output.push(`(call $${expr.name})`);
      return output;
  }
}

function codeGenUniOp(op: UniOp) : string {
  switch(op) {
    case UniOp.Neg:
      return "(f32.neg)"
    case UniOp.Not: // not sure about this
      return "(i32.not)" 
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
    case BinOp.Div:
      return "(i32.div_u)"
    case BinOp.Mod:
      return "(i32.rem)"
    case BinOp.Eq:
      return "(i32.eq)"
    case BinOp.NotEq:
      return "(i32.ne)"
    case BinOp.Lte:
      return "(i32.le_u)"
    case BinOp.Gte:
      return "(i32.ge_u)"
    case BinOp.Lt:
      return "(i32.lt_u)"
    case BinOp.Gt:
      return "(i32.gt_u)"
    case BinOp.Is: // "Is" is not supported yet
      return ""
  }
}
