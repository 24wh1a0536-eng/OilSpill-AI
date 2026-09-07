const fs = require('fs'); const path = require('path');
const data = path.join(__dirname, '..', 'data');
fs.mkdirSync(data, { recursive: true }); fs.copyFileSync(path.join(data, 'demo.json'), path.join(data, 'runtime.json'));
console.log('Demo dataset restored.');
