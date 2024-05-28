//** Get's a nested value from an object given array of keys */
export function getValueFromKeyArray(obj,keys){
  if(!obj || !keys || keys.length == 0)
    return undefined;
  for(let i=0; i<keys.length; i++){
    if(!(keys[i] in obj))
      return undefined;
    obj = obj[keys[i]]
  }
  return obj
}

/** Deep clones a variable */
export function deepClone(arg) {
  if (typeof arg === 'string') {
      return arg;
  } else if (typeof arg === 'number') {
      return arg;
  } else if (typeof arg === 'boolean') {
      return arg;
  } else if (Array.isArray(arg)) {
      return arg.map(i => deepClone(i));
  } else if (typeof arg === 'object') {
      if(!arg) return arg;
      const newObj = {};
      Object.keys(arg).forEach(k => {
        newObj[k] = deepClone(arg[k]);
      });
      return newObj;
  }
}

export function removeTypename(arg) {
  if (typeof arg === 'string') {
      return arg;
  } else if (typeof arg === 'number') {
      return arg;
  } else if (typeof arg === 'boolean') {
      return arg;
  } else if (Array.isArray(arg)) {
      return arg.map(i => removeTypename(i));
  } else if (typeof arg === 'object') {
    if(!arg) return arg;
    const newObj = {};
    Object.keys(arg).forEach(k => {
      if(k !== '__typename')
        newObj[k] = removeTypename(deepClone(arg[k]));
    });
    return newObj;
  }
}

export function expandFragmentSpreads(schema, obj) {
  const newObj = {};
  Object.keys(obj).forEach(k => {
    if(obj[k] && obj[k].type && obj[k].type == 'FragmentSpread'){
      if(k in schema.fragments){
        console.log(`Expanding FragmentSpread ${k} into it's ${schema.fragments[k].type} Fields`)
        Object.keys(schema.fragments[k].fields).forEach(l => {
          newObj[l] = deepClone(schema.fragments[k].fields[l])
        });
      } else {
        // TODO - add FragmentSpread here?
      }
    } else {
      newObj[k] = deepClone(obj[k]);
    }
  });
  return newObj;
}

export function expandInlineFragments(schema, obj) {
  const newObj = {};
  Object.keys(obj).forEach(k => {
    if(obj[k] && obj[k].type && obj[k].type == 'InlineFragment'){
      // TODO
      // if(k in schema.fragments){
      //   console.log(`Expanding FragmentSpread ${k} into it's ${schema.fragments[k].type} Fields`)
      //   Object.keys(schema.fragments[k].fields).forEach(l => {
      //     newObj[l] = deepClone(schema.fragments[k].fields[l])
      //   });
      // } else {
      //   // Do nothing
      // }
      newObj[k] = deepClone(obj[k]);
    } else {
      newObj[k] = deepClone(obj[k]);
    }
  });
  return newObj;
}

/** Flattens an array of arrays to be max 1 level deep */
export function flatten(multiarr){
  let flat = []
  multiarr.forEach(el => {
    if(Array.isArray(el[0])){
      const nestedFlat = flatten(el);
      flat = flat.concat(nestedFlat)
    } else {
      flat.push(el);
    }
  })
  return flat;
}

