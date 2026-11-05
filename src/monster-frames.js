// Render between completed simulation steps; collisions always use the current state.
export class MonsterFrames{
 constructor(){this.reset()}
 reset(){this.previous=null;this.seed=null;this.tick=-1}
 capture(state){this.previous=state.monsters.map(m=>({id:m.id,x:m.x,z:m.z,lookYaw:m.lookYaw}));this.seed=state.layoutSeed;this.tick=state.tick}
 sample(state,alpha){if(!state||state.layoutSeed!==this.seed||state.tick!==this.tick+1)return state;const t=Math.max(0,Math.min(1,alpha));return {...state,monsters:state.monsters.map(m=>{const p=this.previous.find(p=>p.id===m.id);if(!p)return m;const out={...m,x:p.x+(m.x-p.x)*t,z:p.z+(m.z-p.z)*t};if(Number.isFinite(p.lookYaw)&&Number.isFinite(m.lookYaw))out.lookYaw=p.lookYaw+Math.atan2(Math.sin(m.lookYaw-p.lookYaw),Math.cos(m.lookYaw-p.lookYaw))*t;return out})}}
}
