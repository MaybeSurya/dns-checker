const fs=require('fs');
const s=fs.readFileSync('./dnsCheckerComponent.js','utf8');
let inS=false,inD=false,inB=false,esc=false;let count=0;const lines=s.split(/\r?\n/);
lines.forEach((ln,idx)=>{
  for(let i=0;i<ln.length;i++){
    const c=ln[i];
    if(esc){esc=false;continue;}
    if(c==='\\'){esc=true;continue;}
    if(inS){ if(c==="'") inS=false; continue; }
    if(inD){ if(c==='"') inD=false; continue; }
    if(inB){ if(c==='`') inB=false; continue; }
    if(c==="'") { inS=true; continue; }
    if(c==='"'){ inD=true; continue; }
    if(c==='`'){ inB=true; continue; }
    if(c==='(') count++; if(c===')') count--;
  }
  if(count!==0) console.log((idx+1).toString().padStart(4,' ')+" count="+count+" "+ln);
});
console.log('final count',count);
