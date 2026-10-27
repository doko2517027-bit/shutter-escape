export const BRAND={title:'Switch & Shutter',subtitle:'FIRST-PERSON COOPERATIVE HORROR',version:'TEST BUILD 01',instruction:'鉄のシャッターのゴールの扉から出たらクリア。'}
export const PROTOCOL_VERSION=4,STEP=1/30,MAX_PLAYERS=4
export const DEFAULTS={speed:4.6,jump:5.6,jumpTempo:1.2,gravity:13,acceleration:26,friction:22,monsterSpeed:24,hearing:72,memory:9,elimination:'individual'}
export const LIMITS={speed:[3,6],jump:[4.5,7],jumpTempo:[1,1.5],gravity:[10,20],acceleration:[12,45],friction:[10,40],monsterSpeed:[9,32],hearing:[20,140],memory:[3,18]}
export function migratePreferences(raw={}){const next={...raw};if((next.balanceVersion||0)<2&&next.monsterSpeed===17)next.monsterSpeed=DEFAULTS.monsterSpeed;if((next.balanceVersion||0)<3&&next.hearing===48)next.hearing=DEFAULTS.hearing;next.balanceVersion=3;return next}
export function settings(raw={}){const out={...DEFAULTS};for(const [key,[min,max]] of Object.entries(LIMITS)){const n=Number(raw[key]);if(Number.isFinite(n))out[key]=Math.max(min,Math.min(max,n))}if(raw.elimination==='team')out.elimination='team';return out}
export const ARENA={width:96,depth:108,halfWidth:48,halfDepth:54,columns:15,rows:17,originX:-42,originZ:46,spacing:6}
export const START={x:-42,z:46,y:.65},EXIT={id:'exit',x:42,z:-48,w:5.8,d:12,y:1.75,c:14,r:16}
export const LEVERS=[{id:'L1',c:12,r:2},{id:'L2',c:2,r:5},{id:'L3',c:11,r:8},{id:'L4',c:1,r:12},{id:'L5',c:10,r:15}].map(l=>({...l,x:ARENA.originX+l.c*6,z:ARENA.originZ-l.r*6,y:.65+Math.floor(l.r/3)*.22}))
export const WALLS=[{x:-48,z:0,w:.8,d:108},{x:48,z:0,w:.8,d:108},{x:0,z:54,w:96,d:.8},{x:-4.5,z:-54,w:87,d:.8},{x:46.5,z:-54,w:3,d:.8},{x:38.6,z:-50,w:.7,d:8},{x:45.4,z:-50,w:.7,d:8},{x:-17,z:28,w:.8,d:15},{x:13,z:12,w:.8,d:17},{x:-5,z:-8,w:.8,d:15},{x:19,z:-27,w:.8,d:15},{x:-17,z:-38,w:.8,d:13}]
export const DOOR={x:42,z:-50,w:6,d:.5},BOUNDS={x:47.3,zMin:-54.5,zMax:53.3}
export let PLATFORMS
export const RADIUS=.28,EYE=1.58
export function inside(x,z,box,pad=0){return Math.abs(x-box.x)<box.w/2+pad&&Math.abs(z-box.z)<box.d/2+pad}
export function platformAt(x,z,platforms=PLATFORMS){return platforms.filter(p=>inside(x,z,p)).sort((a,b)=>b.y-a.y)[0]||null}
export function solids(open){return open?WALLS:[...WALLS,DOOR]}
export function waterWalkable(x,z,pad=.42,platforms=PLATFORMS){return Math.abs(x)<ARENA.halfWidth-1.1&&z>-ARENA.halfDepth+1&&z<ARENA.halfDepth-1&&!platforms.some(p=>inside(x,z,p,pad))&&!WALLS.some(w=>inside(x,z,w,pad))}
const navigationCache=new WeakMap()
export const navigationStats={builds:0,searches:0}
function navigationGrid(platforms){let grid=navigationCache.get(platforms);if(grid)return grid;const minX=Math.ceil(-ARENA.halfWidth+1.1),minZ=-ARENA.halfDepth+2,width=Math.floor(ARENA.halfWidth-1.1)-minX+1,height=ARENA.depth-3,size=width*height,walkable=new Uint8Array(size).fill(1)
 for(const box of [...platforms,...WALLS]){const left=Math.max(minX,Math.floor(box.x-box.w/2-.48)+1),right=Math.min(minX+width-1,Math.ceil(box.x+box.w/2+.48)-1),top=Math.max(minZ,Math.floor(box.z-box.d/2-.48)+1),bottom=Math.min(minZ+height-1,Math.ceil(box.z+box.d/2+.48)-1);for(let z=top;z<=bottom;z++)for(let x=left;x<=right;x++)walkable[(z-minZ)*width+x-minX]=0}
 grid={minX,minZ,width,height,walkable,parent:new Int32Array(size),queue:new Int32Array(size)};navigationCache.set(platforms,grid);navigationStats.builds++;return grid
}
export function navigationPath(from,to,platforms=PLATFORMS,avoid=null){
 const {minX,minZ,width,height,walkable,parent,queue}=navigationGrid(platforms),idx=(x,z)=>(z-minZ)*width+x-minX,point=i=>({x:i%width+minX,z:Math.floor(i/width)+minZ}),valid=(x,z)=>x>=minX&&x<minX+width&&z>=minZ&&z<minZ+height&&walkable[idx(x,z)]&&(!avoid||(x-avoid.x)**2+(z-avoid.z)**2>=avoid.radius**2)
 navigationStats.searches++
 const nearest=p=>{const x=Math.round(p.x),z=Math.round(p.z);for(let r=0;r<12;r++){let best=-1,distance=Infinity;for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(valid(x+a,z+b)){const d=(x+a-p.x)**2+(z+b-p.z)**2;if(d<distance){best=idx(x+a,z+b);distance=d}}if(best>=0)return best}return -1}
 const start=nearest(from),end=nearest(to);if(start<0||end<0)return []
 parent.fill(-1);parent[start]=start;queue[0]=start;let length=1,best=start,bestDistance=Infinity
 for(let q=0;q<length;q++){const current=queue[q],p=point(current),distance=(p.x-to.x)**2+(p.z-to.z)**2;if(distance<bestDistance){best=current;bestDistance=distance}if(current===end){best=end;break}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz;if(!valid(x,z))continue;const next=idx(x,z);if(parent[next]!==-1)continue;parent[next]=current;queue[length++]=next}}
 const raw=[];for(let at=best;at!==start;at=parent[at])raw.push(point(at));raw.reverse();const path=[];for(let i=0;i<raw.length;i++){const prev=i?raw[i-1]:point(start),next=raw[i+1],p=raw[i];if(!next||(p.x-prev.x)*(next.z-p.z)!==(p.z-prev.z)*(next.x-p.x))path.push(p)}
 const endPoint=point(best),distance=Math.hypot(to.x-endPoint.x,to.z-endPoint.z),steps=Math.max(1,Math.ceil(distance/.1));let last=endPoint
 for(let i=1;i<=steps;i++){const next={x:endPoint.x+(to.x-endPoint.x)*i/steps,z:endPoint.z+(to.z-endPoint.z)*i/steps};if(!waterWalkable(next.x,next.z,.48,platforms)||avoid&&(next.x-avoid.x)**2+(next.z-avoid.z)**2<avoid.radius**2)break;last=next}
 if(Math.hypot(last.x-endPoint.x,last.z-endPoint.z)>.01)path.push(last)
 const smooth=[];let current=from,index=0
 while(index<path.length){let far=index;for(let i=path.length-1;i>=index;i--)if(navigationSegment(current,path[i],platforms,avoid)){far=i;break}if(!navigationSegment(current,path[far],platforms,avoid))break;smooth.push(path[far]);current=path[far];index=far+1}
 return smooth
}
export function navigationSegment(from,to,platforms=PLATFORMS,avoid=null){const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.16));for(let i=1;i<=steps;i++){const x=from.x+(to.x-from.x)*i/steps,z=from.z+(to.z-from.z)*i/steps;if(!waterWalkable(x,z,.48,platforms)||avoid&&(x-avoid.x)**2+(z-avoid.z)**2<avoid.radius**2)return false}return true}


