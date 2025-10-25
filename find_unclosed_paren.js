const fs = require('fs');
const s = fs.readFileSync('c:/Users/welcome/Desktop/DNS Checker/dnsCheckerComponent.js','utf8');
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
  if(c === '(') stack.push(i);
  if(c === ')'){
    if(stack.length === 0){ console.log('Unmatched ) at pos', i); process.exit(1); }
    stack.pop();
  }
}
if(stack.length>0){
  const last = stack[stack.length-1];
  const prefix = s.slice(0,last);
  const line = prefix.split(/\r?\n/).length;
  const col = last - prefix.lastIndexOf('\n');
  console.log('Unclosed ( at pos', last, 'line', line, 'col', col);
} else {
  console.log('All parentheses closed');
}
