/** Imports */
import fs from 'fs';
import { parse } from 'graphql';

import { traverseAst } from './traverse.js';
import { processNode } from './ast.js';
import { expandFragmentSpreads, checkFragmentTypes } from './utils.js';
import { schemaObjectToSdl } from './sdl.js';

/** Load HAR file and get relevant entries */
const fileContents = fs.readFileSync('sample.har');  
const jsonContents = JSON.parse(fileContents);  
const harEntries = jsonContents.log.entries.filter(entry => {
  const url = entry.request.url.toLowerCase();
  return url.includes('graphql') && entry.request.postData && entry.request.postData.mimeType == 'application/json'
});

/** Schema storage object */
const SCHEMA = {types: {}, fragments: {}, inputs: {}, queries: {}, mutations: {}};

/** For each HAR entry, process AST of the GraphQL query and store diclosed schema information in the storage object */
harEntries.map(entry => {
  const {variables, query} = entry.request.postData ? JSON.parse(entry.request.postData.text) : {};
  const result = entry.response.content.text ? JSON.parse(entry.response.content.text) : null;

  const ast = parse(query);
  const iterator = traverseAst(ast.definitions);
  let current = iterator.next();

  while (!current.done) {
    const node = current.value;
    processNode(SCHEMA, node, variables, result);
    current = iterator.next();
  }

  /** See if we can pick up any type information from the output now everthing has been processed */
  ast.definitions.filter(n => n.kind == 'OperationDefinition').forEach(op => {
    let queries = op.selectionSet.selections.map(n => n.name.value);
    queries.forEach(q => checkFragmentTypes(SCHEMA, result, (op.operation == 'mutation' ? SCHEMA.mutations : SCHEMA.queries)[q]));
  })
});
  
/** Set schema field types to JSON for any that haven't been able to be determined */
Object.keys(SCHEMA.types).forEach(k => {
  SCHEMA.types[k].fields = expandFragmentSpreads(SCHEMA, SCHEMA.types[k].fields);
})

/** Convert the schema object we've built up into standard SDL text and output to a file */
fs.writeFileSync('sample.graphql', schemaObjectToSdl(SCHEMA));