//** Function to take our custom JSON structure to full SDL */
function fieldsToStr(fields, depth=0){
  let output = '';
  Object.keys(fields).forEach(k => {
    switch(fields[k].type){
      case 'FragmentSpread':
        output += '  '.repeat(depth+1)+'...'+fields[k].name+(
          fields[k].fields && Object.keys(fields[k].fields).length ?
          ' {\n'+fieldsToStr(fields[k].fields,depth+1)+'  '.repeat(depth+1)+'}' :
          ''
        )+'\n'
        break;
      case 'InlineFragment':
        output += '  '.repeat(depth+1)+'... on '+fields[k].name+(
          fields[k].fields && Object.keys(fields[k].fields).length ?
          ' {\n'+fieldsToStr(fields[k].fields,depth+1)+'  '.repeat(depth+1)+'}' :
          ''
        )+'\n';
        break;
      default:
        output += '  '.repeat(depth+1)+fields[k].name+(
          fields[k].fields && Object.keys(fields[k].fields).length ?
          ' {\n'+fieldsToStr(fields[k].fields,depth+1)+'  '.repeat(depth+1)+'}' :
          ''
        )+'\n';
    }
  })
  return output;
}

export function schemaObjectToSdl({types, fragments, inputs, queries, mutations}){
  let output = ['###\n# Scalar\n###','scalar JSON','\n###\n# Types\n###']
  Object.keys(types).forEach(k => {
    const fields = Object.values(types[k].fields).filter(f => !['FragmentSpread','InlineFragment'].includes(f.type) && f.name!='__typename').map(f => `${f.name}: ${f.type ? f.type : 'JSON'}`).join('\n  ');
    if(fields)
      output.push(`type ${types[k].name} {\n  ${fields}\n}`)
    else
      output.push(`type ${types[k].name} {\n  __typename: String!\n}`)
  });
  output.push('\n###\n# Inputs\n###');
  Object.keys(inputs).forEach(k => {
    const fields = Object.values(inputs[k].fields).filter(f => !['FragmentSpread','InlineFragment'].includes(f.type) && f.name!='__typename').map(f => `${f.name}: ${f.type ? f.type : 'JSON'}`).join('\n  ');
    if(fields)
      output.push(`input ${inputs[k].name} {\n  ${fields}\n}`)
    else
      output.push(`type ${inputs[k].name} {\n  __typename: String!\n}`)
  });
  output.push('\n###\n# Fragments\n###');
  Object.keys(fragments).forEach(k => {
    const frag = fragments[k], fields = Object.values(frag.fields);
    output.push(`fragment ${frag.name} on ${frag.type} {\n${fieldsToStr(fields)}}`)
  });
  output.push('\n###\n# Queries and Mutations\n###'); //TODO - Add inlineFragments to output
  output.push('type Query {');
  Object.keys(queries).forEach(k => {
    const q = queries[k];
    let str = `  ${q.name}`;
    if(q.arguments && q.arguments.length){
      str += `(${q.arguments.map(v => `${v.name}: ${v.type}`).join(', ')})`
    }
    str += `: ${q.type ? q.type : 'JSON'}`;
    output.push(str);
  });
  output.push('}')
  output.push('type Mutation {');
  Object.keys(mutations).forEach(k => {
    const q = mutations[k];
    let str = `  ${q.name}`;
    if(q.arguments && q.arguments.length){
      str += `(${q.arguments.map(v => `${v.name}: ${v.type}`).join(', ')})`
    }
    str += `: ${q.type ? q.type : 'JSON'}`;
    output.push(str);
  });
  output.push('}')
  /*output.push('\n###\n# Operations\n###');
  Object.keys(queries).forEach(k => {
    const q = queries[k];
    let str = `${q.operation} ${q.name}`;
    if(q.variables && q.variables.length){
      str += `(${q.variables.map(v => `$${v.name}: ${v.type}`).join(', ')})`
    }
    str += ' {\n'
    q.fields.forEach(t => {
      str += `  ${t.name}`;
      if(t.arguments && t.arguments.length){
        str += `(${t.arguments.map(v => `${v.name}: ${v.type}`).join(', ')})`
      }
      str += ` {\n${fieldsToStr(t.fields,1)}  }`;
    })
    str += `\n}`;
    output.push(str)
  });
  Object.keys(mutations).forEach(k => {
    const q = mutations[k];
    let str = `${q.operation} ${q.name}`;
    if(q.variables && q.variables.length){
      str += `(${q.variables.map(v => `$${v.name}: ${v.type}`).join(', ')})`
    }
    str += ' {\n'
    q.fields.forEach(t => {
      str += `  ${t.name}`;
      if(t.arguments && t.arguments.length){
        str += `(${t.arguments.map(v => `${v.name}: ${v.type}`).join(', ')})`
      }
      str += ` {\n${fieldsToStr(t.fields,1)}  }`;
    })
    str += `\n}`;
    output.push(str)
  });*/
  return output.join('\n');
}