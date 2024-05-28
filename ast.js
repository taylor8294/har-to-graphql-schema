import { Kind } from 'graphql';

import { flatten, objToFields, detectType, checkType, mergeFields, getBaseType, SCALARS, getValueFromKeyArray } from './utils.js';

/** AST processing functions */
export function getTypeStr(typeNode){
  if(typeNode.kind == 'ListType')
    return '['+getTypeStr(typeNode.type)+']'
  if(typeNode.kind == 'NonNullType')
    return getTypeStr(typeNode.type)+'!'
  return typeNode.name.value
}

export function processNode(schema, node, input, output){
  switch(node.kind){
    case Kind.OPERATION_DEFINITION:
      console.log('');
      processOperationDefinition(schema, node, input, output);
      break;
    case Kind.FRAGMENT_DEFINITION:
      console.log('');
      processFragmentDefinition(schema, node, input, output);
      break;
    default:
      console.log(`${node.kind} nodes are not currently supported - ignoring.`);
      break;
  }
}

function processOperationDefinition(schema, node, input, output){
  console.log(`Handling Operation ${node.name.value}`);
  const op = {
    operation: node.operation,
    name: node.name.value,
    variables: node.variableDefinitions ? node.variableDefinitions.map(v => {
      return {
        name: v.variable.name.value,
        type: getTypeStr(v.type)
      }
    }) : [],
    queries: node.selectionSet.selections.map(s => {
      const query = {
        name: s.name.value,
        alias: s.alias ? s.alias.value : '',
        type: '',
        /** Pick up argument type from ancestor node's variable definition with same name */
        arguments: s.arguments ? s.arguments.map(a => {
          let variable = a.value.kind === 'Variable' ? node.variableDefinitions.find(v => v.variable.name.value == a.value.name.value) : null;
          if(!variable) console.log(`Could not determine Argument ${a.name.value}'s Type from parent variable`);
          return {
            name: a.name.value,
            type: variable ? getTypeStr(variable.type) : ''
          }
        }) : []
      }
      /** Store current query name so it can be looked up from output */
      const outputKeys = [query.alias ? query.alias : query.name];
      /** For each selection, process according to its kind */
      query.fields = Object.fromEntries(flatten(s.selectionSet.selections.map(t => {
        if(t.kind === Kind.FIELD){
          const g = processField(schema, t, input, output, outputKeys);
          return [g.name, g];
        } else if(t.kind === Kind.FRAGMENT_SPREAD){
          const g = processFragmentSpread(schema, t, input, output, outputKeys, query);
          return [g.name, g];
        } else if(t.kind === Kind.INLINE_FRAGMENT){
          const g = processInlineFragment(schema, t, input, output, outputKeys, query);
          return [g.name, g];
        } else {
          console.log(`Found unsupported ${t.kind} in selectionSet on Operation ${node.name.value} Type ${s.name.value} Field ${t.name}`)
        }
      }).filter(arr => !!arr)));
      /** If output is available, detect field types from the returned values */
      if(output && output.data){
        const dataKey = query.alias ? query.alias : query.name;
        if(dataKey in output.data && output.data[dataKey]){
          query.type = detectType(output.data[dataKey]);
          mergeFields(schema, objToFields(schema, output.data[dataKey]), query.fields, false, false);
        }
      }
      return query
    })
  }
  
  const storage = op.operation == 'query' ? schema.queries : (op.operation == 'mutation' ? schema.mutations : null);
  if(!storage){
    console.log(`Operation type ${op.operation} not supported`)
  } else {
    /** For each query in operation, check if we've seen this query before */
    op.queries.forEach(q=>{
      if(!(q.name in storage)){
        /** If not, add it */
        console.log(`Adding ${op.operation == 'query' ? 'Query' : 'Mutation'} ${q.name}`);
        storage[q.name] = q;
      } else {
        /** If so, check if type is different */
        if(!storage[q.name].type || storage[q.name].type.includes('JSON') && q.type && !q.type.includes('JSON')){
          storage[q.name].type = q.type;
        }
        /** Check if any of the queries fields are different */
        if(q.fields){
          mergeFields(schema, q.fields, storage[q.name].fields, true, false)
        }
      }
      /** Check if we've seen this type before */
      checkType(schema, q.type, q.fields);
    })
  }

  /** Check if there are any new inputs in the variables */
  op.variables.forEach(v => {
    const baseType = getBaseType(v.type);
    if(!SCALARS.includes(baseType)){
      // TODO - does this work for arrays?
      if(!(baseType in schema.inputs)){
        console.log(`Adding Input ${baseType} from Operation ${op.name} Variable ${v.name}`);
        schema.inputs[baseType] = {
          name: baseType,
          /** If variable is available in the input, store keys as fields and detect types from the values passed in */
          fields: v.name in input ? objToFields(schema, input[v.name]) : []
        };
      } else {
        mergeFields(schema, objToFields(schema, input[v.name]), schema.inputs[baseType].fields, true, true);
      }
    }
  });
}

