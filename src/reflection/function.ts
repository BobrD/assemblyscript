/** @module assemblyscript/reflection */ /** */

import * as ts from "../typescript";
import { Expression, Type as BinaryenType, Function as BinaryenFunction, Signature } from "binaryen";
import { isRuntimeFunction } from "../builtins";
import { Class } from "./class";
import { Compiler } from "../compiler";
import { ReflectionObject, ReflectionObjectKind } from "./object";
import { Type, TypeArgumentsMap } from "./type";
import { LocalVariable } from "./variable";
import { isDeclare, isExport, isStatic, getReflectedClass, getReflectedClassTemplate, setReflectedFunction, setReflectedFunctionTemplate } from "../util";

/** A function handle consisting of its instance, if any, and its template. */
export interface FunctionHandle {
  template: FunctionTemplate;
  instance?: Function;
}

/** Common base class of {@link Function} and {@link FunctionTemplate}. */
export abstract class FunctionBase extends ReflectionObject {

  /** Simple name. */
  simpleName: string;
  /** Declaration reference. */
  declaration: ts.FunctionLikeDeclaration;
  /** Class declaration reference, if any. */
  classDeclaration?: ts.ClassDeclaration;

  protected constructor(kind: ReflectionObjectKind, compiler: Compiler, name: string, declaration: ts.FunctionLikeDeclaration) {
    super(kind, compiler, name);
    this.simpleName = ts.getTextOfNode(<ts.Identifier>declaration.name);
    this.declaration = declaration;
    if (declaration.parent && declaration.parent.kind === ts.SyntaxKind.ClassDeclaration)
      this.classDeclaration = <ts.ClassDeclaration>declaration.parent;
  }

  /** Tests if this function is an import. */
  get isImport(): boolean { return isDeclare(this.declaration) && (this.compiler.options.noRuntime || ts.getSourceFileOfNode(this.declaration) !== this.compiler.libraryFile || !isRuntimeFunction(this.name)); }

  /** Tests if this function is exported. */
  get isExport(): boolean { return isExport(this.declaration, true) && ts.getSourceFileOfNode(this.declaration) === this.compiler.entryFile; }

  /** Tests if this function is an instance member / not static. */
  get isInstance(): boolean { return this.isConstructor || !isStatic(this.declaration) && this.declaration.kind === ts.SyntaxKind.MethodDeclaration; }

  /** Tests if this function is the constructor of a class. */
  get isConstructor(): boolean { return this.declaration.kind === ts.SyntaxKind.Constructor; }

  /** Tests if this function is a getter. */
  get isGetter(): boolean { return this.declaration.kind === ts.SyntaxKind.GetAccessor; }

  /** Tests if this function is a setter. */
  get isSetter(): boolean { return this.declaration.kind === ts.SyntaxKind.SetAccessor; }

  /** Tests if this function is generic. */
  get isGeneric(): boolean {
    return Boolean(
      this.declaration.typeParameters && this.declaration.typeParameters.length ||
      this.isInstance && this.classDeclaration && this.classDeclaration.typeParameters && this.classDeclaration.typeParameters.length
    );
  }

  toString(): string { return this.name; }
}

/** Interface describing a reflected function parameter. */
export interface FunctionParameter {
  /** Simple name. */
  name: string;
  /** Resolved type. */
  type: Type;
  /** Parameter node reference. */
  node: ts.Node;
  /** Whether this parameter also introduces a property (like when used with the `public` keyword). */
  isAlsoProperty?: boolean;
  /** Optional value initializer. */
  initializer?: ts.Expression;
}

/** A function instance with generic parameters resolved. */
export class Function extends FunctionBase {

  /** Internal name for use with call operations. */
  internalName: string;
  /** Corresponding function template. */
  template: FunctionTemplate;
  /** Concrete type arguments. */
  typeArguments: ts.NodeArray<ts.TypeNode> | ts.TypeNode[];
  /** Resolved type arguments. */
  typeArgumentsMap: TypeArgumentsMap;
  /** Function parameters including `this`. */
  parameters: FunctionParameter[];
  /** Resolved return type. */
  returnType: Type;
  /** Parent class, if any. */
  parent?: Class;
  /** Body reference, if not just a declaration. */
  body?: ts.Block | ts.Expression;
  /** Current unique local id. */
  uniqueLocalId: 1;