// Match seeds reproduce the same irregular geometry on the server and clients.
const layoutCache=new Map()
export function platformGap(a,b){const distance=Math.hypot(b.x-a.x,b.z-a.z);if(!distance)return 0;const ux=Math.abs(b.x-a.x)/distance,uz=Math.abs(b.z-a.z)/distance;const edge=p=>Math.min(ux>.0001?p.w/2/ux:Infinity,uz>.0001?p.d/2/uz:Infinity);return distance-edge(a)-edge(b)}
export function jumpConnection(a,b){
 if(a===b||Math.hypot(a.x-b.x,a.z-b.z)>(a.id==='exit'||b.id==='exit'?16:8.5)||Math.abs(a.y-b.y)>.23)return false
 if(platformGap(a,b)>(Math.abs(a.y-b.y)>.05?2.95:3.15))return false
 return !WALLS.some(w=>{for(let i=0;i<=32;i++)if(inside(a.x+(b.x-a.x)*i/32,a.z+(b.z-a.z)*i/32,w,RADIUS+.04))return true;return false})
}
export function layoutPlatforms(seed){
 if(!Number.isInteger(seed))return PLATFORMS
 if(layoutCache.has(seed))return layoutCache.get(seed)
 let value=seed>>>0
 const random=()=>{value=(value+0x6D2B79F5)>>>0;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}
 const anchorCells=new Set(['0,0',...LEVERS.map(l=>`${l.c},${l.r}`)])
 for(let attempt=0;attempt<256;attempt++){
  const nodes=[],scatter=attempt<8?1.5:1.1
  for(let r=0;r<ARENA.rows;r++)for(let c=0;c<ARENA.columns;c++){
   const offset=()=> (.3+random()*(scatter-.3))*(random()<.5?-1:1);const anchored=anchorCells.has(`${c},${r}`),p={id:`cell-${c}-${r}`,c,r,x:ARENA.originX+c*6+(anchored?0:offset()),z:ARENA.originZ-r*6+(anchored?0:offset()),w:(attempt<8?2.9:3.7)+random()*.7,d:(attempt<8?2.9:3.7)+random()*.7,y:.65+Math.floor(r/3)*.22}
   const lever=LEVERS.find(l=>l.c===c&&l.r===r);if(lever)p.leverId=lever.id
   if(c===0&&r===0){p.w=7;p.d=6.6;p.id='p0'}
   const blocked=WALLS.some(w=>Math.abs(w.x-p.x)<(w.w+p.w)/2+.3&&Math.abs(w.z-p.z)<(w.d+p.d)/2+.3)
   if(!blocked)nodes.push(p)
  }
  const start=nodes.find(p=>p.id==='p0');if(!start)continue
  // Keep a water gap between unrelated bricks and the spawn landing.
  const exit={...EXIT};const filtered=nodes.filter(p=>(p===start||Math.abs(exit.x-p.x)>=(exit.w+p.w)/2+.2||Math.abs(exit.z-p.z)>=(exit.d+p.d)/2+.2)&&(p===start||!nodes.some(q=>q!==p&&(q.id==='p0'||q.r<p.r||q.r===p.r&&q.c<p.c)&&Math.abs(q.x-p.x)<(q.w+p.w)/2+.2&&Math.abs(q.z-p.z)<(q.d+p.d)/2+.2)));filtered.push(exit)
  const cells=new Map(filtered.map(p=>[`${p.c},${p.r}`,p]));const neighbors=new Map(filtered.map(p=>{const candidates=new Set([exit]);if(p===exit)for(const n of filtered)candidates.add(n);else for(let r=p.r-1;r<=p.r+1;r++)for(let c=p.c-1;c<=p.c+1;c++){const n=cells.get(`${c},${r}`);if(n)candidates.add(n)}return [p,[...candidates].filter(n=>jumpConnection(p,n))]}))
  const goals=[...LEVERS.map(l=>filtered.find(p=>inside(l.x,l.z,p)&&Math.abs(p.y-l.y)<.1)),exit]
  if(goals.some(p=>!p))continue
  const selected=new Set([start]),links=new Map(filtered.map(p=>[p,new Set()]));let failed=false
  // Connect each goal to the existing route, avoiding redundant parallel bridges.
  for(const goal of goals){const parents=new Map([...selected].map(p=>[p,null])),todo=[...selected];for(let i=0;i<todo.length&&!parents.has(goal);i++)for(const n of neighbors.get(todo[i]))if(!parents.has(n)){parents.set(n,todo[i]);todo.push(n)}if(!parents.has(goal)){failed=true;break}for(let at=goal;parents.get(at);at=parents.get(at)){const parent=parents.get(at);selected.add(at);selected.add(parent);links.get(at).add(parent);links.get(parent).add(at)}}
  if(failed)continue
  // Narrow nonessential landing margins while preserving every required jump edge.
  for(let round=0;round<16;round++)for(const p of selected){if(p===start||p===exit)continue;for(const axis of ['w','d']){const previous=p[axis];p[axis]=Math.max(2.5,previous-.08);if([...links.get(p)].some(n=>!jumpConnection(p,n)))p[axis]=previous}}
  // Add reachable false trails: each has one entrance and a terminal with only water ahead.
  const branchCandidates=parent=>filtered.filter(p=>!selected.has(p)&&!p.leverId&&p!==exit&&neighbors.get(p).filter(n=>selected.has(n)&&jumpConnection(p,n)).length===1&&(!parent?neighbors.get(p).some(n=>selected.has(n)&&!n.optional&&jumpConnection(p,n)):jumpConnection(p,parent)))
  let branches=0
  for(let branch=0;branch<3;branch++){let candidates=branchCandidates(null);if(!candidates.length)break;let end=candidates[Math.floor(random()*candidates.length)];end.optional=true;end.branch=branch;selected.add(end);const length=1+Math.floor(random()*3);for(let step=1;step<length;step++){candidates=branchCandidates(end);if(!candidates.length)break;const next=candidates[Math.floor(random()*candidates.length)];next.optional=true;next.branch=branch;selected.add(next);end=next}end.deadEnd=true;branches++}
  if(branches<3)continue
  const result=[start,...[...selected].filter(p=>p!==start&&p!==exit),exit]
  if(layoutCache.size>=128)layoutCache.delete(layoutCache.keys().next().value)
  layoutCache.set(seed,result);return result
 }
 throw Error('Could not build a traversable irregular stage')
}

PLATFORMS=layoutPlatforms(20261027)
