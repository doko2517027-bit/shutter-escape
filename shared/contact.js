import {MONSTER_BEHAVIOR} from './monsters.js'
import {RADIUS,inside} from './world.js'
// Match the standard monster's outstretched arms; uploaded art never changes physics.
export const MONSTER_RADIUS=.78,MONSTER_HEIGHT=2.4,PLAYER_HEIGHT=1.75
const lerp=(a,b,t)=>a+(b-a)*t
function crossesBox(a,b,box){let lo=0,hi=1;for(const [key,size] of [['x','w'],['z','d']]){const d=b[key]-a[key],min=box[key]-box[size]/2,max=box[key]+box[size]/2;if(Math.abs(d)<1e-9){if(a[key]<min||a[key]>max)return false;continue}let first=(min-a[key])/d,last=(max-a[key])/d;if(first>last)[first,last]=[last,first];lo=Math.max(lo,first);hi=Math.min(hi,last);if(lo>hi)return false}return true}
export function monsterContact(playerBefore,playerAfter,monsterBefore,monsterAfter,platforms,walls,facing=null){
 const rx=playerBefore.x-monsterBefore.x,rz=playerBefore.z-monsterBefore.z,dx=(playerAfter.x-monsterAfter.x)-rx,dz=(playerAfter.z-monsterAfter.z)-rz,radius=MONSTER_RADIUS+RADIUS
 const a=dx*dx+dz*dz,b=2*(rx*dx+rz*dz),c=rx*rx+rz*rz-radius*radius
 let first=0,last=1
 if(a<1e-12){if(c>0)return false}else{const disc=b*b-4*a*c;if(disc<0)return false;const root=Math.sqrt(disc);first=Math.max(0,(-b-root)/(2*a));last=Math.min(1,(-b+root)/(2*a));if(first>last)return false}
 // Vertical overlap prevents catching a jump passing completely above the monster.
 const dy=playerAfter.y-playerBefore.y
 if(Math.abs(dy)<1e-9){if(playerBefore.y>MONSTER_HEIGHT||playerBefore.y+PLAYER_HEIGHT<0)return false}else{let lo=(-PLAYER_HEIGHT-playerBefore.y)/dy,hi=(MONSTER_HEIGHT-playerBefore.y)/dy;if(lo>hi)[lo,hi]=[hi,lo];first=Math.max(first,lo);last=Math.min(last,hi);if(first>last)return false}
 for(let i=0;i<=8;i++){const t=lerp(first,last,i/8),p={x:lerp(playerBefore.x,playerAfter.x,t),z:lerp(playerBefore.z,playerAfter.z,t),y:lerp(playerBefore.y,playerAfter.y,t)},m={x:lerp(monsterBefore.x,monsterAfter.x,t),z:lerp(monsterBefore.z,monsterAfter.z,t)}
  const distance=Math.hypot(m.x-p.x,m.z-p.z);if(facing!==null&&distance>.001&&(-Math.sin(facing)*(m.x-p.x)-Math.cos(facing)*(m.z-p.z))/distance<MONSTER_BEHAVIOR.frontDot)continue
  if(platforms.some(floor=>inside(p.x,p.z,floor)&&p.y>=floor.y-.12))continue
  const barriers=[...walls,...platforms.filter(floor=>p.y<floor.y-.12)]
  if(!barriers.some(wall=>crossesBox(p,m,wall)))return true
 }
 return false
}
