// =====================================================================
// algorithms.js — Image loading, sampling, algorithms, UI wiring
// Depends on: scenes.js (COLORS, SAMPLES)
// =====================================================================

// ── Globals ──────────────────────────────────────────────────────────
let loadedImage  = null;
let currentAlgo  = 'ransac';
let currentCspace = 'RGB';
let currentPrimitive = 'line';

const cInput  = document.getElementById('c-input');
const cOutput = document.getElementById('c-output');
const ctxIn   = cInput.getContext('2d');
const ctxOut  = cOutput.getContext('2d');

// ── Logger ───────────────────────────────────────────────────────────
const LOG = (() => {
  const panel = () => document.getElementById('log-panel');
  let startMs = 0;
  function ts() {
    return `+${((performance.now()-startMs)/1000).toFixed(2)}s`;
  }
  function append(cls, msg) {
    const p = panel();
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-ts">${ts()}</span><span class="${cls}">${msg}</span>`;
    p.appendChild(line);
    p.scrollTop = p.scrollHeight;
  }
  return {
    start(label) {
      startMs = performance.now();
      panel().innerHTML = '';
      append('log-info', `▶ Starting ${label}`);
    },
    info: msg => append('log-info', msg),
    ok:   msg => append('log-ok',   '✓ ' + msg),
    warn: msg => append('log-warn', '⚠ ' + msg),
    iter: msg => append('log-iter', msg),
    step: msg => append('log-info', '→ ' + msg),
  };
})();

// ── Progress bar ─────────────────────────────────────────────────────
function setProgress(pct) {
  const wrap = document.getElementById('progress-wrap');
  const bar  = document.getElementById('progress-bar');
  wrap.style.display = (pct >= 100 || pct < 0) ? 'none' : 'block';
  bar.style.width = Math.min(pct, 100) + '%';
}

// ── Stats panel ──────────────────────────────────────────────────────
function setStats(clusters, ms, pts, inliers, totalIters) {
  document.getElementById('s-status').textContent = 'DONE';
  document.getElementById('s-status').className = 'sv2 good';
  document.getElementById('s-status-mini').textContent = 'DONE';
  document.getElementById('s-time').textContent = ms.toFixed(0) + 'ms';
  document.getElementById('s-time-mini').textContent = ms.toFixed(0) + 'ms';
  document.getElementById('s-pts').textContent = pts.toLocaleString();
  document.getElementById('s-pts-mini').textContent = pts.toLocaleString();
  document.getElementById('s-cl').textContent = clusters;
  document.getElementById('s-iters').textContent = totalIters !== undefined ? totalIters.toLocaleString() : '—';
  if (inliers !== undefined && pts > 0) {
    const rate = ((inliers / pts) * 100).toFixed(1) + '%';
    const el = document.getElementById('s-inlrate');
    el.textContent = rate;
    el.className = 'sv2 ' + (inliers/pts > 0.3 ? 'good' : inliers/pts > 0.1 ? '' : 'warn');
  } else {
    document.getElementById('s-inlrate').textContent = '—';
  }
}

// ── Legend ───────────────────────────────────────────────────────────
function setLegend(items) {
  const lg = document.getElementById('legend');
  if (!items.length) {
    lg.innerHTML = '<span class="li" style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;color:var(--dim)">Legend appears after running</span>';
    return;
  }
  lg.innerHTML = items.map(it =>
    `<div class="li"><div class="li-dot" style="background:${it.color}"></div>${it.label}</div>`
  ).join('');
}

// ── Draw helpers ─────────────────────────────────────────────────────
function showOutput(title) {
  document.getElementById('ph-out').style.display = 'none';
  cOutput.style.display = 'block';
  cOutput.width  = loadedImage.width;
  cOutput.height = loadedImage.height;
  document.getElementById('out-title').textContent = title;
  document.getElementById('badge-out').textContent = 'RUNNING';
  document.getElementById('badge-out').className = 'cp-badge running';
}
function finishOutput() {
  document.getElementById('badge-out').textContent = 'DONE';
  document.getElementById('badge-out').className = 'cp-badge done';
}

// ── Image loading ─────────────────────────────────────────────────────
function setImage(sourceCanvas) {
  const W = sourceCanvas.width, H = sourceCanvas.height;
  cInput.width = W; cInput.height = H;
  ctxIn.drawImage(sourceCanvas, 0, 0);
  loadedImage = ctxIn.getImageData(0, 0, W, H);

  document.getElementById('ph-in').style.display = 'none';
  cInput.style.display = 'block';
  document.getElementById('badge-in').textContent = `${W}×${H}`;
  document.getElementById('badge-in').className = 'cp-badge done';
  document.getElementById('btn-run').disabled = false;
  document.getElementById('btn-run').textContent = '▶ RUN ALGORITHM';

  document.getElementById('ph-out').style.display = 'flex';
  cOutput.style.display = 'none';
  document.getElementById('badge-out').textContent = 'WAITING';
  document.getElementById('badge-out').className = 'cp-badge';
  setLegend([]);

  LOG.start('IMAGE LOADED');
  LOG.ok(`Image ready — ${W}×${H}px (${(W*H/1000).toFixed(0)}k pixels)`);
  LOG.info('Select an algorithm and primitive, adjust parameters, then click Run');
}

function loadImageFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const oc = document.createElement('canvas');
      const maxW = 800, maxH = 600;
      let w = img.width, h = img.height;
      if (w > maxW) { h = h*(maxW/w); w = maxW; }
      if (h > maxH) { w = w*(maxH/h); h = maxH; }
      oc.width = Math.round(w); oc.height = Math.round(h);
      oc.getContext('2d').drawImage(img, 0, 0, oc.width, oc.height);
      setImage(oc);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function buildSamples() {
  const grid = document.getElementById('sample-grid');
  SAMPLES.forEach((s, si) => {
    const btn = document.createElement('button');
    btn.className = 'sample-btn';
    const tn = document.createElement('canvas');
    tn.width = 120; tn.height = 60;
    s.fn(tn.getContext('2d'), 120, 60);
    const lbl = document.createElement('div');
    lbl.className = 'slabel'; lbl.textContent = s.name;
    btn.appendChild(tn); btn.appendChild(lbl);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sample-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSample(si);
    });
    grid.appendChild(btn);
  });
}

function loadSample(idx) {
  const S = SAMPLES[idx];
  const oc = document.createElement('canvas');
  oc.width = 600; oc.height = 400;
  S.fn(oc.getContext('2d'), 600, 400);
  setImage(oc);
}

// ── Point sampling ────────────────────────────────────────────────────
function samplePoints(n) {
  if (!loadedImage) return [];
  const {data, width, height} = loadedImage;
  const pts = [];
  const step = Math.max(1, Math.floor(Math.sqrt(width * height / n)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i+1], b = data[i+2];
      const lum = 0.299*r + 0.587*g + 0.114*b;
      pts.push({
        x: x + (Math.random()-0.5)*step,
        y: y + (Math.random()-0.5)*step,
        r, g, b, depth: lum
      });
    }
  }
  for (let i = pts.length-1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [pts[i],pts[j]] = [pts[j],pts[i]];
  }
  return pts.slice(0, n);
}

// ── Color space conversion ────────────────────────────────────────────
function toColorSpace(r, g, b, space) {
  if (space === 'RGB') return [r/255, g/255, b/255];
  if (space === 'HSV') {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0;
    if(d>0){
      if(max===r) h=((g-b)/d)%6;
      else if(max===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h/=6; if(h<0)h+=1;
    }
    return [h, max===0?0:d/max, max];
  }
  if (space === 'LAB') {
    const lin = v => { v/=255; return v>0.04045 ? Math.pow((v+0.055)/1.055,2.4) : v/12.92; };
    const rl=lin(r),gl=lin(g),bl=lin(b);
    const X=(rl*0.4124+gl*0.3576+bl*0.1805)/0.95047;
    const Y=(rl*0.2126+gl*0.7152+bl*0.0722)/1.00000;
    const Z=(rl*0.0193+gl*0.1192+bl*0.9505)/1.08883;
    const f = v => v>0.008856 ? Math.cbrt(v) : 7.787*v+16/116;
    return [(116*f(Y)-16)/100, (500*(f(X)-f(Y))+128)/255, (200*(f(Y)-f(Z))+128)/255];
  }
  return [r/255, g/255, b/255];
}
function colorDist(a, b) {
  return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2;
}

// ── RANSAC shared helpers ─────────────────────────────────────────────
function getRansacParams() {
  return {
    nPts:      parseInt(document.getElementById('sl-spts').value),
    iters:     parseInt(document.getElementById('sl-iters').value),
    thresh:    parseInt(document.getElementById('sl-thresh').value),
    minInlPct: parseInt(document.getElementById('sl-mininl').value) / 100,
  };
}
function ransacSetup(title) {
  const p = getRansacParams();
  const pts = samplePoints(p.nPts);
  p.minInl = Math.floor(pts.length * p.minInlPct);
  showOutput(title);
  ctxOut.drawImage(cInput, 0, 0);
  ctxOut.fillStyle = 'rgba(10,12,15,0.52)';
  ctxOut.fillRect(0, 0, cOutput.width, cOutput.height);
  return { p, pts };
}
function drawOutliers(pts, inlierSet) {
  pts.forEach((pt, i) => {
    if (!inlierSet.has(i)) {
      ctxOut.fillStyle = 'rgba(120,140,160,0.25)';
      ctxOut.beginPath(); ctxOut.arc(pt.x, pt.y, 1.5, 0, Math.PI*2); ctxOut.fill();
    }
  });
}
function convexHull(points) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a,b) => a.x-b.x || a.y-b.y);
  const cross = (O,A,B) => (A.x-O.x)*(B.y-O.y)-(A.y-O.y)*(B.x-O.x);
  const lower=[], upper=[];
  for (const p of sorted) { while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop(); lower.push(p); }
  for (let i=sorted.length-1;i>=0;i--) { const p=sorted[i]; while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop(); upper.push(p); }
  upper.pop(); lower.pop(); return lower.concat(upper);
}
function circumcircle(A,B,C) {
  const ax=A.x,ay=A.y,bx=B.x,by=B.y,cx=C.x,cy=C.y;
  const D=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));
  if(Math.abs(D)<1e-6) return null;
  const ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/D;
  const uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/D;
  return {cx:ux,cy:uy,r:Math.sqrt((ax-ux)**2+(ay-uy)**2)};
}