function processFragmentDefinition(schema, node, input, output){
  console.log(`Handling Fragment ${node.name.value}`);
  const fragment = {
    name: node.name.value,
    type: node.typeCondition.name.value
  };
  /** For each selection, process according to its kind */
  fragment.fields = Object.fromEntries(flatten(node.selectionSet.selections.map(s => {
    if(s.kind === Kind.FIELD){
      const g = processField(schema, s, input, output, null);
      return [g.name, g];
    } else if(s.kind === Kind.FRAGMENT_SPREAD){
      const g = processFragmentSpread(schema, s, input, output, null, fragment);
      return [g.name, g];
    } else if(s.kind === Kind.INLINE_FRAGMENT){
      const g = processInlineFragment(schema, s, input, output, null, fragment);
      return [g.name, g];
    } else {
      console.log(`Found unsupported ${s.kind} in selectionSet on Fragment ${node.name.value}`)
    }
  }).filter(arr => !!arr)));
  /** TODO If output is available, detect field types from the returned values - do this elsewhere?
  if(getValueFromKeyArray(output.data, global.outputKeys)){
    // TODO - does not handle fragments nested in the output
    mergeFields(schema, objToFields(schema, getValueFromKeyArray(output.data, global.outputKeys)), fragment.fields);
  }*/
  /** Check if we've seen this fragment before, add it if not */
  if(!(fragment.name in schema.fragments)){
    console.log(`Adding Fragment ${fragment.name}`);
    schema.fragments[fragment.name] = fragment;
  }
  /** Check if we've seen this type before */
  checkType(schema, fragment.type, fragment.fields);
}

/** Process a field node, possibly recursively if it has its own subfields */
function processField(schema, node, input, output, outputKeys){
  //console.log(`Handling Field ${node.name.value}`);
  const field = {
    name: node.name.value,
    type: node.name.value == '__typename' ? 'String!' : ''
  }
  if(node.selectionSet){
    const newOutputKeys = outputKeys ? outputKeys.concat([field.name]) : null;
    /** For each selection, process according to its kind */
    field.fields = Object.fromEntries(flatten(node.selectionSet.selections.map(s => {
      if(s.kind === Kind.FIELD){
        const g = processField(schema, s, input, output, newOutputKeys);
        return [g.name, g];
      } else if(s.kind === Kind.FRAGMENT_SPREAD){
        const g = processFragmentSpread(schema, s, input, output, newOutputKeys, field);
        return [g.name, g];
      } else if(s.kind === Kind.INLINE_FRAGMENT){
        const g = processInlineFragment(schema, s, input, output, newOutputKeys, field);
        return [g.name, g];
      } else {
        console.log(`Found unsupported ${s.kind} in selectionSet on Field ${node.name.value}`)
      }
    }).filter(arr => !!arr)))
  }
  return field;
}

/** Process a fragment spread */
function processFragmentSpread(schema, node, input, output, outputKeys, parent){
  console.log(`Handling FragmentSpread ${node.name.value}`);
  if(parent && node.name.value in schema.fragments && schema.fragments[node.name.value].type && (
    !parent.type || (parent.type.includes('JSON') && !schema.fragments[node.name.value].type.includes('JSON'))
  )){
    console.log(`Adding Type ${schema.fragments[node.name.value].type} to ${parent.name} from FragmentSpread`);
    parent.type = schema.fragments[node.name.value].type;
  }
  return {
    name: node.name.value,
    type: 'FragmentSpread',
    outputKeys
  }
}

/** Process an inline fragment node, recursively if it's fields have their own subfields */
// TODO - output this in SDL
function processInlineFragment(schema, node, input, output, outputKeys, parent){
  console.log(`Handling InlineFragment on Type ${node.typeCondition.name.value}`);
  const inlineFrag = {
    name: node.typeCondition.name.value,
    type: 'InlineFragment'
  }
  inlineFrag.fields = Object.fromEntries(flatten(node.selectionSet.selections.map(s => {
    if(s.kind === Kind.FIELD){
      const g = processField(schema, s, input, output, outputKeys);
      return [g.name, g];
    } else if(s.kind === Kind.FRAGMENT_SPREAD){
      const g = processFragmentSpread(schema, s, input, output, outputKeys, inlineFrag);
      return [g.name, g];
    } else if(s.kind === Kind.INLINE_FRAGMENT){
      const g = processInlineFragment(schema, s, input, output, outputKeys, inlineFrag);
      return [g.name, g];
    } else {
      console.log(`Found unsupported ${s.kind} in selectionSet on InlineFragment on Type ${node.typeCondition.name.value}`)
    }
  }).filter(arr => !!arr)));
  // TODO - note union type ( parent could be of type typeCondition)?
  return inlineFrag;
}