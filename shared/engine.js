import {prepareMonster,MONSTER_BEHAVIOR} from './monsters.js'
import {monsterContact} from './contact.js'
import {prepareStageTwo,tickStageTwo} from './stage-two.js'
import {STEP,MATCH_TIME_LIMIT,TRAP_TIMING,ARENA,START,EXIT,PLATFORMS,layoutPlatforms,runtimePlatforms,trapWalls,createTrapStates,LEVERS,DOOR,BOUNDS,RADIUS,inside,solids,WALLS,navigationPath,waterWalkable,settings} from './world.js'
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d)
export function createPlayer(id,name='探索者',i=0){return {id,name:String(name).slice(0,16),x:START.x-1+(i%2)*1.2,z:START.z+Math.floor(i/2)*1.1,y:START.y,vx:0,vz:0,vy:0,yaw:0,pitch:0,grounded:true,surface:'brick',status:'active',ack:0,coyote:.1,jumpBuffer:0,lastNoise:-99,levers:0,connected:true}}
export function createMatch(players,raw={},layoutSeed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0],monsterControllers=[],stage=1){const count=Math.max(1,players.length+monsterControllers.length);const match={stage:stage===2?2:1,layoutSeed,time:0,tick:0,timedOut:false,collapseAt:null,settings:settings(raw),players:structuredClone(players),levers:LEVERS.map(()=>false),traps:createTrapStates(layoutSeed),open:false,finished:false,events:[],monsters:Array.from({length:count},(_,i)=>({id:'m'+i,kind:'monster',controllerId:monsterControllers[i]||null,x:-ARENA.halfWidth+1.6,z:[22,0,-22,35][i],y:0,vx:0,vz:0,yaw:0,pitch:0,ack:0,status:'active',connected:true,target:null,heard:null,path:[],repath:0,patrol:0,alert:false,heading:0,lookYaw:0})),sounds:[],eventId:0};return stage===2?prepareStageTwo(match):match}
export function sanitizeInput(raw){if(!raw||!Number.isSafeInteger(raw.seq)||raw.seq<1||raw.seq>1e9)return null;for(const k of['right','forward','yaw','pitch'])if(!Number.isFinite(raw[k]))return null;return {seq:raw.seq,right:clamp(raw.right,-1,1),forward:clamp(raw.forward,-1,1),yaw:((raw.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),pitch:clamp(raw.pitch,-1.35,1.35),jump:raw.jump===true,interact:raw.interact===true,fov:clamp(Number(raw.fov)||68,55,85),aspect:clamp(Number(raw.aspect)||16/9,.5,4)}}
export function movePlayer(p,input={},cfg,open=false,platforms=PLATFORMS,extraSolids=[],authoritativeWalls=null){
 if(p.status!=='active'||p.entered===false){p.ack=input.seq||p.ack;return {splash:false,step:false}}
 const wasWater=p.grounded&&p.surface==='water',wasGrounded=p.grounded;const dt=STEP
 if(wasWater)p.waterEntry=true
 p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;p.pitch=Number.isFinite(input.pitch)?input.pitch:p.pitch
 let r=input.right||0,f=input.forward||0,n=Math.hypot(r,f);if(n>1){r/=n;f/=n}
 const tempo=cfg.jumpTempo||1
 p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.14:Math.max(0,p.jumpBuffer-dt)
 if(p.jumpBuffer>0&&p.coyote>0){p.vy=cfg.jump*tempo;p.grounded=false;p.coyote=0;p.jumpBuffer=0}
 // Speed up the airborne arc, without changing walking pace or its intended reach.
 const speed=cfg.speed*(wasWater?.68:1)*(p.grounded?1:tempo),dx=(Math.cos(p.yaw)*r-Math.sin(p.yaw)*f)*speed,dz=(-Math.sin(p.yaw)*r-Math.cos(p.yaw)*f)*speed,acc=(n?cfg.acceleration:cfg.friction)*dt
 p.vx=approach(p.vx,dx,acc);p.vz=approach(p.vz,dz,acc)
 // Walking into an ordinary brick from water climbs its edge. Lever islands have no handhold.
 const worldSolids=[...(authoritativeWalls||solids(open)),...extraSolids]
 if(p.grounded&&n>0){const nx=p.x+p.vx*dt,nz=p.z+p.vz*dt;const ledge=platforms.find(f=>!f.leverId&&(wasWater?f.y<=2.05:f.stair&&f.y>p.y+.01&&f.y-p.y<=.24)&&inside(nx,nz,f,RADIUS+.08)&&!inside(p.x,p.z,f)&&((f.x-p.x)*p.vx+(f.z-p.z)*p.vz)>0);if(ledge){const x=clamp(nx,ledge.x-ledge.w/2+.09,ledge.x+ledge.w/2-.09),z=clamp(nz,ledge.z-ledge.d/2+.09,ledge.z+ledge.d/2-.09);if(!worldSolids.some(b=>inside(x,z,b,RADIUS))){p.x=x;p.z=z;p.y=ledge.y;p.vy=0;p.grounded=true;p.surface='brick';p.waterEntry=false}}}
 const restricted=f=>!!f.leverId&&p.waterEntry===true
 const previousY=p.y
 // A falling player may overlap a raised edge before their feet drop below it.
 // Resolve that shallow overlap once, so the side never traps both movement axes.
 for(const platform of platforms)if((p.y<platform.y-.12||restricted(platform))&&inside(p.x,p.z,platform,RADIUS)){
  const ox=platform.w/2+RADIUS-Math.abs(p.x-platform.x),oz=platform.d/2+RADIUS-Math.abs(p.z-platform.z)
  if(ox<oz)p.x=platform.x+(Math.sign(p.x-platform.x)||1)*(platform.w/2+RADIUS+.001)
  else p.z=platform.z+(Math.sign(p.z-platform.z)||1)*(platform.d/2+RADIUS+.001)
 }
 const blockers=[...worldSolids,...platforms.filter(platform=>p.y<platform.y-.12||restricted(platform))]
 const nx=clamp(p.x+p.vx*dt,-BOUNDS.x,BOUNDS.x)
 if(!blockers.some(b=>inside(nx,p.z,b,RADIUS)))p.x=nx;else p.vx=0
 const nz=clamp(p.z+p.vz*dt,BOUNDS.zMin,BOUNDS.zMax)
 if(!blockers.some(b=>inside(p.x,nz,b,RADIUS)))p.z=nz;else p.vz=0
 p.vy-=cfg.gravity*tempo*tempo*dt;p.y+=p.vy*dt;p.grounded=false
 let support=null
 for(const platform of platforms)if(!restricted(platform)&&inside(p.x,p.z,platform)&&previousY>=platform.y-.06&&p.y<=platform.y&&p.vy<=0&&(!support||platform.y>support.y))support=platform
 if(support){p.y=support.y;p.vy=0;p.grounded=true;p.surface='brick';p.waterEntry=false}else if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;p.surface='water'}else p.surface='air'
 p.ack=input.seq||p.ack
 return {land:p.grounded&&p.surface==='brick'&&!wasGrounded,brickStep:p.grounded&&p.surface==='brick'&&Math.hypot(p.vx,p.vz)>.2,splash:p.grounded&&p.surface==='water'&&(!wasWater||!wasGrounded),step:p.grounded&&p.surface==='water'&&Math.hypot(p.vx,p.vz)>.2}
}
export function moveControlledMonster(m,input={},cfg,platforms=PLATFORMS){
 if(m.status!=='active')return
 m.yaw=Number.isFinite(input.yaw)?input.yaw:m.yaw;m.pitch=Number.isFinite(input.pitch)?input.pitch:m.pitch
 let r=input.right||0,f=input.forward||0,n=Math.hypot(r,f);if(n>1){r/=n;f/=n}
 const speed=Math.max(5,Math.min(14,cfg.monsterSpeed*.55)),dx=(Math.cos(m.yaw)*r-Math.sin(m.yaw)*f)*speed,dz=(-Math.sin(m.yaw)*r-Math.cos(m.yaw)*f)*speed,acc=(n?30:24)*STEP
 m.vx=approach(m.vx||0,dx,acc);m.vz=approach(m.vz||0,dz,acc)
 const nx=m.x+m.vx*STEP;if(waterWalkable(nx,m.z,.38,platforms))m.x=nx;else m.vx=0
 const nz=m.z+m.vz*STEP;if(waterWalkable(m.x,nz,.38,platforms))m.z=nz;else m.vz=0
 if(Math.hypot(m.vx,m.vz)>.05)m.heading=Math.atan2(m.vx,m.vz)
 m.lookYaw=m.yaw;m.alert=Math.hypot(m.vx,m.vz)>.2;m.mode='controlled';m.ack=input.seq||m.ack
}
export function canUseLever(p,l,platforms=PLATFORMS){return p.grounded&&p.surface==='brick'&&Math.hypot(p.x-l.x,p.z-l.z)<2.1&&platforms.some(f=>(f.leverId===l.id||f.id==='maze-floor')&&inside(p.x,p.z,f)&&Math.abs(p.y-f.y)<.08)}
function emit(s,type,data={}){s.events.push({id:++s.eventId,type,time:s.time,...data});s.events=s.events.slice(-30)}
function landingTime(p,platform,cfg){if(p.grounded||p.surface!=='air'||p.y<=platform.y+.08)return Infinity;const gravity=cfg.gravity*(cfg.jumpTempo||1)**2,dy=p.y-platform.y,root=p.vy*p.vy+2*gravity*dy;if(root<0)return Infinity;return (p.vy+Math.sqrt(root))/gravity}
function shiftFor(s,platform,p){const alongX=Math.abs(p.vx)>=Math.abs(p.vz),axis=alongX?'z':'x',preferred=((s.layoutSeed+s.tick+platform.c*7+platform.r*13)&1)?1:-1,offset=TRAP_TIMING.shift;const valid=sign=>{const x=platform.x+(axis==='x'?offset*sign:0),z=platform.z+(axis==='z'?offset*sign:0),candidate={...platform,x,z};return Math.abs(x)<ARENA.halfWidth-platform.w/2-1&&Math.abs(z)<ARENA.halfDepth-platform.d/2-1&&!WALLS.some(w=>Math.abs(w.x-x)<(w.w+candidate.w)/2+.2&&Math.abs(w.z-z)<(w.d+candidate.d)/2+.2)};const sign=valid(preferred)?preferred:valid(-preferred)?-preferred:preferred;return axis==='x'?{dx:offset*sign,dz:0}:{dx:0,dz:offset*sign}}
function triggerLandingTraps(s,platforms){if(s.timedOut)return;const byId=new Map(platforms.map(p=>[p.id,p]));for(const trap of s.traps||[]){if(trap.triggered)continue;const platform=byId.get(trap.platformId);if(!platform)continue;for(const p of s.players){if(p.status!=='active')continue;const time=landingTime(p,platform,s.settings);if(time<.06||time>TRAP_TIMING.lead)continue;const x=p.x+p.vx*time,z=p.z+p.vz*time;if(!inside(x,z,platform,-.08))continue;trap.triggered=true;trap.startedAt=s.time;if(trap.kind==='shift')Object.assign(trap,shiftFor(s,platform,p));else trap.axis=Math.abs(p.vx)>=Math.abs(p.vz)?'x':'z';emit(s,'trap',{trap:trap.kind,platformId:trap.platformId,x:platform.x,y:platform.y,z:platform.z});break}}}
export function tick(s,inputs={}){
 if(s.stage===2){if(!s.finished)tickStageTwo(s,inputs,{movePlayer,emit,canUseLever});return}
 if(s.finished)return;const allPlatforms=layoutPlatforms(s.layoutSeed),beforePlayers=new Map(s.players.map(p=>[p.id,{x:p.x,y:p.y,z:p.z}]));s.time+=STEP;s.tick++
 if(!s.timedOut&&s.time>=MATCH_TIME_LIMIT){s.timedOut=true;s.collapseAt=s.time;emit(s,'timeout')}
 triggerLandingTraps(s,allPlatforms)
 const platforms=runtimePlatforms(allPlatforms,s.traps,s.time,s.timedOut),extraSolids=trapWalls(allPlatforms,s.traps,s.time)
 for(const p of s.players){const input=inputs[p.id]||{},motion=movePlayer(p,input,s.settings,s.open,platforms,extraSolids)
  if(p.status!=='active')continue
  if(motion.splash||(motion.step&&s.time-p.lastNoise>.46)){p.lastNoise=s.time;s.sounds.push({player:p.id,x:p.x,z:p.z,at:s.time});emit(s,'splash',{player:p.id,x:p.x,z:p.z,strong:motion.splash})}
  if(motion.land)emit(s,'brickLand',{player:p.id,x:p.x,y:p.y,z:p.z})
  else if(motion.brickStep&&s.time-(p.lastBrickNoise??-99)>.43){p.lastBrickNoise=s.time;emit(s,'brickStep',{player:p.id,x:p.x,y:p.y,z:p.z})}
  if(input.interact){const i=LEVERS.findIndex(l=>canUseLever(p,l,platforms));if(i>=0&&!s.levers[i]){s.levers[i]=true;p.levers++;emit(s,'lever',{index:i,player:p.id,x:LEVERS[i].x,y:LEVERS[i].y,z:LEVERS[i].z});if(s.levers.every(Boolean)){s.open=true;emit(s,'door',{x:DOOR.x,y:EXIT.y,z:DOOR.z})}}}
  if(s.open&&Math.abs(p.x-EXIT.x)<EXIT.w/2-.2&&p.z<DOOR.z-2&&p.y>EXIT.y-.3){p.status='escaped';emit(s,'escape',{player:p.id})}
 }
 s.sounds=s.sounds.filter(n=>s.time-n.at<s.settings.memory)
 const assigned=new Map()
 for(const monster of s.monsters){
  const monsterStart={x:monster.x,z:monster.z,t:0},controlled=!!monster.controllerId
  if(controlled)moveControlledMonster(monster,inputs[monster.controllerId]||{},s.settings,platforms)
  else if(prepareMonster(s,monster,platforms,assigned))emit(s,'alert',{monster:monster.id})
  monster.nextCry??=7+Number(monster.id.slice(1))*3.7;if(s.time>=monster.nextCry){monster.nextCry=s.time+7+((Math.sin(s.tick*12.9898+(s.layoutSeed||0))*43758.5453)%1+1)%1*16;emit(s,'monsterCry',{monster:monster.id})}
  const totalTravel=(monster.alert?s.settings.monsterSpeed:MONSTER_BEHAVIOR.patrolSpeed)*STEP,trail=[monsterStart];let travel=controlled?0:totalTravel
  while(travel>0&&monster.path.length){const next=monster.path[0],d=Math.hypot(next.x-monster.x,next.z-monster.z);if(d<.03){monster.path.shift();continue}const step=Math.min(travel,d),x=monster.x+(next.x-monster.x)/d*step,z=monster.z+(next.z-monster.z)/d*step;if(waterWalkable(x,z,.38,platforms)){monster.heading=Math.atan2(x-monster.x,z-monster.z);monster.lookYaw=monster.heading;monster.x=x;monster.z=z}else{monster.path=[];monster.repath=0;break}travel-=step;trail.push({x:monster.x,z:monster.z,t:1-travel/totalTravel});if(step>=d)monster.path.shift()}
  trail.push({x:monster.x,z:monster.z,t:1})
  for(const p of s.players){if(p.status!=='active')continue;const before=beforePlayers.get(p.id);let caught=false
   for(let i=1;i<trail.length&&!caught;i++){const a=trail[i-1],b=trail[i],at=t=>({x:before.x+(p.x-before.x)*t,y:before.y+(p.y-before.y)*t,z:before.z+(p.z-before.z)*t});caught=monsterContact(at(a.t),at(b.t),a,b,platforms,[...solids(s.open),...extraSolids])}
   if(caught){p.status='dead';emit(s,'caught',{player:p.id});if(s.settings.elimination==='team')for(const other of s.players)if(other.status==='active')other.status='dead'}
  }
 }
 s.finished=s.players.every(p=>p.status!=='active')
}
export function snapshot(s,viewer=null){
 const monsterView=viewer?.role==='monster',players=(monsterView?s.players.filter(p=>p.status==='active'&&(s.stage===2||p.grounded&&p.surface==='water')):s.players).map(p=>({...p})),allowed=monsterView?new Set(['splash','timeout','trap','door','monsterCry','alert','caught']):null
 return {...s,players,monsters:s.monsters.map(m=>({id:m.id,kind:'monster',controllerId:m.controllerId||null,x:m.x,y:m.y||0,z:m.z,vx:m.vx||0,vz:m.vz||0,yaw:m.yaw||m.lookYaw||0,pitch:m.pitch||0,ack:m.ack||0,status:m.status||'active',connected:m.connected!==false,entered:m.entered!==false,target:monsterView?null:m.target,alert:m.alert,mode:m.mode,frozen:m.frozen===true,lookYaw:m.lookYaw,heading:m.heading})),events:allowed?s.events.filter(e=>allowed.has(e.type)):s.events,summary:{active:s.players.filter(p=>p.status==='active').length,escaped:s.players.filter(p=>p.status==='escaped').length,dead:s.players.filter(p=>p.status==='dead').length,total:s.players.length},viewer:viewer?{id:viewer.id,role:viewer.role}:null,sounds:undefined}
}
