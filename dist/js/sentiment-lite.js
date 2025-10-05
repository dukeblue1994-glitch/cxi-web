const L = {
  pos: new Set(['good','great','nice','respectful','fast','helpful','clear','polite','kind','thoughtful','on-time','responsive']),
  neg: new Set(['bad','slow','rude','unclear','late','dismissive','condescending','ghosted','pushy','unprofessional','biased','hostile']),
  boost: new Set(['very','extremely','super','really']),
  negator: new Set(['not',"isn't","wasn't","aren't","weren't","no","hardly","rarely"])
};
export function nssFromText(s){
  const t = (s||'').toLowerCase().split(/\s+/).map(x=>x.replace(/[^a-z'-]/g,'')).filter(Boolean);
  let score = 0;
  for (let i=0;i<t.length;i++){
    let v = 0; if (L.pos.has(t[i])) v=1; if (L.neg.has(t[i])) v=-1;
    if (L.negator.has(t[i-1])) v = -v; if (L.boost.has(t[i-1]) && v) v *= 1.5;
    score += v;
  }
  return Math.max(-1, Math.min(1, Math.sign(score)));
}
