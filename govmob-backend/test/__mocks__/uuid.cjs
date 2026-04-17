// Sequential UUID mock to allow multiple inserts in same transaction during e2e tests
// but keep them somewhat deterministic / readable.

let counter = 0;

function generateUuid(version) {
  counter++;
  const hex = counter.toString(16).padStart(12, '0');
  return `00000000-0000-${version}000-8000-${hex}`;
}

const v1 = () => generateUuid(1);
const v3 = () => generateUuid(3);
const v4 = () => generateUuid(4);
const v5 = () => generateUuid(5);
const v6 = () => generateUuid(6);
const v7 = () => generateUuid(7);

const parse = () => new Uint8Array(16);
const stringify = () => generateUuid(7);
const validate = () => true;
const version = () => 7;

module.exports = {
  __esModule: true,
  MAX: null,
  NIL: '00000000-0000-0000-0000-000000000000',
  parse,
  stringify,
  v1,
  v3,
  v4,
  v5,
  v6,
  v7,
  validate,
  version,
  default: {
    v1, v3, v4, v5, v6, v7, parse, stringify, validate, version
  }
};
