const fs = require('fs')
const f = []

let a = fs.readFileSync('.env',{ encoding: 'utf8', flag: 'r' });
let e = a.split('\r\n');
for (const i of e) {
  let x = i.split('=');
  f.push({
    name:x[0],
    value:x[1],
    "slotSetting": false
  })
  
}
console.log(JSON.stringify(f));