// ── RANSAC — Line ─────────────────────────────────────────────────────
function runRansacLine() {
  const t0 = performance.now();
  const maxLines = parseInt(document.getElementById('sl-planes').value);
  LOG.start(`RANSAC LINE — up to ${maxLines} lines`);
  const {p, pts} = ransacSetup('RANSAC — LINE FITTING');
  LOG.step(`${pts.length} pts, ${p.iters} iters, threshold=${p.thresh}px`);
  setProgress(5);

  let remaining = pts.map((_,i) => i);
  const results = [];
  let totalIters = 0;

  for (let pl = 0; pl < maxLines && remaining.length > p.minInl; pl++) {
    let best=null, bestInl=[];
    for (let it = 0; it < p.iters; it++) {
      totalIters++;
      const ai=Math.floor(Math.random()*remaining.length);
      const bi=Math.floor(Math.random()*remaining.length);
      if (ai===bi) continue;
      const {x:x1,y:y1}=pts[remaining[ai]], {x:x2,y:y2}=pts[remaining[bi]];
      const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
      if (len<2) continue;
      const a=-dy/len, b=dx/len, c=-(a*x1+b*y1);
      const inl=remaining.filter(i=>Math.abs(a*pts[i].x+b*pts[i].y+c)<p.thresh);
      if (inl.length>bestInl.length) { bestInl=inl; best={a,b,c}; }
    }
    setProgress(5+((pl+1)/maxLines)*85);
    if (!best||bestInl.length<p.minInl) { LOG.warn(`Line ${pl+1}: only ${bestInl.length} inliers — stopping`); break; }
    LOG.ok(`Line ${pl+1}: ${bestInl.length} inliers (${(bestInl.length/pts.length*100).toFixed(1)}%)`);
    results.push({model:best, inliers:bestInl, color:COLORS[pl%COLORS.length]});
    const iset=new Set(bestInl); remaining=remaining.filter(i=>!iset.has(i));
  }

  const allInl = new Set(results.flatMap(r=>r.inliers));
  drawOutliers(pts, allInl);
  const W=cOutput.width, H=cOutput.height;
  results.forEach(({model:{a,b,c},inliers,color}) => {
    inliers.forEach(i=>{ctxOut.fillStyle=color;ctxOut.beginPath();ctxOut.arc(pts[i].x,pts[i].y,2.5,0,Math.PI*2);ctxOut.fill();});
    const p1=Math.abs(b)>0.01?[0,-(a*0+c)/b]:[-c/a,0];
    const p2=Math.abs(b)>0.01?[W,-(a*W+c)/b]:[-c/a,H];
    ctxOut.save();ctxOut.strokeStyle=color;ctxOut.lineWidth=2.5;ctxOut.shadowColor=color;ctxOut.shadowBlur=10;
    ctxOut.beginPath();ctxOut.moveTo(...p1);ctxOut.lineTo(...p2);ctxOut.stroke();ctxOut.restore();
  });

  const t1=performance.now(), totalInl=results.reduce((s,r)=>s+r.inliers.length,0);
  LOG.ok(`Done — ${results.length} lines, ${totalInl} inliers, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100); finishOutput();
  setStats(results.length, t1-t0, pts.length, totalInl, totalIters);
  setLegend([...results.map((r,i)=>({color:r.color,label:`LINE ${i+1} — ${r.inliers.length} inliers`})),{color:'rgba(120,140,160,0.5)',label:'OUTLIERS'}]);
}

// ── RANSAC — Plane ────────────────────────────────────────────────────
function runRansacPlane() {
  const t0=performance.now();
  const maxPlanes=parseInt(document.getElementById('sl-maxplanes').value);
  LOG.start(`RANSAC PLANE — up to ${maxPlanes} regions`);
  const {p,pts}=ransacSetup('RANSAC — PLANE REGIONS');
  LOG.step(`${pts.length} pts, threshold=${(p.thresh*1.5).toFixed(0)}px band`);
  setProgress(5);

  let remaining=pts.map((_,i)=>i);
  const results=[];
  let totalIters=0;

  for (let pl=0;pl<maxPlanes&&remaining.length>p.minInl;pl++) {
    let best=null,bestInl=[];
    for (let it=0;it<p.iters;it++) {
      totalIters++;
      const si=[0,1,2].map(()=>remaining[Math.floor(Math.random()*remaining.length)]);
      if(new Set(si).size<3) continue;
      const [p0,p1,p2]=si.map(i=>pts[i]);
      const dx=p1.x-p0.x,dy=p1.y-p0.y,len=Math.sqrt(dx*dx+dy*dy);
      if(len<2) continue;
      const a=-dy/len,b=dx/len,c=-(a*p0.x+b*p0.y);
      const inl=remaining.filter(i=>Math.abs(a*pts[i].x+b*pts[i].y+c)<p.thresh*1.5);
      if(inl.length>bestInl.length){bestInl=inl;best={a,b,c};}
    }
    setProgress(5+((pl+1)/maxPlanes)*85);
    if(!best||bestInl.length<p.minInl){LOG.warn(`Plane ${pl+1}: ${bestInl.length} inliers — stopping`);break;}
    LOG.ok(`Plane ${pl+1}: ${bestInl.length} inliers`);
    results.push({model:best,inliers:bestInl,color:COLORS[pl%COLORS.length]});
    const iset=new Set(bestInl);remaining=remaining.filter(i=>!iset.has(i));
  }

  const allInl=new Set(results.flatMap(r=>r.inliers));
  drawOutliers(pts,allInl);
  results.forEach(({inliers,color})=>{
    inliers.forEach(i=>{ctxOut.fillStyle=color+'cc';ctxOut.beginPath();ctxOut.arc(pts[i].x,pts[i].y,3,0,Math.PI*2);ctxOut.fill();});
    const hull=convexHull(inliers.map(i=>pts[i]));
    if(hull.length>2){
      ctxOut.save();ctxOut.strokeStyle=color;ctxOut.lineWidth=2;ctxOut.fillStyle=color+'22';
      ctxOut.shadowColor=color;ctxOut.shadowBlur=8;
      ctxOut.beginPath();ctxOut.moveTo(hull[0].x,hull[0].y);
      hull.forEach(pt=>ctxOut.lineTo(pt.x,pt.y));
      ctxOut.closePath();ctxOut.fill();ctxOut.stroke();ctxOut.restore();
    }
  });

  const t1=performance.now(),totalInl=results.reduce((s,r)=>s+r.inliers.length,0);
  LOG.ok(`Done — ${results.length} planes, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100);finishOutput();
  setStats(results.length,t1-t0,pts.length,totalInl,totalIters);
  setLegend([...results.map((r,i)=>({color:r.color,label:`PLANE ${i+1} — ${r.inliers.length} inliers`})),{color:'rgba(120,140,160,0.5)',label:'OUTLIERS'}]);
}

