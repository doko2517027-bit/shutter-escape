import {ARENA,STEP,navigationPath,waterWalkable} from './world.js'
export const MONSTER_BEHAVIOR={frontDot:.82,stagingDistance:8,linger:1.8,roamTime:3.5,patrolSpeed:3.2}
export function frontFacing(monster,player){const dx=monster.x-player.x,dz=monster.z-player.z,d=Math.hypot(dx,dz);return d<.001||(-Math.sin(player.yaw||0)*dx-Math.cos(player.yaw||0)*dz)/d>=MONSTER_BEHAVIOR.frontDot}
function frontGoal(p,platforms){for(const distance of [8,12,18])for(const angle of [0,.2,-.2,.4,-.4]){const yaw=(p.yaw||0)+angle,point={x:p.x-Math.sin(yaw)*distance,z:p.z-Math.cos(yaw)*distance};if(waterWalkable(point.x,point.z,.48,platforms))return point}return null}
function roam(s,m,platforms){for(let i=0;i<48;i++){const angle=s.tick*.031+Number(m.id.slice(1))*2.7+i*2.399,point={x:Math.cos(angle)*(ARENA.halfWidth-3),z:Math.sin(angle*1.31)*(ARENA.halfDepth-3)};if(Math.hypot(point.x-m.x,point.z-m.z)>16&&waterWalkable(point.x,point.z,.48,platforms))return point}return {x:m.x,z:m.z}}
export function prepareMonster(s,m,platforms,assigned){
 m.ignored||={};m.roamUntil||=0;m.repath=(m.repath||0)-STEP;m.patrol=(m.patrol||0)-STEP
 const candidates=s.time<m.roamUntil?[]:s.sounds.filter(n=>n.at>(m.ignored[n.player]??-1)&&s.players.some(p=>p.id===n.player&&p.status==='active')&&Math.hypot(n.x-m.x,n.z-m.z)<s.settings.hearing).map(n=>({n,score:Math.hypot(n.x-m.x,n.z-m.z)+(s.time-n.at)*2+(assigned.get(n.player)||0)*16})).sort((a,b)=>a.score-b.score)
 const sound=candidates[0]?.n
 if(sound){if(m.target!==sound.player){m.lingerAnchor=null;m.repath=0}m.target=sound.player;m.heard={x:sound.x,z:sound.z,at:sound.at};assigned.set(sound.player,(assigned.get(sound.player)||0)+1)}
 if(m.heard&&(s.time-m.heard.at>s.settings.memory||!s.players.some(p=>p.id===m.target&&p.status==='active'))){m.heard=null;m.target=null;m.repath=0}
 if(m.heard){if(!m.lingerAnchor||Math.hypot(m.x-m.lingerAnchor.x,m.z-m.lingerAnchor.z)>.4)m.lingerAnchor={x:m.x,z:m.z,at:s.time};if(s.time-m.lingerAnchor.at>=MONSTER_BEHAVIOR.linger){m.ignored[m.target]=s.time;m.heard=null;m.target=null;m.roamUntil=s.time+MONSTER_BEHAVIOR.roamTime;m.destination=roam(s,m,platforms);m.patrol=6;m.repath=0;m.lingerAnchor=null}}
 const wasAlert=m.alert;m.alert=!!m.heard
 let goal=m.destination,avoid=null;const player=m.heard&&s.players.find(p=>p.id===m.target)
 if(player){const charge=frontFacing(m,player)&&Math.hypot(m.x-player.x,m.z-player.z)<14,mode=charge?'charge':'flank';if(m.mode!==mode){m.repath=0;m.windupUntil=charge?s.time+.18:0}m.mode=mode
  if(charge){goal={x:player.x,z:player.z};if(s.time<(m.windupUntil||0)){m.path=[];return !wasAlert&&m.alert}}
  else{goal=frontGoal(player,platforms);avoid={x:player.x,z:player.z,radius:3};if(!goal)goal={x:m.x,z:m.z}}
  if(m.planYaw!==undefined&&Math.abs(Math.atan2(Math.sin(player.yaw-m.planYaw),Math.cos(player.yaw-m.planYaw)))>.25)m.repath=Math.min(m.repath,.12)
 }else{m.mode='patrol';if(m.patrol<=0||!m.path?.length){m.destination=roam(s,m,platforms);m.patrol=6;goal=m.destination;m.repath=0}}
 if(m.repath<=0){m.path=navigationPath(m,goal||m,platforms,avoid);m.repath=m.alert?.5:2;m.planYaw=player?.yaw}
 return !wasAlert&&m.alert
}