/** Detect field names and types from input/output variable */
export function objToFields(schema, obj){
  const fields = {};
  Object.keys(obj).forEach(k => {
    let detected = detectType(obj[k]), subfields = null;
    /** Handle arrays of types */
    if(detected[0]==='[' && obj[k].length && typeof obj[k][0] == 'object'){
      subfields = objToFields(schema,obj[k][0])
    }
    /** Handle object types */
    else if (detected[0]!=='[' && obj[k] && typeof obj[k] === 'object'){
      subfields = objToFields(schema,obj[k])
    }
    fields[k] = {
      name: k,
      type: detected
    }
    if(subfields){
      fields[k]['fields'] = subfields;
    }
    /** Check if we've seen this type before */
    checkType(schema,detected,fields[k].fields);
  })
  return fields;
}
export function detectType(value) {
  const typeOf = typeof value;
  if (typeOf === 'number'){
      if(value === Math.floor(value)) return 'Int';
      else return 'Float';
  }
  if (typeOf === 'string')
      return 'String';
  if (typeOf === 'boolean')
      return 'Boolean';
  if (value instanceof Date)
      return 'Date';
  if (typeOf === 'object') {
      if (value === null)
          return 'JSON';
      if('__typename' in value)
          return value['__typename'];
      if (Array.isArray(value)) {
          return `[${detectType(value[0])}]`;
      } else {
          return 'JSON'
      }
  }
  return 'JSON';
}
export function getBaseType(typeString){
  return typeString.replace(/\[|\]|!/g,'')
}
export const SCALARS = ['String','Int','Float','Boolean','Date'];
export function checkType(schema, type, fields, add = true){
  if(!type || !fields) return;
  type = getBaseType(type);
  if(!SCALARS.includes(type)){
    /** Check if we've seen this type before */
    if(!type.includes('JSON') && !(type in schema.types)){
      /** We haven't seen this before, add it */
      console.log(`New Type ${type} detected from checkType`);
      schema.types[type] = {
        name: type,
        fields: removeTypename(deepClone(fields))
      }
    } else {
      /** We have seen this before, check for new fields */
      mergeFields(schema, fields, schema.types[type].fields, add, true)
    }
  }
}

/** Use FragmentSpread.outputKeys to look up type information from output */
export function checkFragmentTypes(schema, output, queryField){
  Object.keys(queryField.fields).forEach(k => {
    if(queryField.fields[k].type == 'FragmentSpread'){
      const spreadOutput = getValueFromKeyArray(output.data, queryField.fields[k].outputKeys);
      if(spreadOutput && schema.fragments[queryField.fields[k].name].type in schema.types){
        console.log(`Updated Type ${schema.fragments[queryField.fields[k].name].type} based on FragmentSpread ${queryField.fields[k].name} output`)
        mergeFields(schema, objToFields(schema, spreadOutput), schema.types[schema.fragments[queryField.fields[k].name].type].fields, false)
      } else {
        console.log(`Could not find FragmentSpread ${queryField.fields[k]} in output`)
      }
    }
    if(queryField.fields[k].fields)
      checkFragmentTypes(schema, output, queryField.fields[k]);
  })
}

/** Merge detected types with ones parse from query */
export function mergeFields(schema, newFields, storedFields, add = false){
  Object.keys(newFields).forEach(k => {
    /** If this is a new field and add=true, add it */
    if(!(k in storedFields) && add){
      /** Set add to false when comparing result to query as new fields here are most likely just due to a freagmentSpread being resolved to its fields */
      console.log(`Added new Field ${k} from mergeFields`);
      storedFields[k] = deepClone(newFields[k]);
    } else if(k in storedFields) {
      /** If this field does exist, check if type is different */
      if(!storedFields[k].type || (storedFields[k].type.includes('JSON') && !newFields[k].type.includes('JSON'))){
        /** Detected type looks better than the currently stored one, overwrite */
        if(storedFields[k].type != '') console.log(`Overwriting generic Type ${storedFields[k].type} with detected Type ${newFields[k].type} for Field ${k}`);
        storedFields[k].type = newFields[k].type;
        // TODO - checkType here?
      }
      /** If there are subfields */
      if(newFields[k].fields){
        if(storedFields[k].fields){
          //** Recurse */
          mergeFields(schema, newFields[k].fields, storedFields[k].fields, add);
        } else if(add){
          /** If for some reason we have subfields when we didn't before, just store them all */
          console.log(`Added entirely new subfields to Field ${k} from mergeFields`);
          storedFields[k].fields = deepClone(newFields[k].fields);
        }
      }
    }
  })
}

export function addFallbackType(fields,fallback){
  Object.keys(fields).forEach(k => {
    if(!fields[k].type){
      fields[k].type = fallback;
    }
    if(fields[k].fields){
      addFallbackType(fields[k].fields,fallback);
    }
  })
}