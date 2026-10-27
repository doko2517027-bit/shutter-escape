import {ARENA,STEP,navigationPath,waterWalkable} from './world.js'
export const MONSTER_BEHAVIOR={frontDot:.82,stagingDistance:8,linger:1.8,roamTime:3.5,patrolSpeed:3.2}
export function frontFacing(monster,player){const dx=monster.x-player.x,dz=monster.z-player.z,d=Math.hypot(dx,dz);return d<.001||(-Math.sin(player.yaw||0)*dx-Math.cos(player.yaw||0)*dz)/d>=MONSTER_BEHAVIOR.frontDot}
function frontGoal(p,platforms){for(const distance of [8,12,18])for(const angle of [0,.2,-.2,.4,-.4]){const yaw=(p.yaw||0)+angle,point={x:p.x-Math.sin(yaw)*distance,z:p.z-Math.cos(yaw)*distance};if(waterWalkable(point.x,point.z,.48,platforms))return point}return null}
function roam(s,m,platforms){for(let i=0;i<64;i++){const angle=s.tick*.031+Number(m.id.slice(1))*2.7+i*2.399,radius=.28+((s.tick*17+i*37)%101)/140,point={x:Math.cos(angle)*(ARENA.halfWidth-3)*radius,z:Math.sin(angle*1.31)*(ARENA.halfDepth-3)*radius};if(Math.hypot(point.x-m.x,point.z-m.z)>16&&waterWalkable(point.x,point.z,.48,platforms))return point}return {x:m.x,z:m.z}}
// Sound-only investigation: a safe player's current position never becomes a visual target.
function park(s,m){if(m.target)m.ignored[m.target]=s.time;m.heard=null;m.target=null;m.path=[];m.alert=false;m.parked=true;m.listenAfter=s.time;m.mode='waiting';m.arrivedAt=null;m.lingerAnchor=null}
export function prepareMonster(s,m,platforms,assigned){
 m.ignored||={};m.repath=(m.repath||0)-STEP;m.patrol=(m.patrol||0)-STEP;const wasAlert=m.alert
 const candidates=s.sounds.filter(n=>n.at>Math.max(m.ignored[n.player]??-1,m.listenAfter??-1)&&s.players.some(p=>p.id===n.player&&p.status==='active')&&Math.hypot(n.x-m.x,n.z-m.z)<s.settings.hearing).map(n=>({n,score:Math.hypot(n.x-m.x,n.z-m.z)+(s.time-n.at)*2+(assigned.get(n.player)||0)*16})).sort((a,b)=>a.score-b.score),sound=candidates[0]?.n
 if(sound){assigned.set(sound.player,(assigned.get(sound.player)||0)+1);if(!m.heard||m.target!==sound.player||sound.at>m.heard.at){m.target=sound.player;m.heard={x:sound.x,z:sound.z,at:sound.at};m.parked=false;m.arrivedAt=null;m.lingerAnchor=null;m.repath=0}}
 if(m.heard&&(s.time-m.heard.at>s.settings.memory||!s.players.some(p=>p.id===m.target&&p.status==='active'))){park(s,m);return false}
 m.alert=!!m.heard
 if(m.heard){const player=s.players.find(p=>p.id===m.target),onWater=player?.surface==='water',source={...player,x:m.heard.x,z:m.heard.z};let goal=m.heard,avoid=null,mode='investigate'
  if(onWater&&!frontFacing(m,source)&&Math.hypot(m.x-source.x,m.z-source.z)>=2){mode='flank';goal=frontGoal(source,platforms)||m;avoid={x:source.x,z:source.z,radius:3}}
  else if(onWater)mode='charge'
  if(m.mode!==mode){m.mode=mode;m.repath=0}
  const arrived=Math.hypot(m.x-m.heard.x,m.z-m.heard.z)<=.65||m.arrivedAt!=null
  if(arrived){m.path=[];m.mode='waiting';m.arrivedAt??=s.time;if(s.time-m.arrivedAt>=MONSTER_BEHAVIOR.linger)park(s,m);return !wasAlert&&m.alert}
  if(m.repath<=0){m.path=navigationPath(m,goal,platforms,avoid);m.repath=.5;if(!m.path.length)m.arrivedAt=s.time}
  // Stop at the closest reachable water point; do not circle the brick or search nearby.
  if(!m.lingerAnchor||Math.hypot(m.x-m.lingerAnchor.x,m.z-m.lingerAnchor.z)>.4)m.lingerAnchor={x:m.x,z:m.z,at:s.time}
  if(s.time-m.lingerAnchor.at>=MONSTER_BEHAVIOR.linger){m.path=[];m.arrivedAt??=s.time}
 }else if(m.parked){m.path=[];m.mode='waiting'}
 else{m.mode='patrol';if(m.patrol<=0||!m.path?.length){m.destination=roam(s,m,platforms);m.patrol=20;m.repath=0}if(m.repath<=0){m.path=navigationPath(m,m.destination||m,platforms);m.repath=5}}
 return !wasAlert&&m.alert
}
