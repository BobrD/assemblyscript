/** @module assemblyscript/expressions */ /** */

import * as ts from "../typescript";
import { Expression, I32Operations, I64Operations, F32Operations, F64Operations } from "binaryen";
import { internal_fmod } from "../builtins";
import { Compiler } from "../compiler";
import { compileElementAccess } from "./elementaccess";
import { compilePropertyAccess } from "./propertyaccess";
import { Type, TypeKind, VariableBase, LocalVariable, ReflectionObjectKind } from "../reflection";
import { getReflectedType, setReflectedType } from "../util";

/** Compiles a binary expression. Covers addition, multiplication and so on. */
export function compileBinary(compiler: Compiler, node: ts.BinaryExpression, contextualType: Type): Expression {

  if (node.operatorToken.kind === ts.SyntaxKind.EqualsToken)
    return compileAssignment(compiler, node, contextualType);

  if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    return compileLogicalAndOr(compiler, node);

  let left: Expression = compiler.compileExpression(node.left, contextualType);
  let leftType: Type = getReflectedType(node.left);

  let right: Expression;
  let rightType: Type;

  let commonType: Type | undefined;
  let resultType: Type;

  const op = compiler.module;

  setReflectedType(node, contextualType);

  switch (node.operatorToken.kind) {

    // **, *, /, %, +, -
    // prefer float over int, otherwise select the larger type
    case ts.SyntaxKind.AsteriskAsteriskToken:
    case ts.SyntaxKind.AsteriskToken:
    case ts.SyntaxKind.SlashToken:
    case ts.SyntaxKind.PercentToken:
    case ts.SyntaxKind.PlusToken:
    case ts.SyntaxKind.MinusToken:
      right = compiler.compileExpression(node.right, leftType);
      rightType = getReflectedType(node.right);

      if (leftType.isAnyFloat) {
        if (rightType.isAnyFloat)
          commonType = leftType.size >= rightType.size ? leftType : rightType;
        else
          commonType = leftType;
      } else if (rightType.isAnyFloat)
        commonType = rightType;
      else
        commonType = leftType.size >= rightType.size ? leftType : rightType;

      left = compiler.maybeConvertValue(node.left, left, leftType, commonType, false);
      right = compiler.maybeConvertValue(node.right, right, rightType, commonType, false);
      leftType = rightType = resultType = commonType;
      break;

    // <<, <<=, >>, >>=
    // use left type, reject float, derive right type to compatible int
    case ts.SyntaxKind.LessThanLessThanToken:
    case ts.SyntaxKind.LessThanLessThanEqualsToken:
    case ts.SyntaxKind.GreaterThanGreaterThanToken:
    case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
      if (leftType.isAnyFloat) {
        compiler.report(node, ts.DiagnosticsEx.Type_0_is_invalid_in_this_context, leftType.toString());
        return op.unreachable();
      }
      if (leftType.isLong) {
        right = compiler.compileExpression(node.right, Type.i64, Type.i64, false);
        rightType = Type.i64;
      } else {
        right = compiler.compileExpression(node.right, Type.i32, Type.i32, false);
        rightType = Type.i32;
      }
      resultType = leftType;
      break;

    // >>>, >>>=
    // special case of the above with the result always being unsigned
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
    case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
      if (leftType.isAnyFloat) {
        compiler.report(node, ts.DiagnosticsEx.Type_0_is_invalid_in_this_context, leftType.toString());
        return op.unreachable();
      }
      if (leftType.isLong) {
        right = compiler.compileExpression(node.right, Type.i64, Type.i64, false);
        rightType = Type.i64;
        resultType = Type.u64;
      } else {
        right = compiler.compileExpression(node.right, Type.i32, Type.i32, false);
        rightType = Type.i32;
        resultType = Type.u32;
      }
      break;

    // <, <=, >, >=, ==, !=
    // prefer float over int, otherwise select the larger type, result is bool
    case ts.SyntaxKind.LessThanToken:
    case ts.SyntaxKind.LessThanEqualsToken:
    case ts.SyntaxKind.GreaterThanToken:
    case ts.SyntaxKind.GreaterThanEqualsToken:
    case ts.SyntaxKind.EqualsEqualsToken:
    case ts.SyntaxKind.EqualsEqualsEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsToken:
    case ts.SyntaxKind.ExclamationEqualsEqualsToken:
      right = compiler.compileExpression(node.right, leftType);
      rightType = getReflectedType(node.right);

      if (leftType.isAnyFloat) {
        if (rightType.isAnyFloat)
          commonType = leftType.size >= rightType.size ? leftType : rightType;
        else
          commonType = leftType;
      } else if (rightType.isAnyFloat)
        commonType = rightType;
      else
        commonType = leftType.size > rightType.size
          ? leftType
          : rightType.size > leftType.size
            ? rightType
            : leftType.isSigned === rightType.isSigned
              ? leftType
              : leftType.isSigned === contextualType.isSigned
                ? leftType
                : rightType;

      left = compiler.maybeConvertValue(node.left, left, leftType, commonType, false);
      right = compiler.maybeConvertValue(node.right, right, rightType, commonType, false);
      leftType = rightType = commonType;
      resultType = Type.bool;
      break;

    // &, |, ^
    // prefer long over int, reject float, otherwise select the larger type
    case ts.SyntaxKind.AmpersandToken:
    case ts.SyntaxKind.BarToken:
    case ts.SyntaxKind.CaretToken:
      if (leftType.isAnyFloat) {
        compiler.report(node.left, ts.DiagnosticsEx.Type_0_is_invalid_in_this_context, leftType.toString());
        return op.unreachable();
      }
      right = compiler.compileExpression(node.right, leftType);
      rightType = getReflectedType(node.right);
      if (rightType.isAnyFloat) {
        compiler.report(node.right, ts.DiagnosticsEx.Type_0_is_invalid_in_this_context, rightType.toString());
        return op.unreachable();
      }
      if (leftType.isLong) {
        if (rightType.isLong) {
          commonType = leftType.isSigned === rightType.isSigned
            ? leftType
            : contextualType.isSigned
              ? Type.i64
              : Type.u64;
        } else
          commonType = leftType;
      } else if (rightType.isLong)
        commonType = rightType;
      else
        commonType = leftType.size > rightType.size
          ? leftType
          : rightType.size > leftType.size
            ? rightType
            : leftType.isSigned === rightType.isSigned
              ? leftType
              : leftType.isSigned === contextualType.isSigned
                ? leftType
                : rightType;

      left = compiler.maybeConvertValue(node.left, left, leftType, commonType, false);
      right = compiler.maybeConvertValue(node.right, right, rightType, commonType, false);
      leftType = rightType = resultType = commonType;
      break;

    // +=, -=, **=, *=, /=, %=, &=, |=, ^=
    // prioritize left type, result is left type
    default:
    // case typescript.SyntaxKind.PlusEqualsToken:
    // case typescript.SyntaxKind.MinusEqualsToken:
    // case typescript.SyntaxKind.AsteriskAsteriskEqualsToken:
    // case typescript.SyntaxKind.AsteriskEqualsToken:
    // case typescript.SyntaxKind.SlashEqualsToken:
    // case typescript.SyntaxKind.PercentEqualsToken:
    // case typescript.SyntaxKind.AmpersandEqualsToken:
    // case typescript.SyntaxKind.BarEqualsToken:
    // case typescript.SyntaxKind.CaretEqualsToken:
      right = compiler.compileExpression(node.right, leftType, leftType, false);
      rightType = commonType = resultType = leftType;
      break;
  }

  const isCompound = node.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastCompoundAssignment;

  setReflectedType(node, resultType);

  let result: Expression | null = null;

  const operandType = commonType || leftType;
  const operandCategory = compiler.categoryOf(operandType);

  if (operandType.isAnyFloat) {

    const category = <F32Operations | F64Operations>operandCategory;

    switch (node.operatorToken.kind) {

      // Arithmetic
      case ts.SyntaxKind.PlusToken:
      case ts.SyntaxKind.PlusEqualsToken:
        result = category.add(left, right);
        break;

      case ts.SyntaxKind.MinusToken:
      case ts.SyntaxKind.MinusEqualsToken:
        result = category.sub(left, right);
        break;

      case ts.SyntaxKind.AsteriskToken:
      case ts.SyntaxKind.AsteriskEqualsToken:
        result = category.mul(left, right);
        break;

      case ts.SyntaxKind.SlashToken:
      case ts.SyntaxKind.SlashEqualsToken:
        result = category.div(left, right);
        break;

      case ts.SyntaxKind.PercentToken:
      case ts.SyntaxKind.PercentEqualsToken:
        // FIXME: this uses a naive imlementation
        result = internal_fmod(compiler, [ node.left, node.right ], [ left, right ]);
        break;

      // Logical
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        compiler.report(node.operatorToken, ts.DiagnosticsEx.Assuming_0_instead_of_1, "==", "===");
      case ts.SyntaxKind.EqualsEqualsToken:
        result = category.eq(left, right);
        break;

      case ts.SyntaxKind.ExclamationEqualsEqualsToken:
        compiler.report(node.operatorToken, ts.DiagnosticsEx.Assuming_0_instead_of_1, "!=", "!==");
      case ts.SyntaxKind.ExclamationEqualsToken:
        result = category.ne(left, right);
        break;

      case ts.SyntaxKind.GreaterThanToken:
        result = category.gt(left, right);
        break;

      case ts.SyntaxKind.GreaterThanEqualsToken:
        result = category.ge(left, right);
        break;

      case ts.SyntaxKind.LessThanToken:
        result = category.lt(left, right);
        break;

      case ts.SyntaxKind.LessThanEqualsToken:
        result = category.le(left, right);
        break;

    }

  } else if (operandType.isAnyInteger) {

    const category = <I32Operations | I64Operations>operandCategory;

    switch (node.operatorToken.kind) {

      // Arithmetic
      case ts.SyntaxKind.PlusToken:
      case ts.SyntaxKind.PlusEqualsToken:
        result = category.add(left, right);
        break;

      case ts.SyntaxKind.MinusToken:
      case ts.SyntaxKind.MinusEqualsToken:
        result = category.sub(left, right);
        break;

      case ts.SyntaxKind.AsteriskToken:
      case ts.SyntaxKind.AsteriskEqualsToken:
        result = category.mul(left, right);
        break;

      case ts.SyntaxKind.SlashToken:
      case ts.SyntaxKind.SlashEqualsToken:
        result = operandType.isSigned
          ? category.div_s(left, right)
          : category.div_u(left, right);
        break;

      case ts.SyntaxKind.PercentToken:
      case ts.SyntaxKind.PercentEqualsToken:
        result = operandType.isSigned
          ? category.rem_s(left, right)
          : category.rem_u(left, right);
        break;

      case ts.SyntaxKind.AmpersandToken:
      case ts.SyntaxKind.AmpersandEqualsToken:
        result = category.and(left, right);
        break;

      case ts.SyntaxKind.BarToken:
      case ts.SyntaxKind.BarEqualsToken:
        result = category.or(left, right);
        break;

      case ts.SyntaxKind.CaretToken:
      case ts.SyntaxKind.CaretEqualsToken:
        result = category.xor(left, right);
        break;

      case ts.SyntaxKind.LessThanLessThanToken:
      case ts.SyntaxKind.LessThanLessThanEqualsToken:
        result = category.shl(left, right);
        break;

      case ts.SyntaxKind.GreaterThanGreaterThanToken:
      case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken:
        result = operandType.isSigned
          ? category.shr_s(left, right)
          : category.shr_u(left, right);
        break;

      case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
      case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        result = category.shr_u(left, right);
        break;

      // Logical
      case ts.SyntaxKind.EqualsEqualsEqualsToken:
        compiler.report(node.operatorToken, ts.DiagnosticsEx.Assuming_0_instead_of_1, "==", "===");
      case ts.SyntaxKind.EqualsEqualsToken:
        result = category.eq(left, right);
        break;

      case ts.SyntaxKind.ExclamationEqualsToken:
        result = category.ne(left, right);
        break;

      case ts.SyntaxKind.GreaterThanToken:
        result = operandType.isSigned
          ? category.gt_s(left, right)
          : category.gt_u(left, right);
        break;

      case ts.SyntaxKind.GreaterThanEqualsToken:
        result = operandType.isSigned
          ? category.ge_s(left, right)
          : category.ge_u(left, right);
        break;

      case ts.SyntaxKind.LessThanToken:
        result = operandType.isSigned
          ? category.lt_s(left, right)
          : category.lt_u(left, right);
        break;

      case ts.SyntaxKind.LessThanEqualsToken:
        result = operandType.isSigned
          ? category.le_s(left, right)
          : category.le_u(left, right);
        break;

    }

    // sign-extend respectively mask small integer results
    if (result && (resultType.isByte || resultType.isShort))
      result = compiler.maybeConvertValue(node, result, Type.i32, resultType, true);
  }

  if (result)
    return isCompound
      ? compileAssignmentWithValue(compiler, node, result, contextualType)
      : result;

  compiler.report(node.operatorToken, ts.DiagnosticsEx.Unsupported_node_kind_0_in_1, node.operatorToken.kind, "expressions.compileBinary");
  return op.unreachable();
}

