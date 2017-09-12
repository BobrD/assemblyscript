/** @module assemblyscript/expressions */ /** */

import { Expression } from "binaryen";
import { Compiler } from "../../compiler";
import { Type } from "../../reflection";
import { compileLoad } from "./load";
import { compileStore } from "./store";

/** Helper compiling a load operation if `valueToSet` has been omitted, otherwise a store operation. */
export function compileLoadOrStore(compiler: Compiler, type: Type, ptr: Expression, offset: number, valueToSet?: Expression, valueToSetContextualType?: Type): Expression {

  // load expression
  if (valueToSet === undefined)
    return compileLoad(compiler, type, ptr, offset);

  // store statement
  if (valueToSetContextualType === Type.void)
    return compileStore(compiler, type, ptr, offset, valueToSet);

  // store expression
  const op = compiler.module;
  const binaryenType = compiler.typeOf(type);

  // TODO: this uses a temporary local because the 'ptr' expression might exhibit side-effects,
  // i.e. if it includes a postfix unary expression or similar. but: if 'ptr' is just a get_local,
  // this is actually unnecessary, though this function does not have the information to decide that.
  // note: binaryen's optimizer seems to be able to eliminate the temp. local in this case, for now.
  const tempVar = compiler.currentFunction.localsByName[type.tempName] || compiler.currentFunction.addLocal(type.tempName, type);

  return op.block("", [
    op.setLocal(tempVar.index, ptr),
    compileStore(compiler, type, op.getLocal(tempVar.index, binaryenType), offset, valueToSet),
    compileLoad(compiler, type, op.getLocal(tempVar.index, binaryenType), offset)
  ], binaryenType);
}

export default compileLoadOrStore;
