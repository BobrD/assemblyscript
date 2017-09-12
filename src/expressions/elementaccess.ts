/** @module assemblyscript/expressions */ /** */

import * as ts from "../typescript";
import { Expression, I32Operations, I64Operations } from "binaryen";
import { Compiler } from "../compiler";
import { compileLoadOrStore } from "./helpers/loadorstore";
import { compileLoad } from "./helpers/load";
import { Type } from "../reflection";
import { getReflectedType, setReflectedType } from "../util";

/** Compiles an element access expression. Sets the element's value to `valueNode` if specified, otherwise gets it. */
export function compileElementAccess(compiler: Compiler, node: ts.ElementAccessExpression, contextualType: Type, valueNode?: ts.Expression): Expression {
  const argumentNode = <ts.Expression>node.argumentExpression;

  // fall back to contextual type on error
  setReflectedType(node, contextualType);

  // compile the expression and verify that it references an array
  const expression = compiler.compileExpression(node.expression, compiler.usizeType);
  const expressionType = getReflectedType(node.expression);

  if (!(expressionType && expressionType.underlyingClass && expressionType.underlyingClass.isArray))
    throw Error("array access used on non-array object"); // handled by typescript

  // obtain the reflected element type
  const elementType = expressionType.underlyingClass.typeArgumentsMap.T.type;
  const usizeCategory = <I32Operations | I64Operations>compiler.categoryOf(compiler.usizeType);
  setReflectedType(node, elementType);

  // if this is a store instead of a load, compile the value expression
  let valueExpression: Expression | undefined;
  if (valueNode)
    valueExpression = compiler.compileExpression(valueNode, elementType, elementType, false);

  // simplify / precalculate access to a constant index
  if (argumentNode.kind === ts.SyntaxKind.NumericLiteral) {
    const literalNode = <ts.LiteralExpression>argumentNode;
    const literalText = literalNode.text; // (usually) preprocessed by TypeScript to a base10 string

    if (literalText === "0")
      return compileLoadOrStore(compiler, elementType,
        compileLoad(compiler, compiler.usizeType, expression, 8),
        0, valueExpression, contextualType
      );

    if (/^[1-9][0-9]*$/.test(literalText)) {
      const value = parseInt(literalText, 10);
      if (value * elementType.size > 0x7fffffff)
        compiler.report(literalNode, ts.DiagnosticsEx.Literal_overflow_Compiling_to_a_value_in_range_0_to_1_instead, 0, (0x7fffffff / elementType.size) | 0);
      return compileLoadOrStore(compiler, elementType,
        compileLoad(compiler, compiler.usizeType, expression, 8),
        (value * elementType.size) & 0x7fffffff, valueExpression, contextualType
      );
    }
  }

  // otherwise evaluate at runtime
  const argumentExpression = compiler.compileExpression(argumentNode, Type.i32, Type.i32, false);
  return compileLoadOrStore(compiler, elementType,
    usizeCategory.add(
      compileLoad(compiler, compiler.usizeType, expression, 8),
      usizeCategory.mul(
        compiler.maybeConvertValue(argumentNode, argumentExpression, Type.i32, compiler.usizeType, true),
        compiler.valueOf(compiler.usizeType, elementType.size)
      )
    ), 0, valueExpression, contextualType
  );
}

export default compileElementAccess;
