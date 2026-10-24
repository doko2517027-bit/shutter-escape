export const BRAND={title:'Switch & Shutter',subtitle:'FIRST-PERSON COOPERATIVE HORROR',version:'TEST BUILD 01',instruction:'鉄のシャッターのゴールの扉から出たらクリア。'}
export const STEP=1/30,MAX_PLAYERS=4
export const DEFAULTS={speed:4.6,jump:5.6,jumpTempo:1.2,gravity:13,acceleration:26,friction:22,monsterSpeed:24,hearing:48,memory:9,elimination:'individual'}
export const LIMITS={speed:[3,6],jump:[4.5,7],jumpTempo:[1,1.5],gravity:[10,20],acceleration:[12,45],friction:[10,40],monsterSpeed:[9,32],hearing:[20,80],memory:[3,18]}
export function migratePreferences(raw={}){const next={...raw};if((next.balanceVersion||0)<2&&next.monsterSpeed===17)next.monsterSpeed=DEFAULTS.monsterSpeed;next.balanceVersion=2;return next}
export function settings(raw={}){const out={...DEFAULTS};for(const [key,[min,max]] of Object.entries(LIMITS)){const n=Number(raw[key]);if(Number.isFinite(n))out[key]=Math.max(min,Math.min(max,n))}if(raw.elimination==='team')out.elimination='team';return out}
const cells=new Set(),add=(c,r)=>cells.add(`${c},${r}`),span=(r,a,b)=>{for(let c=a;c<=b;c++)add(c,r)}
span(0,0,4);add(4,1);span(2,0,8);add(8,3);span(4,5,8);add(5,5);span(6,0,5);add(0,7);span(8,0,6);span(9,6,8);add(0,1);add(1,1);add(2,3);add(2,4);add(2,5);add(5,7)
export const PLATFORMS=[...cells].map((cell,i)=>{const[c,r]=cell.split(',').map(Number);return {id:'p'+i,c,r,x:-24+c*6,z:28-r*6,w:4,d:4,y:.65+Math.floor(r/3)*.22}})
PLATFORMS.find(p=>p.c===0&&p.r===0).w=7
PLATFORMS.find(p=>p.c===0&&p.r===0).d=6.6
PLATFORMS.push({id:'exit',x:24,z:-30,w:5.8,d:12,y:1.31,c:8,r:10})
export const LEVERS=[{id:'L1',x:18,z:16,y:.65},{id:'L2',x:-18,z:-8,y:1.09},{id:'L3',x:12,z:-26,y:1.31}]
export const WALLS=[{x:-32,z:0,w:.8,d:74},{x:32,z:0,w:.8,d:74},{x:0,z:36,w:64,d:.8},{x:-5,z:-36,w:53,d:.8},{x:30,z:-36,w:4,d:.8},{x:20.6,z:-32,w:.7,d:8},{x:27.4,z:-32,w:.7,d:8},{x:-7,z:15,w:.8,d:13},{x:7,z:0,w:.8,d:13},{x:-7,z:-15,w:.8,d:13}]
export const DOOR={x:24,z:-32,w:6,d:.5},BOUNDS={x:31.3,zMin:-36.5,zMax:35.3}
export const RADIUS=.28,EYE=1.58
export function inside(x,z,box,pad=0){return Math.abs(x-box.x)<box.w/2+pad&&Math.abs(z-box.z)<box.d/2+pad}
export function platformAt(x,z){return PLATFORMS.filter(p=>inside(x,z,p)).sort((a,b)=>b.y-a.y)[0]||null}
export function solids(open){return open?WALLS:[...WALLS,DOOR]}
export function waterWalkable(x,z,pad=.42){return Math.abs(x)<30.9&&z>-35&&z<35&&!PLATFORMS.some(p=>inside(x,z,p,pad))&&!WALLS.some(w=>inside(x,z,w,pad))}
export function navigationPath(from,to){
 const origin=[-31,-35],width=63,height=71,idx=(x,z)=>(z-origin[1])*width+x-origin[0],point=i=>({x:i%width+origin[0],z:Math.floor(i/width)+origin[1]}),valid=(x,z)=>x>=-31&&x<=31&&z>=-35&&z<=35&&waterWalkable(x,z,.48)
 const nearest=p=>{const x=Math.round(p.x),z=Math.round(p.z);for(let r=0;r<8;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(valid(x+a,z+b))return idx(x+a,z+b);return -1}
 const start=nearest(from),end=nearest(to);if(start<0||end<0)return []
 const queue=[start],parent=new Int32Array(width*height).fill(-1);parent[start]=start
 for(let q=0;q<queue.length;q++){const current=queue[q];if(current===end)break;const p=point(current);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=p.x+dx,z=p.z+dz;if(!valid(x,z))continue;const next=idx(x,z);if(parent[next]!==-1)continue;parent[next]=current;queue.push(next)}}
 if(parent[end]===-1)return [];const path=[];let at=end;while(at!==start){path.push(point(at));at=parent[at]}return path.reverse()
}
