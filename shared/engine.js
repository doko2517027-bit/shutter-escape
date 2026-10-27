import {prepareMonster,frontFacing,MONSTER_BEHAVIOR} from './monsters.js'
import {monsterContact} from './contact.js'
import {STEP,ARENA,START,EXIT,PLATFORMS,layoutPlatforms,LEVERS,DOOR,BOUNDS,RADIUS,inside,solids,navigationPath,waterWalkable,settings} from './world.js'
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),approach=(a,b,d)=>a<b?Math.min(b,a+d):Math.max(b,a-d)
export function createPlayer(id,name='探索者',i=0){return {id,name:String(name).slice(0,16),x:START.x-1+(i%2)*1.2,z:START.z+Math.floor(i/2)*1.1,y:START.y,vx:0,vz:0,vy:0,yaw:0,pitch:0,grounded:true,surface:'brick',status:'active',ack:0,coyote:.1,jumpBuffer:0,lastNoise:-99,levers:0,connected:true}}
export function createMatch(players,raw={},layoutSeed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0]){return {layoutSeed,time:0,tick:0,settings:settings(raw),players:structuredClone(players),levers:LEVERS.map(()=>false),open:false,finished:false,events:[],monsters:players.map((p,i)=>({id:'m'+i,x:-ARENA.halfWidth+1.6,z:[22,0,-22,35][i],target:null,heard:null,path:[],repath:0,patrol:0,alert:false})),sounds:[],eventId:0}}
export function sanitizeInput(raw){if(!raw||!Number.isSafeInteger(raw.seq)||raw.seq<1||raw.seq>1e9)return null;for(const k of['right','forward','yaw','pitch'])if(!Number.isFinite(raw[k]))return null;return {seq:raw.seq,right:clamp(raw.right,-1,1),forward:clamp(raw.forward,-1,1),yaw:((raw.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2),pitch:clamp(raw.pitch,-1.35,1.35),jump:raw.jump===true,interact:raw.interact===true}}
export function movePlayer(p,input={},cfg,open=false,platforms=PLATFORMS){
 if(p.status!=='active')return {splash:false,step:false}
 const wasWater=p.grounded&&p.surface==='water',wasGrounded=p.grounded;const dt=STEP
 p.yaw=Number.isFinite(input.yaw)?input.yaw:p.yaw;p.pitch=Number.isFinite(input.pitch)?input.pitch:p.pitch
 let r=input.right||0,f=input.forward||0,n=Math.hypot(r,f);if(n>1){r/=n;f/=n}
 const tempo=cfg.jumpTempo||1
 p.coyote=p.grounded?.12:Math.max(0,p.coyote-dt);p.jumpBuffer=input.jump?.14:Math.max(0,p.jumpBuffer-dt)
 if(p.jumpBuffer>0&&p.coyote>0){p.vy=cfg.jump*tempo;p.grounded=false;p.coyote=0;p.jumpBuffer=0}
 // Speed up the airborne arc, without changing walking pace or its intended reach.
 const speed=cfg.speed*(wasWater?.68:1)*(p.grounded?1:tempo),dx=(Math.cos(p.yaw)*r-Math.sin(p.yaw)*f)*speed,dz=(-Math.sin(p.yaw)*r-Math.cos(p.yaw)*f)*speed,acc=(n?cfg.acceleration:cfg.friction)*dt
 p.vx=approach(p.vx,dx,acc);p.vz=approach(p.vz,dz,acc)
 const previousY=p.y
 // A falling player may overlap a raised edge before their feet drop below it.
 // Resolve that shallow overlap once, so the side never traps both movement axes.
 for(const platform of platforms)if(p.y<platform.y-.12&&inside(p.x,p.z,platform,RADIUS)){
  const ox=platform.w/2+RADIUS-Math.abs(p.x-platform.x),oz=platform.d/2+RADIUS-Math.abs(p.z-platform.z)
  if(ox<oz)p.x=platform.x+(Math.sign(p.x-platform.x)||1)*(platform.w/2+RADIUS+.001)
  else p.z=platform.z+(Math.sign(p.z-platform.z)||1)*(platform.d/2+RADIUS+.001)
 }
 const blockers=[...solids(open),...platforms.filter(platform=>p.y<platform.y-.12)]
 const nx=clamp(p.x+p.vx*dt,-BOUNDS.x,BOUNDS.x)
 if(!blockers.some(b=>inside(nx,p.z,b,RADIUS)))p.x=nx;else p.vx=0
 const nz=clamp(p.z+p.vz*dt,BOUNDS.zMin,BOUNDS.zMax)
 if(!blockers.some(b=>inside(p.x,nz,b,RADIUS)))p.z=nz;else p.vz=0
 p.vy-=cfg.gravity*tempo*tempo*dt;p.y+=p.vy*dt;p.grounded=false
 let support=null
 for(const platform of platforms)if(inside(p.x,p.z,platform)&&previousY>=platform.y-.06&&p.y<=platform.y&&p.vy<=0&&(!support||platform.y>support.y))support=platform
 if(support){p.y=support.y;p.vy=0;p.grounded=true;p.surface='brick'}else if(p.y<=0){p.y=0;p.vy=0;p.grounded=true;p.surface='water'}else p.surface='air'
 p.ack=input.seq||p.ack
 return {splash:p.grounded&&p.surface==='water'&&(!wasWater||!wasGrounded),step:p.grounded&&p.surface==='water'&&Math.hypot(p.vx,p.vz)>.2}
}
function emit(s,type,data={}){s.events.push({id:++s.eventId,type,time:s.time,...data});s.events=s.events.slice(-30)}
export function tick(s,inputs={}){
 if(s.finished)return;const platforms=layoutPlatforms(s.layoutSeed),beforePlayers=new Map(s.players.map(p=>[p.id,{x:p.x,y:p.y,z:p.z}]));s.time+=STEP;s.tick++
 for(const p of s.players){const input=inputs[p.id]||{},motion=movePlayer(p,input,s.settings,s.open,platforms)
  if(p.status!=='active')continue
  if(motion.splash||(motion.step&&s.time-p.lastNoise>.46)){p.lastNoise=s.time;s.sounds.push({player:p.id,x:p.x,z:p.z,at:s.time});emit(s,'splash',{player:p.id,x:p.x,z:p.z,strong:motion.splash})}
  if(input.interact){const i=LEVERS.findIndex(l=>Math.hypot(p.x-l.x,p.z-l.z)<2.1&&Math.abs(p.y-l.y)<1.6);if(i>=0&&!s.levers[i]){s.levers[i]=true;p.levers++;emit(s,'lever',{index:i,player:p.id});if(s.levers.every(Boolean)){s.open=true;emit(s,'door')}}}
  if(s.open&&Math.abs(p.x-EXIT.x)<EXIT.w/2-.2&&p.z<DOOR.z-2&&p.y>EXIT.y-.3){p.status='escaped';emit(s,'escape',{player:p.id})}
 }
 s.sounds=s.sounds.filter(n=>s.time-n.at<s.settings.memory)
 const assigned=new Map()
 for(const monster of s.monsters){
  if(prepareMonster(s,monster,platforms,assigned))emit(s,'alert',{monster:monster.id})
  const totalTravel=(monster.alert?s.settings.monsterSpeed:MONSTER_BEHAVIOR.patrolSpeed)*STEP,trail=[{x:monster.x,z:monster.z,t:0}];let travel=totalTravel
  while(travel>0&&monster.path.length){const next=monster.path[0],d=Math.hypot(next.x-monster.x,next.z-monster.z);if(d<.03){monster.path.shift();continue}const step=Math.min(travel,d),x=monster.x+(next.x-monster.x)/d*step,z=monster.z+(next.z-monster.z)/d*step;if(waterWalkable(x,z,.38,platforms)){monster.x=x;monster.z=z}else{monster.path=[];monster.repath=0;break}travel-=step;trail.push({x:monster.x,z:monster.z,t:1-travel/totalTravel});if(step>=d)monster.path.shift()}
  trail.push({x:monster.x,z:monster.z,t:1})
  for(const p of s.players){if(p.status!=='active')continue;const before=beforePlayers.get(p.id);if(!frontFacing(trail[0],{...before,yaw:p.yaw}))continue;let caught=false
   for(let i=1;i<trail.length&&!caught;i++){const a=trail[i-1],b=trail[i],at=t=>({x:before.x+(p.x-before.x)*t,y:before.y+(p.y-before.y)*t,z:before.z+(p.z-before.z)*t});caught=monsterContact(at(a.t),at(b.t),a,b,platforms,solids(s.open),p.yaw)}
   if(caught){p.status='dead';emit(s,'caught',{player:p.id});if(s.settings.elimination==='team')for(const other of s.players)if(other.status==='active')other.status='dead'}
  }
 }
 s.finished=s.players.every(p=>p.status!=='active')
}
export function snapshot(s){return {...s,monsters:s.monsters.map(m=>({id:m.id,x:m.x,z:m.z,target:m.target,alert:m.alert,mode:m.mode})),sounds:undefined}}
