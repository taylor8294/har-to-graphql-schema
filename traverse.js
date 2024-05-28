import { Kind } from 'graphql';

export function* traverseAst(node) {
  if (!node) return;

  if (Array.isArray(node)) {
    for (const childNode of node) {
      yield* traverseAst(childNode);
    }
  } else if (typeof node === 'object') {
    yield node;
    switch (node.kind) {
      /** Name */
      case Kind.NAME:
        break;
      /** Document */
      case Kind.DOCUMENT:
        yield* traverseAst(node.definitions);
        break;
      case Kind.OPERATION_DEFINITION:
        // if (node.variableDefinitions && node.variableDefinitions.length) {
        //   yield* traverseAst(node.variableDefinitions);
        // }
        // if (node.selectionSet && node.selectionSet.selections && node.selectionSet.selections.length) {
        //   yield* traverseAst(node.selectionSet.selections);
        // }
        break;
      case Kind.VARIABLE_DEFINITION:
        break;
      case Kind.SELECTION_SET:
        if (node.selections && node.selections.length) {
          yield* traverseAst(node.selections);
        }
        break;
      case Kind.FIELD:
        if (node.arguments) {
          yield* traverseAst(node.arguments);
        }
        if (node.selectionSet && node.selectionSet.selections && node.selectionSet.selections.length) {
          yield* traverseAst(node.selectionSet.selections);
        }
        break;
      case Kind.ARGUMENT:
        if (node.value && node.value.kind == Kind.OBJECT && node.value.fields && node.value.fields.length) {
          yield* traverseAst(node.value.fields);
        }
        break;
      /** Fragments */
      case Kind.FRAGMENT_SPREAD:
        break;
      case Kind.INLINE_FRAGMENT:
        if (node.selectionSet && node.selectionSet.selections && node.selectionSet.selections.length) {
          yield* traverseAst(node.selectionSet.selections);
        }
        break;
      case Kind.FRAGMENT_DEFINITION:
        // if (node.selectionSet && node.selectionSet.selections && node.selectionSet.selections.length) {
        //   yield* traverseAst(node.selectionSet.selections);
        // }
        break;
      /** Values */
      case Kind.VARIABLE:
        break;
      case Kind.INT:
        break;
      case Kind.FLOAT:
        break;
      case Kind.STRING:
        break;
      case Kind.BOOLEAN:
        break;
      case Kind.NULL:
        break;
      case Kind.ENUM:
        break;
      case Kind.LIST:
        if (node.values && node.values.length) {
          yield* traverseAst(node.values);
        }
        break;
      case Kind.OBJECT:
        if (node.fields && node.fields.length) {
          yield* traverseAst(node.fields);
        }
        break;
      case Kind.OBJECT_FIELD:
        if (node.value && node.value.kind == Kind.OBJECT && node.value.fields && node.value.fields.length) {
          yield* traverseAst(node.value.fields);
        }
        break;
      /** Directives */
      case Kind.DIRECTIVE:
        break;
      /** Types */
      case Kind.NAMED_TYPE:
        break;
      case Kind.LIST_TYPE:
        break;
      case Kind.NON_NULL_TYPE:
        break;
      /** Type System Definitions */
      /** Type System Extensions */
      case Kind.SCHEMA_DEFINITION:
      case Kind.SCHEMA_EXTENSION:
        if (node.operationTypes && node.operationTypes.length) {
          yield* traverseAst(node.operationTypes);
        }
        break;
      case Kind.OPERATION_TYPE_DEFINITION:
        break;
      /** Type Definitions */
      /** Type Extensions */
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.SCALAR_TYPE_EXTENSION:
        break;
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
        if (node.fields && node.fields.length) {
          yield* traverseAst(node.fields);
        }
        break;
      case Kind.FIELD_DEFINITION:
        if (node.arguments) {
          yield* traverseAst(node.arguments);
        }
        break;
      case Kind.INPUT_VALUE_DEFINITION:
        break;
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_EXTENSION:
        if (node.fields && node.fields.length) {
          yield* traverseAst(node.fields);
        }
        break;
      case Kind.UNION_TYPE_DEFINITION:
      case Kind.UNION_TYPE_EXTENSION:
        if (node.types && node.types.length) {
          yield* traverseAst(node.types);
        }
        break;
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.ENUM_TYPE_EXTENSION:
        if (node.values && node.values.length) {
          yield* traverseAst(node.values);
        }
        break;
      case Kind.ENUM_VALUE_DEFINITION:
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        if (node.fields && node.fields.length) {
          yield* traverseAst(node.fields);
        }
        break;
      /** Directive Definitions */
      case Kind.DIRECTIVE_DEFINITION:
        if (node.arguments) {
          yield* traverseAst(node.arguments);
        }
        if (node.locations) {
          yield* traverseAst(node.locations);
        }
        break;
      default:
        break;
    }
  }
}

    /* // Possible top level nodes
    switch (node.kind) {
      case Kind.DIRECTIVE_DEFINITION:
        console.log('DIRECTIVE_DEFINITION')
        break;
      case Kind.SCALAR_TYPE_DEFINITION:
      case Kind.SCALAR_TYPE_EXTENSION:
        console.log('SCALAR_TYPE_DEFINITION')
        break;
      case Kind.SCHEMA_DEFINITION:
      case Kind.SCHEMA_EXTENSION:
        console.log('SCHEMA_DEFINITION')
        break;
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
        console.log('OBJECT_TYPE_DEFINITION')
        break;
      case Kind.INTERFACE_TYPE_DEFINITION:
      case Kind.INTERFACE_TYPE_EXTENSION:
        console.log('INTERFACE_TYPE_DEFINITION')
        break;
      case Kind.UNION_TYPE_DEFINITION:
      case Kind.UNION_TYPE_EXTENSION:
        console.log('UNION_TYPE_DEFINITION')
        break;
      case Kind.ENUM_TYPE_DEFINITION:
      case Kind.ENUM_TYPE_EXTENSION:
        console.log('ENUM_TYPE_DEFINITION')
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
      case Kind.INPUT_OBJECT_TYPE_EXTENSION:
        console.log('INPUT_OBJECT_TYPE_DEFINITION')
        break;
      case Kind.FRAGMENT_DEFINITION:
        console.log('FRAGMENT_DEFINITION')
        break;
      case Kind.OPERATION_TYPE_DEFINITION:
        console.log('OPERATION_TYPE_DEFINITION')
        break;
      case Kind.OPERATION_DEFINITION:
        console.log('OPERATION_DEFINITION')
        break;
      default:
        break;
    }*/