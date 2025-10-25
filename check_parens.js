const fs = require('fs');
const s = fs.readFileSync('./dnsCheckerComponent.js','utf8');
const pairs = { '(': ')', '[': ']', '{': '}' };
let stack = [];
let inSingle=false,inDouble=false,inBack=false,esc=false;
for(let i=0;i<s.length;i++){
  const c = s[i];
  if(esc){ esc=false; continue; }
  if(c === '\\') { esc=true; continue; }
  if(inSingle){ if(c === "'") inSingle=false; continue; }
  if(inDouble){ if(c === '"') inDouble=false; continue; }
  if(inBack){ if(c === '`') inBack=false; continue; }
  if(c === "'") { inSingle = true; continue; }
  if(c === '"') { inDouble = true; continue; }
  if(c === '`') { inBack = true; continue; }
  if(pairs[c]) { stack.push({ch:c, pos:i}); continue; }
  if(Object.values(pairs).includes(c)){
    if(stack.length === 0){ console.log('Unmatched closing', c, 'at pos', i); process.exit(1); }
    const last = stack.pop();
    const expected = pairs[last.ch];
    if(c !== expected){
      // compute line/col
      const prefix = s.slice(0,i);
      const line = prefix.split(/\r?\n/).length;
      const col = i - prefix.lastIndexOf('\n');
      console.log(`Mismatched ${last.ch} expected ${expected} but got ${c} at pos ${i} (line ${line} col ${col})`);
      process.exit(2);
    }
  }
}
if(stack.length>0){ console.log('Unclosed openings:', stack.map(x=>x.ch+'@'+x.pos).join(', ')); process.exit(3); }
console.log('All balanced');
