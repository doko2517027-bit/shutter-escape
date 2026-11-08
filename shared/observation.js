// Authoritative visibility for stage 2. Walls block sight, including when
// the monster is in the camera cone but behind a corner.
export function observesMonster(player, monster, walls, {fov=60,aspect=16/9,eye=1.58}={}) {
 if(player.status!=='active'||player.connected===false||player.entered===false)return false
 const yaw=player.yaw||0,pitch=player.pitch||0,tangent=Math.tan(fov*Math.PI/360)
 const length=Math.hypot(monster.x-player.x,monster.z-player.z)||1,sideX=-(monster.z-player.z)/length,sideZ=(monster.x-player.x)/length
 // Check head, torso and feet: a visible part around a corner still counts.
 for(const height of[.25,1.1,1.9,2.2])for(const offset of[-.32,0,.32]){
 const dx=monster.x+sideX*offset-player.x,dz=monster.z+sideZ*offset-player.z,dy=(monster.y||0)+height-eye-(player.y||0)
 const forward=-Math.sin(yaw)*dx-Math.cos(yaw)*dz,side=Math.cos(yaw)*dx-Math.sin(yaw)*dz,depth=forward*Math.cos(pitch)+dy*Math.sin(pitch),vertical=dy*Math.cos(pitch)-forward*Math.sin(pitch)
 if(depth<.02||Math.abs(side)>depth*tangent*aspect||Math.abs(vertical)>depth*tangent)continue
 let blocked=false
 for(const wall of walls){let lo=0,hi=1;for(const [origin,delta,center,size]of [[player.x,dx,wall.x,wall.w],[player.z,dz,wall.z,wall.d]]){
  const min=center-size/2,max=center+size/2
  if(Math.abs(delta)<1e-9){if(origin<min||origin>max){lo=2;break}}else{const a=(min-origin)/delta,b=(max-origin)/delta;lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b))}
 }if(lo<=hi&&hi>0.001&&lo<.999){blocked=true;break}}
 if(!blocked)return true
 }
 return false
}

export function observationState(players,monster,walls,camera={}){
 const active=players.filter(p=>p.status==='active'&&p.connected!==false&&p.entered!==false)
 const target=active.reduce((best,p)=>!best||Math.hypot(p.x-monster.x,p.z-monster.z)<Math.hypot(best.x-monster.x,best.z-monster.z)?p:best,null)
 return {frozen:active.some(p=>observesMonster(p,monster,walls,camera)),target:target?.id||null,lookYaw:target?Math.atan2(target.x-monster.x,target.z-monster.z):monster.lookYaw||0}
}