// ── RANSAC — Circle ───────────────────────────────────────────────────
function runRansacCircle() {
  const t0=performance.now();
  const maxCircles=parseInt(document.getElementById('sl-maxcircles').value);
  const minR=parseInt(document.getElementById('sl-minr').value);
  const maxR=parseInt(document.getElementById('sl-maxr').value);
  LOG.start(`RANSAC CIRCLE — up to ${maxCircles} circles, r=[${minR},${maxR}]px`);
  const {p,pts}=ransacSetup('RANSAC — CIRCLE FITTING');
  LOG.step(`${pts.length} pts, radial threshold=${p.thresh}px`);
  setProgress(5);

  let remaining=pts.map((_,i)=>i);
  const results=[];
  let totalIters=0;

  for(let ci=0;ci<maxCircles&&remaining.length>p.minInl;ci++){
    let best=null,bestInl=[];
    for(let it=0;it<p.iters;it++){
      totalIters++;
      const ai=remaining[Math.floor(Math.random()*remaining.length)];
      const bi=remaining[Math.floor(Math.random()*remaining.length)];
      const di=remaining[Math.floor(Math.random()*remaining.length)];
      if(ai===bi||bi===di||ai===di) continue;
      const circ=circumcircle(pts[ai],pts[bi],pts[di]);
      if(!circ) continue;
      const {cx,cy,r}=circ;
      if(r<minR||r>maxR) continue;
      const inl=remaining.filter(i=>Math.abs(Math.sqrt((pts[i].x-cx)**2+(pts[i].y-cy)**2)-r)<p.thresh);
      if(inl.length>bestInl.length){bestInl=inl;best={cx,cy,r};}
    }
    setProgress(5+((ci+1)/maxCircles)*85);
    if(!best||bestInl.length<p.minInl){LOG.warn(`Circle ${ci+1}: ${bestInl.length} inliers — stopping`);break;}
    LOG.ok(`Circle ${ci+1}: center=(${best.cx.toFixed(0)},${best.cy.toFixed(0)}) r=${best.r.toFixed(1)}px, ${bestInl.length} inliers`);
    results.push({model:best,inliers:bestInl,color:COLORS[ci%COLORS.length]});
    const iset=new Set(bestInl);remaining=remaining.filter(i=>!iset.has(i));
  }

  const allInl=new Set(results.flatMap(r=>r.inliers));
  drawOutliers(pts,allInl);
  results.forEach(({model:{cx,cy,r},inliers,color})=>{
    inliers.forEach(i=>{ctxOut.fillStyle=color;ctxOut.beginPath();ctxOut.arc(pts[i].x,pts[i].y,2.5,0,Math.PI*2);ctxOut.fill();});
    ctxOut.save();ctxOut.strokeStyle=color;ctxOut.lineWidth=2.5;ctxOut.fillStyle=color+'18';
    ctxOut.shadowColor=color;ctxOut.shadowBlur=12;
    ctxOut.beginPath();ctxOut.arc(cx,cy,r,0,Math.PI*2);ctxOut.fill();ctxOut.stroke();
    ctxOut.lineWidth=1.5;
    ctxOut.beginPath();ctxOut.moveTo(cx-8,cy);ctxOut.lineTo(cx+8,cy);ctxOut.stroke();
    ctxOut.beginPath();ctxOut.moveTo(cx,cy-8);ctxOut.lineTo(cx,cy+8);ctxOut.stroke();
    ctxOut.restore();
  });

  const t1=performance.now(),totalInl=results.reduce((s,r)=>s+r.inliers.length,0);
  LOG.ok(`Done — ${results.length} circles, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100);finishOutput();
  setStats(results.length,t1-t0,pts.length,totalInl,totalIters);
  setLegend([...results.map((r,i)=>({color:r.color,label:`CIRCLE ${i+1} — r=${Math.round(r.model.r)}px, ${r.inliers.length} inliers`})),{color:'rgba(120,140,160,0.5)',label:'OUTLIERS'}]);
}

// ── RANSAC — Ellipse ──────────────────────────────────────────────────
function fitEllipse5(pts5) {
  const rows=pts5.map(({x,y})=>[x*x,x*y,y*y,x,y,1]);
  const M=rows.map(r=>r.slice(0,5));
  const rhs=rows.map(r=>-r[5]);
  const coeffs=solve5x5(M,rhs);
  if(!coeffs) return null;
  const [A,B,C,D,E]=coeffs,F=1;
  if(B*B-4*A*C>=0) return null;
  const geo=conicToGeometric(A,B,C,D,E,F);
  if(!geo) return null;
  return {...geo,conic:{A,B,C,D,E,F}};
}
function solve5x5(M,b) {
  const n=5,aug=M.map((row,i)=>[...row,b[i]]);
  for(let col=0;col<n;col++){
    let maxRow=col;
    for(let row=col+1;row<n;row++) if(Math.abs(aug[row][col])>Math.abs(aug[maxRow][col])) maxRow=row;
    [aug[col],aug[maxRow]]=[aug[maxRow],aug[col]];
    if(Math.abs(aug[col][col])<1e-10) return null;
    for(let row=col+1;row<n;row++){const f=aug[row][col]/aug[col][col];for(let j=col;j<=n;j++) aug[row][j]-=f*aug[col][j];}
  }
  const x=new Array(n).fill(0);
  for(let i=n-1;i>=0;i--){x[i]=aug[i][n];for(let j=i+1;j<n;j++) x[i]-=aug[i][j]*x[j];x[i]/=aug[i][i];}
  return x;
}
function conicToGeometric(A,B,C,D,E,F) {
  const denom=4*A*C-B*B;
  if(Math.abs(denom)<1e-8) return null;
  const cx=(B*E-2*C*D)/denom, cy=(B*D-2*A*E)/denom;
  const M1=A+C, M2=Math.sqrt((A-C)**2+B*B);
  const lam1=(M1+M2)/2, lam2=(M1-M2)/2;
  const val=-(A*cx*cx+B*cx*cy+C*cy*cy+D*cx+E*cy+F);
  if(val<=0) return null;
  const a=Math.sqrt(val/lam2), b=Math.sqrt(val/lam1);
  if(!isFinite(a)||!isFinite(b)||a<=0||b<=0||a>2000||b>2000) return null;
  const angle=B===0?(A<=C?0:Math.PI/2):0.5*Math.atan2(B,A-C);
  return {cx,cy,a,b,angle};
}

function runRansacEllipse() {
  const t0=performance.now();
  const maxEll=parseInt(document.getElementById('sl-maxell').value);
  const aspectLimit=parseInt(document.getElementById('sl-aspect').value)/10;
  LOG.start(`RANSAC ELLIPSE — up to ${maxEll} ellipses, min aspect=${aspectLimit}`);
  const {p,pts}=ransacSetup('RANSAC — ELLIPSE FITTING');
  LOG.step(`${pts.length} pts, 5-point algebraic conic fit`);
  LOG.info('Note: ellipse fitting is slower — solves a 5×5 system per iteration');
  setProgress(5);

  let remaining=pts.map((_,i)=>i);
  const results=[];
  let totalIters=0;

  for(let ei=0;ei<maxEll&&remaining.length>p.minInl;ei++){
    let best=null,bestInl=[];
    for(let it=0;it<p.iters;it++){
      totalIters++;
      if(remaining.length<5) break;
      const sample=[],used=new Set();
      let attempts=0;
      while(sample.length<5&&attempts<50){attempts++;const idx=remaining[Math.floor(Math.random()*remaining.length)];if(!used.has(idx)){used.add(idx);sample.push(idx);}}
      if(sample.length<5) continue;
      const ell=fitEllipse5(sample.map(i=>pts[i]));
      if(!ell) continue;
      if(ell.a>0&&ell.b>0&&(Math.min(ell.a,ell.b)/Math.max(ell.a,ell.b))<aspectLimit) continue;
      const {A,B,C,D,E,F}=ell.conic;
      const inl=remaining.filter(i=>{
        const {x,y}=pts[i];
        const val=A*x*x+B*x*y+C*y*y+D*x+E*y+F;
        const gx=2*A*x+B*y+D, gy=B*x+2*C*y+E;
        return Math.abs(val/(Math.sqrt(gx*gx+gy*gy)||1))<p.thresh;
      });
      if(inl.length>bestInl.length){bestInl=inl;best=ell;}
    }
    setProgress(5+((ei+1)/maxEll)*85);
    if(!best||bestInl.length<p.minInl){LOG.warn(`Ellipse ${ei+1}: ${bestInl.length} inliers — stopping`);break;}
    LOG.ok(`Ellipse ${ei+1}: ${Math.round(best.a)}×${Math.round(best.b)}px @ (${best.cx.toFixed(0)},${best.cy.toFixed(0)}), ${bestInl.length} inliers`);
    results.push({model:best,inliers:bestInl,color:COLORS[ei%COLORS.length]});
    const iset=new Set(bestInl);remaining=remaining.filter(i=>!iset.has(i));
  }

  const allInl=new Set(results.flatMap(r=>r.inliers));
  drawOutliers(pts,allInl);
  results.forEach(({model,inliers,color})=>{
    inliers.forEach(i=>{ctxOut.fillStyle=color;ctxOut.beginPath();ctxOut.arc(pts[i].x,pts[i].y,2.5,0,Math.PI*2);ctxOut.fill();});
    ctxOut.save();ctxOut.strokeStyle=color;ctxOut.lineWidth=2.5;ctxOut.fillStyle=color+'18';
    ctxOut.shadowColor=color;ctxOut.shadowBlur=12;
    ctxOut.translate(model.cx,model.cy);ctxOut.rotate(model.angle);
    ctxOut.beginPath();ctxOut.ellipse(0,0,Math.max(model.a,2),Math.max(model.b,2),0,0,Math.PI*2);
    ctxOut.fill();ctxOut.stroke();ctxOut.restore();
  });

  const t1=performance.now(),totalInl=results.reduce((s,r)=>s+r.inliers.length,0);
  LOG.ok(`Done — ${results.length} ellipses, ${totalIters} iters, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100);finishOutput();
  setStats(results.length,t1-t0,pts.length,totalInl,totalIters);
  setLegend([...results.map((r,i)=>({color:r.color,label:`ELLIPSE ${i+1} — ${Math.round(r.model.a)}×${Math.round(r.model.b)}px, ${r.inliers.length} inliers`})),{color:'rgba(120,140,160,0.5)',label:'OUTLIERS'}]);
}