export default compileBinary;

/** Compiles a binary assignment expression. */
export function compileAssignment(compiler: Compiler, node: ts.BinaryExpression, contextualType: Type): Expression {
  compiler.compileExpression(node.left, contextualType); // determines left type (usually an identifier anyway)
  const leftType = getReflectedType(node.left);
  const right = compiler.compileExpression(node.right, getReflectedType(node.left));
  const rightType = getReflectedType(node.right);

  if (leftType.underlyingClass && (!rightType.underlyingClass || !rightType.underlyingClass.isAssignableTo(leftType.underlyingClass)))
    compiler.report(node.right, ts.DiagnosticsEx.Types_0_and_1_are_incompatible, leftType.underlyingClass.name, ts.getTextOfNode(node.right));

  return compileAssignmentWithValue(compiler, node, right, contextualType);
}

/** Compiles a binary assignment expression with a pre-computed value. */
export function compileAssignmentWithValue(compiler: Compiler, node: ts.BinaryExpression, value: Expression, contextualType: Type): Expression {
  const op = compiler.module;

  setReflectedType(node, contextualType);

  // identifier = expression
  if (node.left.kind === ts.SyntaxKind.Identifier) {
    const reference = compiler.resolveReference(<ts.Identifier>node.left, ReflectionObjectKind.GlobalVariable | ReflectionObjectKind.LocalVariable);
    if (reference instanceof VariableBase) {
      const variable = <VariableBase>reference;
      const expression = compiler.maybeConvertValue(node.right, value, getReflectedType(node.right), variable.type, false);

      if (contextualType === Type.void)
        return variable instanceof LocalVariable
          ? op.setLocal((<LocalVariable>variable).index, expression)
          : op.setGlobal(variable.name, expression);

      setReflectedType(node, variable.type);
      return variable instanceof LocalVariable
        ? op.teeLocal((<LocalVariable>variable).index, expression)
        : op.block("", [ // emulates teeGlobal
            op.setGlobal(variable.name, expression),
            op.getGlobal(variable.name, compiler.typeOf(variable.type))
          ], compiler.typeOf(variable.type));
    }

  } else if (node.left.kind === ts.SyntaxKind.ElementAccessExpression)
    return compileElementAccess(compiler, <ts.ElementAccessExpression>node.left, contextualType, node.right);

  else if (node.left.kind === ts.SyntaxKind.PropertyAccessExpression)
    return compilePropertyAccess(compiler, <ts.PropertyAccessExpression>node.left, contextualType, node.right);

  compiler.report(node.operatorToken, ts.DiagnosticsEx.Unsupported_node_kind_0_in_1, node.operatorToken.kind, "expressions.compileAssignmentWithValue");
  return op.unreachable();
}