  // Set on initialization

  /** Local variables. */
  locals: LocalVariable[];
  /** Local variables by name for lookups. */
  localsByName: { [key: string]: LocalVariable };
  /** Resolved binaryen parameter types. */
  binaryenParameterTypes: BinaryenType[];
  /** Resolved binaryen return type. */
  binaryenReturnType: BinaryenType;
  /** Binaryen signature id, for example "iiv". */
  binaryenSignatureId: string;

  // Set on compilation

  /** Binaryen signature reference. */
  binaryenSignature: Signature;
  /** Whether this function has already been compiled. */
  compiled: boolean = false;
  /** Whether this function has been imported. */
  imported: boolean = false;
  /** Number of the current break context. */
  breakNumber: number = 0;
  /** Depth within the current break context. */
  breakDepth: number = 0;
  /** Binaryen function reference. */
  binaryenFunction: BinaryenFunction;

  /** Constructs a new reflected function instance and binds it to its TypeScript declaration. */
  constructor(compiler: Compiler, name: string, template: FunctionTemplate, typeArguments: ts.NodeArray<ts.TypeNode> | ts.TypeNode[], typeArgumentsMap: TypeArgumentsMap, parameters: FunctionParameter[], returnType: Type, parent?: Class, body?: ts.Block | ts.Expression) {
    super(ReflectionObjectKind.Function, compiler, name, template.declaration);

    if (!this.compiler.options.noRuntime && isRuntimeFunction(this.name, true))
      this.internalName = "." + this.simpleName;
    else
      this.internalName = this.name;

    // register
    if (compiler.functions[this.name])
      throw Error("duplicate function: " + this.name);
    compiler.functions[this.name] = this;
    if (!this.isGeneric) setReflectedFunction(template.declaration, this);

    // initialize
    this.template = template;
    this.typeArguments = typeArguments;
    this.typeArgumentsMap = compiler.resolveTypeArgumentsMap(typeArguments, this.declaration, typeArgumentsMap);
    this.parameters = parameters;
    this.returnType = returnType;
    this.parent = parent;
    this.body = body;

    this.binaryenParameterTypes = [];
    this.locals = [];
    this.localsByName = {};
    const ids: string[] = [];

    for (let i = 0, k = this.parameters.length; i < k; ++i) {
      const variable = new LocalVariable(this.compiler, this.parameters[i].name, this.parameters[i].type, this.locals.length, true);
      this.binaryenParameterTypes.push(this.compiler.typeOf(this.parameters[i].type));
      this.locals.push(variable);
      this.localsByName[variable.name] = variable;
      ids.push(this.compiler.identifierOf(this.parameters[i].type));
    }

    this.binaryenReturnType = this.compiler.typeOf(this.returnType);
    ids.push(this.compiler.identifierOf(this.returnType));

    this.binaryenSignatureId = ids.join("");
  }

  /** Gets the current break label for use with binaryen loops and blocks. */
  get breakLabel(): string { return this.breakNumber + "." + this.breakDepth; }

  /** Introduces an additional local variable of the specified name and type. */
  addLocal(name: string, type: Type, mutable: boolean = true, value: number | Long | null = null): LocalVariable {
    const variable = new LocalVariable(this.compiler, name, type, this.locals.length, mutable, value);
    this.locals.push(variable);
    this.localsByName[variable.name] = variable;
    return variable;
  }

  /** Introduces an additional unique local variable of the specified type. */
  addUniqueLocal(type: Type, prefix: string = ""): LocalVariable {
    return this.addLocal("." + (prefix || this.compiler.identifierOf(type)) + this.uniqueLocalId++, type);
  }

