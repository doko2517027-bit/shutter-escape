import {STEP,PLATFORM_HEIGHT,EXIT,DOOR,WALLS,LEVERS,layoutPlatforms,inside,RADIUS} from './world.js'
import {observationState} from './observation.js'

const COLS=12,ROWS=13,SIZE=8,cache=new Map()
export const STAGE_TWO_START={x:-44,z:50,y:PLATFORM_HEIGHT}
const point=i=>({x:-44+(i%COLS)*SIZE,z:50-Math.floor(i/COLS)*SIZE})
const cell=p=>Math.max(0,Math.min(ROWS-1,Math.round((50-p.z)/SIZE)))*COLS+Math.max(0,Math.min(COLS-1,Math.round((p.x+44)/SIZE)))
export function mazeLayout(seed=1){
 seed=seed>>>0;if(cache.has(seed))return cache.get(seed)
 let rng=seed||1;const random=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296}
 const edges=Array.from({length:COLS*ROWS},()=>[]),seen=new Set([0]),stack=[0]
 const connect=(a,b)=>{if(!edges[a].includes(b)){edges[a].push(b);edges[b].push(a)}}
 while(stack.length){const a=stack.at(-1),c=a%COLS,r=Math.floor(a/COLS),options=[c>0?a-1:-1,c<COLS-1?a+1:-1,r>0?a-COLS:-1,r<ROWS-1?a+COLS:-1].filter(b=>b>=0&&!seen.has(b));if(!options.length){stack.pop();continue}const b=options[Math.floor(random()*options.length)];connect(a,b);seen.add(b);stack.push(b)}
 // A few loops allow a team to circle the watcher instead of getting trapped
 // in a single corridor. The exit stairwell is kept clear.
 for(let a=0;a<edges.length;a++){if(a%COLS<COLS-1&&random()<.18)connect(a,a+1);if(a+COLS<edges.length&&random()<.18)connect(a,a+COLS)}
 const walls=[...WALLS.slice(0,5)]
 for(let a=0;a<edges.length;a++){const p=point(a);if(a%COLS<COLS-1&&!edges[a].includes(a+1)){const w={x:p.x+4,z:p.z,w:.45,d:8.45};if(!(w.x>36&&w.z<-32))walls.push(w)}if(a+COLS<edges.length&&!edges[a].includes(a+COLS)){const w={x:p.x,z:p.z-4,w:8.45,d:.45};if(!(w.x>36&&w.z<-32))walls.push(w)}}
 const levers=LEVERS.map((l,i)=>({...l,...point([22,62,101,137,149][i]),y:PLATFORM_HEIGHT}))
 const platforms=[{id:'maze-floor',x:0,z:0,w:95,d:110,y:PLATFORM_HEIGHT}]
 const value={walls,levers,platforms,edges,point,cell};cache.set(seed,value);if(cache.size>12)cache.delete(cache.keys().next().value);return value
}
export const stagePlatforms=s=>s?.stage===2?mazeLayout(s.layoutSeed).platforms:layoutPlatforms(s?.layoutSeed)
export const stageLevers=s=>s?.stage===2?mazeLayout(s.layoutSeed).levers:LEVERS
export const stageSolids=s=>s?.stage===2?[...mazeLayout(s.layoutSeed).walls,...(s.open?[]:[DOOR])]:undefined
export function mazePath(seed,from,to){const {edges}=mazeLayout(seed),start=cell(from),end=cell(to),parents=new Int16Array(edges.length).fill(-1),queue=[start];parents[start]=start;for(let q=0;q<queue.length&&parents[end]<0;q++)for(const b of edges[queue[q]])if(parents[b]<0){parents[b]=queue[q];queue.push(b)}if(parents[end]<0)return[];const path=[];for(let a=end;a!==start;a=parents[a])path.push(point(a));path.reverse();const raw=[point(start),...path,{x:to.x,z:to.z}],walls=mazeLayout(seed).walls,result=[];let origin=from,index=0;while(index<raw.length){let far=index;for(let i=raw.length-1;i>=index;i--)if(!walls.some(w=>segmentHits(origin,raw[i],{...w,w:w.w+.9,d:w.d+.9}))){far=i;break}if(walls.some(w=>segmentHits(origin,raw[far],{...w,w:w.w+.9,d:w.d+.9})))break;result.push(raw[far]);origin=raw[far];index=far+1}return result}
export function prepareStageTwo(s){s.stage=2;s.traps=[];s.players.forEach((p,i)=>Object.assign(p,{...STAGE_TWO_START,x:STAGE_TWO_START.x+(i%2)*1.2,z:STAGE_TWO_START.z-Math.floor(i/2)*1.2}));s.monsters.forEach((m,i)=>Object.assign(m,{...point(35+i*24),y:PLATFORM_HEIGHT,stage:2}));return s}
function hits(x,z,walls){return walls.some(w=>inside(x,z,w,.42))}
export function moveStageTwoMonster(m,input,cfg,walls,frozen=m.frozen){m.yaw=input.yaw??m.yaw;m.pitch=input.pitch??m.pitch;m.ack=input.seq||m.ack;let r=input.right||0,f=input.forward||0,n=Math.max(1,Math.hypot(r,f)),distance=frozen?0:cfg.monsterSpeed*STEP,dx=(Math.cos(m.yaw)*r-Math.sin(m.yaw)*f)/n*distance,dz=(-Math.sin(m.yaw)*r-Math.cos(m.yaw)*f)/n*distance,steps=Math.max(1,Math.ceil(distance/.18)),x=m.x,z=m.z;for(let i=0;i<steps;i++){if(!hits(m.x+dx/steps,m.z,walls))m.x+=dx/steps;if(!hits(m.x,m.z+dz/steps,walls))m.z+=dz/steps}m.vx=(m.x-x)/STEP;m.vz=(m.z-z)/STEP}
export function tickStageTwo(s,inputs,{movePlayer,emit,canUseLever}){
 const layout=mazeLayout(s.layoutSeed),walls=stageSolids(s),before=new Map(s.players.map(p=>[p.id,{x:p.x,y:p.y,z:p.z}]))
 s.time+=STEP;s.tick++
 for(const p of s.players){const input=inputs[p.id]||{};const motion=movePlayer(p,input,s.settings,s.open,layout.platforms,[],walls);if(p.status!=='active')continue
  p.cameraFov=input.fov??p.cameraFov??68;p.cameraAspect=input.aspect??p.cameraAspect??16/9
  if(motion.land)emit(s,'brickLand',{player:p.id,x:p.x,y:p.y,z:p.z})
  if(motion.brickStep&&s.time-(p.lastBrickNoise??-99)>.43){p.lastBrickNoise=s.time;emit(s,'brickStep',{player:p.id,x:p.x,y:p.y,z:p.z})}
  if(input.interact){const i=layout.levers.findIndex(l=>canUseLever(p,l,layout.platforms));if(i>=0&&!s.levers[i]){s.levers[i]=true;p.levers++;emit(s,'lever',{index:i,player:p.id,...layout.levers[i]});if(s.levers.every(Boolean)){s.open=true;emit(s,'door',{x:DOOR.x,y:EXIT.y,z:DOOR.z})}}}
  if(s.open&&Math.abs(p.x-EXIT.x)<EXIT.w/2-.2&&p.z<DOOR.z-2&&p.y>PLATFORM_HEIGHT-.3){p.status='escaped';emit(s,'escape',{player:p.id})}
 }
 for(const m of s.monsters){const visible=s.players.some(p=>observationState([p],m,walls,{fov:p.cameraFov??68,aspect:p.cameraAspect??16/9}).frozen),observation=observationState(s.players,m,walls)
  m.frozen=visible;m.lookYaw=observation.lookYaw;m.target=observation.target;m.alert=!visible;m.mode=visible?'watched':'chasing';m.y=PLATFORM_HEIGHT
  const old={x:m.x,z:m.z};let travel=visible?0:s.settings.monsterSpeed*STEP
  if(m.controllerId){moveStageTwoMonster(m,inputs[m.controllerId]||{},s.settings,walls,visible);travel=0}
  else{const target=s.players.find(p=>p.id===m.target);m.repath=(m.repath||0)-STEP;if(target&&(m.repath<=0||!m.path.length)){m.path=mazePath(s.layoutSeed,m,target);m.repath=.45}}
  while(travel>0&&m.path.length){const next=m.path[0],distance=Math.hypot(next.x-m.x,next.z-m.z);if(distance<.03){m.path.shift();continue}const step=Math.min(travel,distance,.18),nx=m.x+(next.x-m.x)/distance*step,nz=m.z+(next.z-m.z)/distance*step;if(hits(nx,nz,walls)){m.path=[];m.repath=0;break}m.x=nx;m.z=nz;travel-=step;if(step>=distance)m.path.shift()}
  m.vx=(m.x-old.x)/STEP;m.vz=(m.z-old.z)/STEP
  for(const p of s.players){if(p.status!=='active')continue;const b=before.get(p.id),dx=(p.x-b.x)-(m.x-old.x),dz=(p.z-b.z)-(m.z-old.z),rx=b.x-old.x,rz=b.z-old.z,t=Math.max(0,Math.min(1,-(rx*dx+rz*dz)/(dx*dx+dz*dz||1))),height=b.y+(p.y-b.y)*t;if(Math.hypot(rx+dx*t,rz+dz*t)<RADIUS+.62&&height<PLATFORM_HEIGHT+2.25&&!walls.some(w=>segmentHits(b,m,w))){p.status='dead';emit(s,'caught',{player:p.id});if(s.settings.elimination==='team')for(const other of s.players)if(other.status==='active')other.status='dead'}}
 }
 s.finished=s.players.every(p=>p.status!=='active')
}
function segmentHits(a,b,w){let lo=0,hi=1;for(const [o,d,c,size]of[[a.x,b.x-a.x,w.x,w.w],[a.z,b.z-a.z,w.z,w.d]]){if(Math.abs(d)<1e-9){if(Math.abs(o-c)>size/2)return false}else{const x=(c-size/2-o)/d,y=(c+size/2-o)/d;lo=Math.max(lo,Math.min(x,y));hi=Math.min(hi,Math.max(x,y))}}return lo<=hi&&lo<1&&hi>0}