// ── K-Means Color Clustering ──────────────────────────────────────────
function runColorCluster() {
  const t0=performance.now();
  const nPts=parseInt(document.getElementById('sl-spts2').value);
  const k=parseInt(document.getElementById('sl-k').value);
  const maxIter=parseInt(document.getElementById('sl-kmiter').value);
  LOG.start(`K-MEANS — k=${k}, space=${currentCspace}`);
  setProgress(5);

  const pts=samplePoints(nPts);
  const vecs=pts.map(pt=>toColorSpace(pt.r,pt.g,pt.b,currentCspace));
  LOG.step(`${pts.length} pts sampled in ${currentCspace}`);

  // K-Means++ init
  LOG.step(`K-Means++ init: seeding ${k} centroids`);
  const centroids=[vecs[Math.floor(Math.random()*vecs.length)]];
  while(centroids.length<k){
    const dists=vecs.map(v=>Math.min(...centroids.map(c=>colorDist(v,c))));
    const total=dists.reduce((a,b)=>a+b,0);
    let r=Math.random()*total,ci=0;
    for(;ci<dists.length-1&&r>0;ci++) r-=dists[ci];
    centroids.push(vecs[ci]);
  }
  LOG.ok('K-Means++ init complete');

  let assignments=new Array(vecs.length).fill(0);
  let actualIters=0;
  for(let iter=0;iter<maxIter;iter++){
    actualIters++;
    let changed=false;
    vecs.forEach((v,i)=>{
      let best=0,bestD=Infinity;
      centroids.forEach((c,j)=>{const d=colorDist(v,c);if(d<bestD){bestD=d;best=j;}});
      if(assignments[i]!==best){assignments[i]=best;changed=true;}
    });
    setProgress(5+(iter/maxIter)*80);
    if(!changed){LOG.ok(`Converged at iteration ${iter+1}/${maxIter}`);break;}
    if(iter===maxIter-1) LOG.warn(`Max iterations (${maxIter}) reached without convergence`);
    const sums=Array.from({length:k},()=>[0,0,0]);
    const counts=new Array(k).fill(0);
    vecs.forEach((v,i)=>{const a=assignments[i];sums[a][0]+=v[0];sums[a][1]+=v[1];sums[a][2]+=v[2];counts[a]++;});
    centroids.forEach((_,j)=>{if(counts[j]>0)centroids[j]=sums[j].map(v=>v/counts[j]);});
  }
  for(let j=0;j<k;j++){
    const cnt=pts.filter((_,i)=>assignments[i]===j).length;
    LOG.iter(`Cluster ${j+1}: ${cnt} pts (${(cnt/pts.length*100).toFixed(1)}%)`);
  }

  showOutput(`K-MEANS — ${k} CLUSTERS (${currentCspace})`);
  setProgress(90);
  ctxOut.drawImage(cInput,0,0);
  pts.forEach((pt,i)=>{
    ctxOut.fillStyle=COLORS[assignments[i]%COLORS.length]+'b0';
    ctxOut.beginPath();ctxOut.arc(pt.x,pt.y,4,0,Math.PI*2);ctxOut.fill();
  });
  for(let j=0;j<k;j++){
    const cPts=pts.filter((_,i)=>assignments[i]===j);
    if(!cPts.length) continue;
    const cx=cPts.reduce((s,p)=>s+p.x,0)/cPts.length;
    const cy=cPts.reduce((s,p)=>s+p.y,0)/cPts.length;
    const clr=COLORS[j%COLORS.length];
    ctxOut.save();ctxOut.strokeStyle=clr;ctxOut.fillStyle='#fff';
    ctxOut.lineWidth=3;ctxOut.shadowColor=clr;ctxOut.shadowBlur=12;
    ctxOut.beginPath();ctxOut.arc(cx,cy,9,0,Math.PI*2);ctxOut.fill();ctxOut.stroke();
    ctxOut.fillStyle=clr;ctxOut.font="bold 10px 'IBM Plex Mono'";ctxOut.textAlign='center';
    ctxOut.fillText(j+1,cx,cy+3.5);ctxOut.restore();
  }

  const t1=performance.now();
  LOG.ok(`Done — ${k} clusters, ${actualIters} iters, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100);finishOutput();
  setStats(k,t1-t0,pts.length,undefined,actualIters);
  setLegend(centroids.map((_,j)=>({color:COLORS[j%COLORS.length],label:`CLUSTER ${j+1} — ${pts.filter((_,i)=>assignments[i]===j).length} pts`})));
}

// ── Depth Clustering (DBSCAN) ─────────────────────────────────────────
function hslToRgb(h,s,l) {
  let r,g,b;
  if(s===0){r=g=b=l;}
  else{const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;r=hue2rgb(p,q,h+1/3);g=hue2rgb(p,q,h);b=hue2rgb(p,q,h-1/3);}
  return[Math.round(r*255),Math.round(g*255),Math.round(b*255)];
}
function hue2rgb(p,q,t){if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}

function runDepthCluster() {
  const t0=performance.now();
  const nPts=parseInt(document.getElementById('sl-spts3').value);
  const bins=parseInt(document.getElementById('sl-dbins').value);
  const eps=parseInt(document.getElementById('sl-deps').value);
  const minPts=parseInt(document.getElementById('sl-dmin').value);
  LOG.start(`DEPTH CLUSTER — ${bins} bins, ε=${eps}px, minPts=${minPts}`);
  setProgress(5);

  const pts=samplePoints(nPts);
  const depths=pts.map(p=>p.depth);
  const maxD=Math.max(...depths),minD=Math.min(...depths);
  const binSize=(maxD-minD)/bins||1;
  const depthBins=depths.map(d=>Math.min(Math.floor((d-minD)/binSize),bins-1));
  LOG.step(`${pts.length} pts, depth range [${minD.toFixed(0)},${maxD.toFixed(0)}], bin size=${binSize.toFixed(1)}`);

  const labels=new Array(pts.length).fill(-1);
  let clusterCount=0;

  for(let b=0;b<bins;b++){
    const binIdx=pts.map((_,i)=>i).filter(i=>depthBins[i]===b);
    setProgress(5+(b/bins)*70);
    if(binIdx.length<minPts){LOG.iter(`Bin ${b+1}: ${binIdx.length} pts — sparse, skipped`);continue;}
    const visited=new Set(),noise=new Set();
    const range=idx=>binIdx.filter(j=>{const dx=pts[idx].x-pts[j].x,dy=pts[idx].y-pts[j].y;return Math.sqrt(dx*dx+dy*dy)<=eps;});
    let binClusters=0;
    binIdx.forEach(idx=>{
      if(visited.has(idx)) return;
      visited.add(idx);
      const nbrs=range(idx);
      if(nbrs.length<minPts){noise.add(idx);return;}
      const cid=clusterCount++;binClusters++;
      labels[idx]=cid;
      const queue=[...nbrs],inQ=new Set(queue);
      while(queue.length){
        const q=queue.shift();
        if(!visited.has(q)){visited.add(q);const qn=range(q);if(qn.length>=minPts)qn.forEach(n=>{if(!inQ.has(n)){queue.push(n);inQ.add(n);}});}
        if(labels[q]===-1)labels[q]=cid;
      }
    });
    LOG.iter(`Bin ${b+1}: ${binIdx.length} pts → ${binClusters} clusters, ${noise.size} noise`);
  }

  showOutput(`DEPTH CLUSTER — ${bins} BINS (DBSCAN)`);
  ctxOut.drawImage(cInput,0,0);
  const W=cOutput.width,H=cOutput.height;
  const imgData=ctxOut.getImageData(0,0,W,H);
  pts.forEach(pt=>{
    const xi=Math.round(pt.x),yi=Math.round(pt.y);
    if(xi<0||xi>=W||yi<0||yi>=H) return;
    const norm=(pt.depth-minD)/(maxD-minD+1);
    const hue=(1-norm)*240;
    const[hr,hg,hb]=hslToRgb(hue/360,0.9,0.5);
    const idx=(yi*W+xi)*4;
    imgData.data[idx]  =Math.round(imgData.data[idx]  *0.4+hr*0.6);
    imgData.data[idx+1]=Math.round(imgData.data[idx+1]*0.4+hg*0.6);
    imgData.data[idx+2]=Math.round(imgData.data[idx+2]*0.4+hb*0.6);
  });
  ctxOut.putImageData(imgData,0,0);
  pts.forEach((pt,i)=>{
    const cid=labels[i];
    ctxOut.fillStyle=cid<0?'rgba(40,40,40,0.25)':COLORS[cid%COLORS.length]+'cc';
    ctxOut.beginPath();ctxOut.arc(pt.x,pt.y,cid<0?1.5:3,0,Math.PI*2);ctxOut.fill();
  });
  for(let b=0;b<bins;b++){
    const norm=b/(bins-1),hue=(1-norm)*240;
    ctxOut.save();ctxOut.fillStyle=`hsla(${hue},90%,50%,0.7)`;
    ctxOut.fillRect(4,H*(b/bins),8,H/bins-2);
    ctxOut.font="9px 'IBM Plex Mono'";ctxOut.fillStyle='rgba(255,255,255,0.7)';
    ctxOut.fillText(`B${b+1}`,14,H*(b/bins)+11);ctxOut.restore();
  }

  const t1=performance.now();
  const numCl=new Set(labels.filter(l=>l>=0)).size;
  const noiseCount=labels.filter(l=>l<0).length;
  LOG.ok(`Done — ${numCl} clusters, ${noiseCount} noise pts, ${(t1-t0).toFixed(0)}ms`);
  setProgress(100);finishOutput();
  setStats(numCl,t1-t0,pts.length,pts.length-noiseCount,undefined);
  const clCounts={};
  labels.forEach(l=>{if(l>=0)clCounts[l]=(clCounts[l]||0)+1;});
  const topCl=Object.entries(clCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);
  setLegend([...topCl.map(([id,cnt])=>({color:COLORS[+id%COLORS.length],label:`CLUSTER ${+id+1} — ${cnt} pts`})),{color:'rgba(40,40,40,0.5)',label:'NOISE'}]);
}

// ── UI Wiring ─────────────────────────────────────────────────────────
document.querySelectorAll('.isrc-tab[data-src]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.isrc-tab[data-src]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const src=btn.dataset.src;
    document.getElementById('panel-samples').style.display = src==='samples' ? '' : 'none';
    document.getElementById('panel-upload').style.display  = src==='upload'  ? '' : 'none';
  });
});

document.getElementById('file-input').addEventListener('change', e => {
  if (e.target.files[0]) loadImageFile(e.target.files[0]);
});
const uz = document.getElementById('upload-zone');
uz.addEventListener('dragover', e=>{e.preventDefault();uz.classList.add('drag');});
uz.addEventListener('dragleave', ()=>uz.classList.remove('drag'));
uz.addEventListener('drop', e=>{e.preventDefault();uz.classList.remove('drag');if(e.dataTransfer.files[0])loadImageFile(e.dataTransfer.files[0]);});

document.querySelectorAll('.algo-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.algo-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentAlgo=btn.dataset.algo;
    ['ransac','color','depth'].forEach(a=>{
      const el=document.getElementById(`ctrl-${a}`);
      el.style.display = a===currentAlgo ? 'flex' : 'none';
      el.classList.toggle('show', a===currentAlgo);
    });
    document.getElementById('s-status').textContent='IDLE';
    document.getElementById('s-status').className='sv2';
    document.getElementById('s-status-mini').textContent='IDLE';
  });
});

document.querySelectorAll('[data-cspace]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cspace]').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentCspace=btn.dataset.cspace;
    document.getElementById('v-cspace').textContent=currentCspace;
  });
});

document.querySelectorAll('.prim-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.prim-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    currentPrimitive=btn.dataset.prim;
    document.getElementById('hdr-primitive').textContent=btn.dataset.prim.toUpperCase();
    ['line','plane','circle','ellipse'].forEach(p=>{
      document.getElementById(`pp-${p}`).style.display = p===currentPrimitive ? '' : 'none';
    });
  });
});

const sliders=[
  ['sl-spts','v-spts'],['sl-iters','v-iters'],['sl-thresh','v-thresh'],['sl-mininl','v-mininl'],['sl-planes','v-planes'],
  ['sl-spts2','v-spts2'],['sl-k','v-k'],['sl-kmiter','v-kmiter'],
  ['sl-spts3','v-spts3'],['sl-dbins','v-dbins'],['sl-deps','v-deps'],['sl-dmin','v-dmin'],
  ['sl-maxplanes','v-maxplanes'],['sl-maxcircles','v-maxcircles'],['sl-minr','v-minr'],['sl-maxr','v-maxr'],['sl-maxell','v-maxell'],
];
sliders.forEach(([sid,vid])=>{
  const sl=document.getElementById(sid),vl=document.getElementById(vid);
  if(sl&&vl) sl.addEventListener('input',()=>{vl.textContent=sl.value;});
});
document.getElementById('sl-aspect').addEventListener('input',function(){
  document.getElementById('v-aspect').textContent=(this.value/10).toFixed(1);
});

document.getElementById('btn-run').addEventListener('click',()=>{
  if(!loadedImage) return;
  document.getElementById('s-status').textContent='RUNNING';
  document.getElementById('s-status').className='sv2';
  document.getElementById('s-status-mini').textContent='RUNNING';
  setTimeout(()=>{
    if(currentAlgo==='ransac'){
      if(currentPrimitive==='line') runRansacLine();
      else if(currentPrimitive==='plane') runRansacPlane();
      else if(currentPrimitive==='circle') runRansacCircle();
      else runRansacEllipse();
    } else if(currentAlgo==='color') runColorCluster();
    else runDepthCluster();
  },30);
});

// ── Init ─────────────────────────────────────────────────────────────
buildSamples();
document.querySelector('.sample-btn').classList.add('active');
loadSample(0);
