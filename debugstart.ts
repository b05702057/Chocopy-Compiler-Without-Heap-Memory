import { parse } from "./parser";
import { compile } from "./compiler"
import { stringifyTree } from "./treeprinter";

// A call expression is an expression that calls a function.
// var ast = parse("abs(1)"); 

// Lezer parses the expression correctly. => 1 + (2 * 3).
// var ast = parse("1 + 2 * 3"); 

// var ast = parse("print(max(1, -1))");

// var ast = parse("print(x)");

// var ast = parse("");

// console.log("ast")
// console.log(JSON.stringify(ast, null, 2));

var result = compile("print(x)");
console.log(result);
