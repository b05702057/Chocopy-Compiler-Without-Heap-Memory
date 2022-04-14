import { parse } from './parser';
import { compile } from './compiler';
import { stringifyTree } from "./treeprinter";
import { parser } from "lezer-python"

// A call expression is an expression that calls a function.
// var ast = parse("abs(1)"); 

// Lezer parses the expression correctly. => 1 + (2 * 3).
// var ast = parse("1 + 2 * 3"); 

// var ast = parse("print(max(1, -1))");
// var ast = parse("print(x)");
// var ast = parse(""); // empty

const source = "A:int=10\n A=5\nif 1:\n    print(5)\n    print(10)\nelif 0:\n    print(3)\nelse:\n    print(A)";
// const source = "A:int=0\nif A:\n    print(A)\nelif 0:\n    print(3)";
// const source = "A=0\nif (not A):\n    print(A)\n    print(A(-(5)))\nelse:\n    print(3)";
// const source = "A:int=10\nif A:\n    print(A)\n    print((A-(5)))";
// const source = "A:int=5\nwhile A>0:\n    print(A-5)\n    A=A-1"
// const source = "A=5\nwhile 1:\n    pass"
// const source = "A=5\nwhile True:\n    return A"
// const source = "A=5\nwhile None:\n    return None"
// const source = "5 >= 3";
// const source = "f(5, 3, 4)";
// const source = "x : int = 10"; // only initialization
// const source = "";
// const source = "x : int = 10\ny : bool = True\nprint(x)\nprint(y)";
// const source = "a = 5\nb = 10";
// const source = "print(not False)";
// const source = "not(True)";



// const parsed = parse(source);
// var returnType = "";
// var returnExpr = "";
// if (parsed.stmts.length != 0) {
//     console.log(parsed.stmts);
//     const lastExpr = parsed.stmts[parsed.stmts.length - 1]
//     if(lastExpr.tag === "expr") {
//     returnType = "(result i32)";
//     returnExpr = "(local.get $$last)"
//     }
// }

// parse(source);

// compile
const out = compile(source);
console.log(out);

/*
A=5
if 1:
    print(5)
else:
    A=10
    print(A)
*/