type JsonTree =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<JsonTree>
  | { [key: string]: JsonTree };

const isJsonArray = (value: JsonTree): value is Array<JsonTree> => Array.isArray(value);

/**
 * Compares the way `toJSON` would: key order is immaterial and an `undefined`
 * property is an absent one, since a zod re-parse or a spread may reorder keys
 * or leave an optional key set to `undefined` without changing the model.
 */
const jsonEqual = (a: JsonTree, b: JsonTree): boolean => {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  if (isJsonArray(a) || isJsonArray(b)) {
    return (
      isJsonArray(a) &&
      isJsonArray(b) &&
      a.length === b.length &&
      a.every((item, index) => jsonEqual(item, b[index]))
    );
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => jsonEqual(a[key], b[key]));
};

export { jsonEqual };