  /** Compiles a call to this function using the specified arguments. Arguments to instance functions include `this` as the first argument or can specifiy it in `thisArg`. */
  compileCall(argumentNodes: ts.NodeArray<ts.Expression> | ts.Expression[], thisArg?: Expression): Expression {
    const operands: Expression[] = new Array(this.parameters.length);
    let operandIndex = 0;

    if (thisArg !== undefined)
      operands[operandIndex++] = thisArg;

    if (operandIndex + argumentNodes.length > this.parameters.length)
      throw Error("too many arguments: " + argumentNodes.length + " > " + this.parameters.length); // handled by typescript

    // specified arguments
    for (let i = 0; i < argumentNodes.length && operandIndex < this.parameters.length; ++i, ++operandIndex)
      operands[operandIndex] = this.compiler.compileExpression(argumentNodes[i], this.parameters[operandIndex].type, this.parameters[operandIndex].type, false);

    // omitted arguments
    while (operandIndex < this.parameters.length) {
      const initializer = this.parameters[operandIndex].initializer;
      let expr: Expression;
      if (initializer) {
        // FIXME: initializers are currently compiled in the context of the calling function,
        // preventing proper usage of 'this'
        expr = this.compiler.compileExpression(initializer, this.parameters[operandIndex].type, this.parameters[operandIndex].type, false);
      } else
        throw Error("too few arguments: " + operandIndex + " < " + this.parameters.length); // handled by typescript
      operands[operandIndex++] = expr;
    }

    if (operandIndex !== operands.length)
      throw Error("unexpected operand index");

    return this.call(operands);
  }

  /** Makes a call to this function using the specified operands. */
  call(operands: Expression[]): Expression {

    // Compile if not yet compiled
    if (!this.compiled)
      this.compiler.compileFunction(this);

    const op = this.compiler.module;
    return (this.isImport ? op.callImport : op.call)(this.internalName, operands, this.compiler.typeOf(this.returnType));
  }
}

export default Function;

/** A function template with possibly unresolved generic parameters. */
export class FunctionTemplate extends FunctionBase {

  /** Declaration reference. */
  declaration: ts.FunctionLikeDeclaration;
  /** So far resolved instances by global name. */
  instances: { [key: string]: Function };
  /** Parent class, if any. */
  parent: Class | undefined;

  /** Constructs a new reflected function template and binds it to its TypeScript declaration. */
  constructor(compiler: Compiler, name: string, declaration: ts.FunctionLikeDeclaration, parent?: Class) {
    super(ReflectionObjectKind.FunctionTemplate, compiler, name, declaration);

    if (this.isInstance && !parent)
      throw Error("missing parent");

    this.parent = parent;

    // register
    if (compiler.functionTemplates[this.name])
      throw Error("duplicate function template: " + this.name);
    compiler.functionTemplates[this.name] = this;
    setReflectedFunctionTemplate(declaration, this);

    // initialize
    this.declaration = declaration;
    this.instances = {};
  }