/** Compiles a binary logical AND or OR expression. */
export function compileLogicalAndOr(compiler: Compiler, node: ts.BinaryExpression): Expression {
  const op = compiler.module;

  setReflectedType(node, Type.bool);

  const left = compileIsTrueish(compiler, node.left);
  const right = compileIsTrueish(compiler, node.right);

  // &&
  if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
    return op.select(
      left,
      /* ? */ right,
      /* : */ compiler.valueOf(Type.i32, 0)
    );

  // ||
  else if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    return op.select(
      left,
      /* ? */ compiler.valueOf(Type.i32, 1),
      /* : */ right
    );

  compiler.report(node.operatorToken, ts.DiagnosticsEx.Unsupported_node_kind_0_in_1, node.operatorToken.kind, "expressions.compileLogicalAndOr");
  return op.unreachable();
}

/** Compiles any expression so that it evaluates to a boolean result indicating whether it is true-ish. */
export function compileIsTrueish(compiler: Compiler, node: ts.Expression): Expression {
  const op = compiler.module;

  const expr = compiler.compileExpression(node, Type.i32);
  const type = getReflectedType(node);

  setReflectedType(node, Type.bool);

  switch (type.kind) {
    case TypeKind.u8:
    case TypeKind.i8:
    case TypeKind.i16:
    case TypeKind.u16:
    case TypeKind.i32:
    case TypeKind.u32:
    case TypeKind.bool:
      return op.i32.ne(expr, op.i32.const(0));

    case TypeKind.i64:
    case TypeKind.u64:
      return op.i64.ne(expr, op.i64.const(0, 0));

    case TypeKind.f32:
      return op.f32.ne(expr, op.f32.const(0));

    case TypeKind.f64:
      return op.f64.ne(expr, op.f64.const(0));

    case TypeKind.usize: // TODO: special handling of strings?
      if (compiler.usizeSize === 4)
        return op.i32.ne(expr, op.i32.const(0));
      else
        return op.i64.ne(expr, op.i64.const(0, 0));
  }

  compiler.report(node, ts.DiagnosticsEx.Unsupported_node_kind_0_in_1, node.kind, "expressions.compileIsTrueish");
  return op.unreachable();
}
