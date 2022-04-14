import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import { Program, VarInit, Expr, Stmt, UniOp, BinOp, Type, Literal } from './ast';
import { stringifyTree } from './treeprinter';

// use the export keyword to make the function public
export function traverseArgs(c: TreeCursor, s:string) : Array<Expr<null>> {
  var args : Array<Expr<null>> = [];
  c.firstChild(); // go into arglist
  while (c.nextSibling()) {
    args.push(traverseExpr(c, s));
    c.nextSibling();
  }
  c.parent(); // pop arglist
  return args;
}

export function traverseLiteral(c : TreeCursor, s : string) : Literal<null> {
  switch(c.type.name) {
    case "Boolean":
      return { tag: "bool", value: Boolean(s.substring(c.from, c.to)) }
    case "Number":
      return { tag: "num", value: Number(s.substring(c.from, c.to))}
    case "None":
      return { tag: "none" }
    default:
      throw new Error("unknown literal");
  }
}

export function traverseExpr(c : TreeCursor, s : string) : Expr<null> {
  switch(c.type.name) {
    case "Boolean":
      var value = false;
      if (s.substring(c.from, c.to) == "True") {
        value = true;
      }
      return {
        tag: "literal",
        literal: { tag: "bool", value }
      }
    case "Number":
      return {
        tag: "literal",
        literal: { tag: "num", value: Number(s.substring(c.from, c.to))}
      }
    case "None":
      return {
        tag: "literal",
        literal: { tag: "none" }
      }
    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }
    case "UnaryExpression":
      c.firstChild(); // go into the unary expression
      var uniOp : UniOp;
      switch (s.substring(c.from, c.to)) {
        case "not":
          uniOp = UniOp.Not;
          break;
        case "-":
          uniOp = UniOp.Neg;
          break;
        default:
          throw new Error("PARSE ERROR: unsupported unary operator");
      }
      c.nextSibling();
      var uniRight = traverseExpr(c, s)
      c.parent();
      return { tag: "uniexpr", op: uniOp, right: uniRight };
    case "BinaryExpression":
      c.firstChild();// go into the binary expression
      const left = traverseExpr(c, s);
      c.nextSibling(); // operator
      var binOp : BinOp;
      switch(s.substring(c.from, c.to)) { // the range referred by the cursor
        case "+":
          binOp = BinOp.Plus;
          break;
        case "-":
          binOp = BinOp.Minus;
          break;
        case "*":
          binOp = BinOp.Mul;
          break;
        case "//":
          binOp = BinOp.Div;
          break;
        case "%":
          binOp = BinOp.Mod;
          break;
        case "==":
          binOp = BinOp.Eq;
          break;
        case "!=":
          binOp = BinOp.NotEq;
          break;
        case "<=":
          binOp = BinOp.Lte;
          break;
        case ">=":
          binOp = BinOp.Gte;
          break;
        case "<":
          binOp = BinOp.Lt;
          break;
        case ">":
          binOp = BinOp.Gt;
          break;
        case "is":
          binOp = BinOp.Is;
          break;
        default:
          throw new Error("PARSE ERROR: unknown binary operator");
      } 
      c.nextSibling(); 
      const right = traverseExpr(c, s);
      c.parent(); // pop the binary expression to traverse the next node
      return { tag: "binexpr", op: binOp, left, right}; 
    case "ParenthesizedExpression":
      c.firstChild(); // left bracket
      c.nextSibling(); // expr
      const mid = traverseExpr(c, s);
      c.nextSibling(); // right bracket
      c.parent();
      return { tag: "bracket", expr: mid };
    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // go to arglist
      var args = traverseArgs(c, s);
      if (args.length == 1) {
        if (callName == "abs" || callName == "print") {
          c.parent(); // pop CallExpression
          return { tag: "builtin1", name: callName, arg: args[0] };
        }
      } else if (args.length == 2) {
        if (callName == "max" || callName == "min" || callName !== "pow") {
          c.parent(); // pop CallExpression
          return { tag: "builtin2", name: callName, arg1: args[0], arg2: args[1] };
        }
      }
      c.parent();
      return { tag: "call", name: callName, args };
    default:
      throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseVarInit(c : TreeCursor, s : string) : VarInit<null> {
  switch(c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // TypeDef
      if (c.name != "TypeDef") { // just a normal assign statement
        c.parent(); // go back to the assign statement
        return {
          name: "",
          type: Type.none,
          init: { tag : "none" },
        }
      }
      c.firstChild(); // ":"
      c.nextSibling(); // type name
      const type = s.substring(c.from, c.to);
      var curType = Type.none;
      switch(type) {
        case "int":
          curType = Type.int;
          break;
        case "bool":
          curType = Type.bool;
          break;
        case "none":
          curType = Type.none;
          break;
        default:
          throw new Error("defualt: unkown type: " + type);
      }
      c.parent(); // go back to TypeDef
      c.nextSibling(); // "="
      c.nextSibling(); // go to value
      
      const assignValue = traverseLiteral(c, s);
      c.parent();
      return {
        name: name,
        type: curType,
        init: assignValue
      }
    default:
      return {
        name: "",
        type: Type.none,
        init: { tag : "none" },
      }
  }
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt<null> {
  switch(c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // sign => important for complex task like "+="
      c.nextSibling(); // go to value
      const assignValue = traverseExpr(c, s);
      c.parent();
      return {
        tag: "assign",
        name: name,
        value: assignValue
      }
    case "IfStatement":
      c.firstChild(); // "if"
      c.nextSibling(); // if statement 
      const ifCond:Expr<any> = traverseExpr(c, s);
      c.nextSibling(); // focus on body
      c.firstChild(); // focus on ":"
      const ifStmtBody:Stmt<any>[] = [];
      while (c.nextSibling()) {
        ifStmtBody.push(traverseStmt(c, s))
      }
      c.parent(); // go back to body to check else
      var elifCond:Expr<any> = { tag: "empty" };
      const elifBody:Stmt<any>[] = [];
      const elseBody:Stmt<any>[] = [];
      if (c.nextSibling()) { // There is an elif or else statement.
        if (c.name == "elif") {
          c.nextSibling(); // elif statement
          elifCond = traverseExpr(c, s);
          c.nextSibling(); // focus on body
          c.firstChild(); // focus on ":"
          while (c.nextSibling()) {
            elifBody.push(traverseStmt(c, s))
          }
          c.parent(); // go back to elif to check else
          c.nextSibling();
        } 
        if (c.name == "else") {
          c.nextSibling(); // focus on body
          c.firstChild(); // focus on ":"
          while (c.nextSibling()) {
            elseBody.push(traverseStmt(c, s))
          }
          c.parent(); // go back to else
        }
      }
      c.parent(); // go back to IfStatement
      return { tag: "if", cond: ifCond, elifCond, stmtBody: ifStmtBody, elifBody, elseBody };
    case "WhileStatement":
      c.firstChild(); // "while"
      c.nextSibling(); // while statement
      const whileCond:Expr<any> = traverseExpr(c, s);
      c.nextSibling(); // focus on body
      c.firstChild(); // focus on ":"
      const whileStmtBody:Stmt<any>[] = [];
      while (c.nextSibling()) {
        whileStmtBody.push(traverseStmt(c, s))
      }
      c.parent();
      return { tag: "while", cond: whileCond, stmtBody: whileStmtBody};
    case "PassStatement":
      return { tag: "pass"};
    case "ReturnStatement":
      c.firstChild();  // Focus return keyword
      c.nextSibling(); // Focus expression
      var returnValue = traverseExpr(c, s);
      c.parent();
      return { tag: "return", value: returnValue };
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr }
    default:
      throw new Error("defualt: " + c.node.type.name + " ,Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseStmts(c : TreeCursor, s : string) : Array<Stmt<null>> {
  const stmts = [];
  do { // traverse all statements
    stmts.push(traverseStmt(c, s));
  } while(c.nextSibling())
  // console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
  return stmts;
}

// traverse the program (a list of VarInits and a list of statements)
export function traverse(c : TreeCursor, s : string) : Program<null> {
  switch(c.node.type.name) {
    case "Script": // may be empty
      if (c.firstChild()) {
        const varAst = [];
        const stmtAst = []
        do { // traverse all varInits
          const traverseResult = traverseVarInit(c, s);
          if (traverseResult.name == "") { // not variable initialization
            do { // traverse all statements
              stmtAst.push(traverseStmt(c, s));
            } while(c.nextSibling()) 
          } else {
            varAst.push(traverseResult);
          }
        } while(c.nextSibling())
        console.log(JSON.stringify(varAst, null, 2));
        console.log(JSON.stringify(stmtAst, null, 2));
        return { varinits : varAst, fundefs : [], stmts : stmtAst }
      }
      return { varinits : [], fundefs : [], stmts : [] };
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
  }
}

// parse the code and traverse it
export function parse(source : string) {
  const t = parser.parse(source); // parse the source code
  console.log("Parsed Source Code:");
  console.log(stringifyTree(t.cursor(), source, 0));
  console.log("\n");

  console.log("\nParsed AST:");
  return traverse(t.cursor(), source);
}