  /** Resolves this possibly generic function against the provided type arguments. */
  resolve(typeArguments: ts.NodeArray<ts.TypeNode> | ts.TypeNode[], typeArgumentsMap?: TypeArgumentsMap): Function {

    // determine the parent class if this is an instance method
    let parent: Class | undefined;
    if (this.isInstance) {
      if (!(this.declaration.parent && this.declaration.parent.kind === ts.SyntaxKind.ClassDeclaration))
        throw Error("missing parent of " + this);

      // fast route: look for the non-generic class instance
      parent = getReflectedClass(<ts.ClassDeclaration>this.declaration.parent);

      // slow route: resolve the generic class template to the matching instance
      if (!parent) {
        const parentTemplate = getReflectedClassTemplate(<ts.ClassDeclaration>this.declaration.parent);
        if (!parentTemplate)
          throw Error("missing parent template of " + this);

        const classTypeArguments: ts.TypeNode[] = [];
        const classTypeParameters = parentTemplate.declaration.typeParameters;
        if (classTypeParameters) {
          if (!typeArgumentsMap)
            throw Error("missing type arguments map for " + this);
          for (let i = 0, k = classTypeParameters.length; i < k; ++i) {
            const typeName = ts.getTextOfNode(classTypeParameters[i].name);
            if (typeArgumentsMap[typeName])
              classTypeArguments.push(typeArgumentsMap[typeName].node);
            else
              throw Error("missing class type argument of " + this + ": " + typeName);
          }
        }
        parent = parentTemplate.resolve(classTypeArguments, typeArgumentsMap);
      }
    }

    const typeParametersCount = this.declaration.typeParameters && this.declaration.typeParameters.length || 0;
    if (typeArguments.length !== typeParametersCount)
      throw Error("type parameter count mismatch in " + this + ": expected " + typeParametersCount + " but saw " + typeArguments.length);

    let name = this.name;

    // Inherit contextual type arguments, if applicablee
    if (!typeArgumentsMap)
      typeArgumentsMap = {};

    // Inherit class type arguments, if an instance method
    if (parent && this.isInstance)
      Object.keys(parent.typeArgumentsMap).forEach(key => (<TypeArgumentsMap>typeArgumentsMap)[key] = (<Class>parent).typeArgumentsMap[key]);

    // Handle function type arguments
    if (typeParametersCount) {
      const typeNames: string[] = new Array(typeParametersCount);
      for (let i = 0; i < typeParametersCount; ++i) {
        const parameterDeclaration = (<ts.NodeArray<ts.TypeParameterDeclaration>>this.declaration.typeParameters)[i];
        const type = this.compiler.resolveType(typeArguments[i], false, typeArgumentsMap) || Type.void; // reports
        const typeName = ts.getTextOfNode(<ts.Identifier>parameterDeclaration.name);
        typeArgumentsMap[typeName] = {
          type: type,
          node: <ts.TypeNode><any>parameterDeclaration
        };
        typeNames[i] = type.toString();
      }
      name += "<" + typeNames.join(",") + ">";
    }

    if (this.instances[name])
      return this.instances[name];

    // Resolve function parameters
    const parameters: FunctionParameter[] = new Array(this.declaration.parameters.length);
    for (let i = 0, k = this.declaration.parameters.length; i < k; ++i) {
      const parameter = this.declaration.parameters[i];

      if (!parameter.type)
        this.compiler.report(parameter.name, ts.DiagnosticsEx.Type_expected);

      if (parameter.questionToken && !isDeclare(this.declaration, true) && !parameter.initializer)
        this.compiler.report(parameter.questionToken, ts.DiagnosticsEx.Optional_parameters_must_specify_an_initializer);

      parameters[i] = {
        node: parameter,
        name: ts.getTextOfNode(parameter.name),
        type: parameter.type
          ? this.compiler.resolveType(parameter.type, false, typeArgumentsMap) || Type.void // reports
          : Type.void,
        initializer: parameter.initializer
      };
      if (!parameter.type && ts.getSourceFileOfNode(this.declaration) !== this.compiler.libraryFile) // library may use 'any'
        this.compiler.report(parameter.name, ts.DiagnosticsEx.Type_expected);
    }
    if (this.isInstance) {
      parameters.unshift({
        node: this.declaration,
        name: "this",
        type: this.compiler.usizeType
      });
    }

    let returnType: Type;
    if (parent && this.isConstructor)
      returnType = parent.type;
    else if (this.declaration.type) {
      const returnTypeNode = this.declaration.type;
      if (returnTypeNode.kind === ts.SyntaxKind.ThisType && parent)
        returnType = parent.type;
      else
        returnType = this.compiler.resolveType(returnTypeNode, true, typeArgumentsMap) || Type.void; // reports
    } else {
      returnType = Type.void;
      if (ts.getSourceFileOfNode(this.declaration) !== this.compiler.libraryFile && this.declaration.kind !== ts.SyntaxKind.SetAccessor) // library may use 'any'
        this.compiler.report(<ts.Identifier>this.declaration.name, ts.DiagnosticsEx.Assuming_return_type_0, "void");
    }

    return this.instances[name] = new Function(this.compiler, name, this, typeArguments, typeArgumentsMap, parameters, returnType, parent, this.declaration.body);
  }
}
