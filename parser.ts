import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import { Expr, Stmt, BinOp } from './ast';
import { stringifyTree } from './treeprinter';

// use the export keyword to make the function public
export function traverseArgs(c: TreeCursor, s:string) : Array<Expr> {
  var args : Array<Expr> = [];
  c.firstChild(); // go into arglist
  while (c.nextSibling()) {
    args.push(traverseExpr(c, s));
    c.nextSibling();
  }
  c.parent(); // pop arglist
  return args;
}

export function traverseExpr(c : TreeCursor, s : string) : Expr {
  switch(c.type.name) {
    case "Number":
      return {
        tag: "num",
        value: Number(s.substring(c.from, c.to))
      }
    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }
    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // go to arglist
      var args = traverseArgs(c, s);
      if (args.length == 1) {
        if (callName !== "abs" && callName !== "print") 
          throw new Error("PARSE ERROR: unknown builtin1");
        c.parent(); // pop CallExpression
        return {
          tag: "builtin1",
          name: callName,
          arg: args[0]
        };
      } else if (args.length == 2) {
        if (callName !== "max" && callName !== "min" && callName !== "pow") 
          throw new Error("PARSE ERROR: unknown builtin2");
        c.parent(); // pop CallExpression
        return {
          tag: "builtin2",
          name: callName,
          arg1: args[0],
          arg2: args[1]
        };
      }
      throw new Error("PARSE ERROR: function call with incorrect arity");
      
    case "UnaryExpression":
      c.firstChild(); // go into the unary expression
      const uniOp = s.substring(c.from, c.to);
      if (uniOp !== "-" && uniOp !== "+")
        throw new Error("PARSE ERROR: unsupported unary operator");
      c.nextSibling();
      var num = Number(uniOp + s.substring(c.from, c.to));
      if (isNaN(num))
        throw new Error("PARSE ERROR: unary operation failed");
      c.parent(); // pop the unary expression
      return { tag: "num", value: num};
    case "BinaryExpression":
      c.firstChild();// go into the binary expression
      const left = traverseExpr(c, s);
      c.nextSibling(); // operator
      var op : BinOp;
      switch(s.substring(c.from, c.to)) { // the range referred by the cursor
        case "+":
          op = BinOp.Plus;
          break;
        case "-":
          op = BinOp.Minus;
          break;
        case "*":
          op = BinOp.Mul;
          break;
        default:
          throw new Error("PARSE ERROR: unknown binary operator");
      } 
      c.nextSibling(); 
      const right = traverseExpr(c, s);
      c.parent(); // pop the binary expression to traverse the next node
      return { tag: "binexpr", op, left, right}; // use "op" instead of "op : op" because the key and the value are the same.
    default:
      throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt {
  switch(c.node.type.name) {
    case "AssignStatement":
      c.firstChild(); // go to name
      const name = s.substring(c.from, c.to);
      c.nextSibling(); // go to equals
      c.nextSibling(); // go to value
      const value = traverseExpr(c, s);
      c.parent();
      return {
        tag: "define",
        name: name,
        value: value
      }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr: expr }
    default:
      throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

// traverse the program (a list of statements)
export function traverse(c : TreeCursor, s : string) : Array<Stmt> {
  switch(c.node.type.name) {
    case "Script":
      const stmts = [];
      c.firstChild();
      do { // traverse all statements
        stmts.push(traverseStmt(c, s));
      } while(c.nextSibling())
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
      return stmts;
    default:
      throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
  }
}

// parse the code and traverse it
export function parse(source : string) : Array<Stmt> {
  const t = parser.parse(source); // parse the source code
  console.log("Parsed Source Code");
  console.log(stringifyTree(t.cursor(), source, 0));
  console.log("\n");
  return traverse(t.cursor(), source);
}
 