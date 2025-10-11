const { bridgeSIMD } = require('./bridge-wrapper');

const smallJson = JSON.stringify({ hello: 'world', items: Array.from({ length: 128 }, (_, i) => i) });

console.log('Calling bridgeSIMD...');
const r = bridgeSIMD(smallJson);
console.log('bridgeSIMD returned', r);
