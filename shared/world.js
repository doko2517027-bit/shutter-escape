export const BRAND={title:'Switch & Shutter',subtitle:'FIRST-PERSON COOPERATIVE HORROR',version:'TEST BUILD 01',instruction:'鉄のシャッターのゴールの扉から出たらクリア。'}
export const STEP=1/30,MAX_PLAYERS=4
export const DEFAULTS={speed:4.6,jump:5.6,jumpTempo:1.2,gravity:13,acceleration:26,friction:22,monsterSpeed:24,hearing:48,memory:9,elimination:'individual'}
export const LIMITS={speed:[3,6],jump:[4.5,7],jumpTempo:[1,1.5],gravity:[10,20],acceleration:[12,45],friction:[10,40],monsterSpeed:[9,32],hearing:[20,80],memory:[3,18]}
export function migratePreferences(raw={}){const next={...raw};if((next.balanceVersion||0)<2&&next.monsterSpeed===17)next.monsterSpeed=DEFAULTS.monsterSpeed;next.balanceVersion=2;return next}
export function settings(raw={}){const out={...DEFAULTS};for(const [key,[min,max]] of Object.entries(LIMITS)){const n=Number(raw[key]);if(Number.isFinite(n))out[key]=Math.max(min,Math.min(max,n))}if(raw.elimination==='team')out.elimination='team';return out}
const cells=new Set(),add=(c,r)=>cells.add(`${c},${r}`),span=(r,a,b)=>{for(let c=a;c<=b;c++)add(c,r)}
span(0,0,4);add(4,1);span(2,0,8);add(8,3);span(4,5,8);add(5,5);span(6,0,5);add(0,7);span(8,0,6);span(9,6,8);add(0,1);add(1,1);add(2,3);add(2,4);add(2,5);add(5,7)
export const PLATFORMS=[...cells].map((cell,i)=>{const[c,r]=cell.split(',').map(Number);return {id:'p'+i,c,r,x:-24+c*6,z:28-r*6,w:2.4+((c*7+r*3)%3)*.1,d:2.4+((c*5+r*2)%3)*.1,y:.65+Math.floor(r/3)*.22}})
PLATFORMS.find(p=>p.c===0&&p.r===0).w=7
PLATFORMS.find(p=>p.c===0&&p.r===0).d=6.6
PLATFORMS.push({id:'exit',x:24,z:-30,w:5.8,d:12,y:1.31,c:8,r:10})
export const LEVERS=[{id:'L1',x:18,z:16,y:.65},{id:'L2',x:-18,z:-8,y:1.09},{id:'L3',x:12,z:-26,y:1.31}]
export const WALLS=[{x:-32,z:0,w:.8,d:74},{x:32,z:0,w:.8,d:74},{x:0,z:36,w:64,d:.8},{x:-5,z:-36,w:53,d:.8},{x:30,z:-36,w:4,d:.8},{x:20.6,z:-32,w:.7,d:8},{x:27.4,z:-32,w:.7,d:8},{x:-7,z:15,w:.8,d:13},{x:7,z:0,w:.8,d:13},{x:-7,z:-15,w:.8,d:13}]
export const DOOR={x:24,z:-32,w:6,d:.5},BOUNDS={x:31.3,zMin:-36.5,zMax:35.3}
export const RADIUS=.28,EYE=1.58
export function inside(x,z,box,pad=0){return Math.abs(x-box.x)<box.w/2+pad&&Math.abs(z-box.z)<box.d/2+pad}
export function platformAt(x,z,platforms=PLATFORMS){return platforms.filter(p=>inside(x,z,p)).sort((a,b)=>b.y-a.y)[0]||null}
export function solids(open){return open?WALLS:[...WALLS,DOOR]}
export function waterWalkable(x,z,pad=.42,platforms=PLATFORMS){return Math.abs(x)<30.9&&z>-35&&z<35&&!platforms.some(p=>inside(x,z,p,pad))&&!WALLS.some(w=>inside(x,z,w,pad))}
export function navigationPath(from,to,platforms=PLATFORMS){
 const origin=[-31,-35],width=63,height=71,idx=(x,z)=>(z-origin[1])*width+x-origin[0],point=i=>({x:i%width+origin[0],z:Math.floor(i/width)+origin[1]}),valid=(x,z)=>x>=-31&&x<=31&&z>=-35&&z<=35&&waterWalkable(x,z,.48,platforms)
 const nearest=p=>{const x=Math.round(p.x),z=Math.round(p.z);for(let r=0;r<8;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(valid(x+a,z+b))return idx(x+a,z+b);return -1}
 const start=nearest(from),end=nearest(to);if(start<0||end<0)return []
 const queue=[start],parent=new Int32Array(width*height).fill(-1);parent[start]=start
 for(let q=0;q<queue.length;q++){const current=queue[q];if(current===end)break;const p=point(current);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz;if(!valid(x,z))continue;const next=idx(x,z);if(parent[next]!==-1)continue;parent[next]=current;queue.push(next)}}
 if(parent[end]===-1)return [];const path=[];let at=end;while(at!==start){path.push(point(at));at=parent[at]}path.reverse()
 // Finish toward the actual sound, not just the nearest navigation-grid square.
 // Stop before the bank or a solid so the monster never steps onto safe bricks.
 const endPoint=point(end),length=Math.hypot(to.x-endPoint.x,to.z-endPoint.z),steps=Math.max(1,Math.ceil(length/.1));let last=endPoint
 for(let i=1;i<=steps;i++){const next={x:endPoint.x+(to.x-endPoint.x)*i/steps,z:endPoint.z+(to.z-endPoint.z)*i/steps};if(!waterWalkable(next.x,next.z,.48,platforms))break;last=next}
 if(Math.hypot(last.x-endPoint.x,last.z-endPoint.z)>.01)path.push(last)
 return path
}

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
 const anchorCells=new Set(['0,0','7,2','1,6','6,9'])
 for(let attempt=0;attempt<256;attempt++){
  const nodes=[],scatter=attempt<32?1.5:1.1
  for(let r=0;r<10;r++)for(let c=0;c<9;c++){
   const offset=()=> (.3+random()*(scatter-.3))*(random()<.5?-1:1);const anchored=anchorCells.has(`${c},${r}`),p={id:`cell-${c}-${r}`,c,r,x:-24+c*6+(anchored?0:offset()),z:28-r*6+(anchored?0:offset()),w:(attempt<32?2.6:3.1)+random()*.8,d:(attempt<32?2.6:3.1)+random()*.8,y:.65+Math.floor(r/3)*.22}
   if(c===0&&r===0){p.w=7;p.d=6.6;p.id='p0'}
   const blocked=WALLS.some(w=>Math.abs(w.x-p.x)<(w.w+p.w)/2+.3&&Math.abs(w.z-p.z)<(w.d+p.d)/2+.3)
   if(!blocked)nodes.push(p)
  }
  const start=nodes.find(p=>p.id==='p0');if(!start)continue
  // Keep a water gap between unrelated bricks and the spawn landing.
  const exit={...PLATFORMS.find(p=>p.id==='exit')};const filtered=nodes.filter(p=>(p===start||Math.abs(exit.x-p.x)>=(exit.w+p.w)/2+.2||Math.abs(exit.z-p.z)>=(exit.d+p.d)/2+.2)&&(p===start||!nodes.some(q=>q!==p&&(q.id==='p0'||q.r<p.r||q.r===p.r&&q.c<p.c)&&Math.abs(q.x-p.x)<(q.w+p.w)/2+.2&&Math.abs(q.z-p.z)<(q.d+p.d)/2+.2)));filtered.push(exit)
  const neighbors=new Map(filtered.map(p=>[p,filtered.filter(n=>jumpConnection(p,n))]))
  const parents=new Map([[start,null]]),dist=new Map([[start,0]]),todo=[start],costs=new Map()
  while(todo.length){todo.sort((a,b)=>dist.get(a)-dist.get(b));const p=todo.shift();for(const n of neighbors.get(p)){const key=[p.id,n.id].sort().join(':');if(!costs.has(key))costs.set(key,1+random()*5);const d=dist.get(p)+costs.get(key);if(d<(dist.get(n)??Infinity)){dist.set(n,d);parents.set(n,p);if(!todo.includes(n))todo.push(n)}}}
  const goals=[...LEVERS.map(l=>filtered.find(p=>inside(l.x,l.z,p)&&Math.abs(p.y-l.y)<.1)),exit]
  if(goals.some(p=>!p||!parents.has(p)))continue
  const selected=new Set([start]);for(const goal of goals)for(let at=goal;at;at=parents.get(at))selected.add(at)
  for(const p of [...selected])for(const n of neighbors.get(p))if(random()<.17)selected.add(n)
  const result=[start,...[...selected].filter(p=>p!==start&&p!==exit),exit]
  if(layoutCache.size>=128)layoutCache.delete(layoutCache.keys().next().value)
  layoutCache.set(seed,result);return result
 }
 throw Error('Could not build a traversable irregular stage')
}
