import {STEP} from '../shared/world.js'
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]||0}
export class NetworkBuffer{
 constructor(){this.reset()}
 reset(){this.frames=[];this.delay=110;this.renderTime=null;this.lastNow=null}
 add(state,at){const last=this.frames.at(-1);if(last&&state.tick<=last.state.tick)return false;this.frames.push({state,at,time:state.tick*STEP*1000});if(this.frames.length>32)this.frames.shift();return true}
 sample(now){if(!this.frames.length)return null;const latest=this.frames.at(-1);if(this.frames.length<2)return latest.state
  const intervals=[],jitter=[];for(let i=1;i<this.frames.length;i++){const a=this.frames[i-1],b=this.frames[i];intervals.push(b.time-a.time);jitter.push(Math.abs((b.at-a.at)-(b.time-a.time)))}jitter.sort((a,b)=>a-b);const wanted=Math.max(100,Math.min(220,median(intervals)*2+(jitter[Math.floor(jitter.length*.9)]||0)*1.4));this.delay+=Math.max(-2,Math.min(4,wanted-this.delay))
  const offset=Math.min(...this.frames.map(f=>f.at-f.time)),desired=Math.min(latest.time,now-offset-this.delay),dt=this.lastNow===null?16:Math.max(0,Math.min(100,now-this.lastNow));this.lastNow=now
  this.renderTime=this.renderTime===null?Math.max(this.frames[0].time,desired):Math.max(this.renderTime,Math.min(desired,this.renderTime+dt*1.2))
  let a=this.frames[0],b=latest;for(let i=1;i<this.frames.length;i++)if(this.frames[i].time>=this.renderTime){a=this.frames[i-1];b=this.frames[i];break}const t=Math.max(0,Math.min(1,(this.renderTime-a.time)/Math.max(1,b.time-a.time))),out={...latest.state}
  for(const type of ['players','monsters'])out[type]=latest.state[type].map(current=>{const next=b.state[type].find(p=>p.id===current.id),old=a.state[type].find(p=>p.id===current.id);if(!next||!old)return current;const p={...current};for(const key of ['x','y','z'])if(Number.isFinite(old[key])&&Number.isFinite(next[key]))p[key]=old[key]+(next[key]-old[key])*t;if(Number.isFinite(next.yaw)){const angle=Math.atan2(Math.sin(next.yaw-old.yaw),Math.cos(next.yaw-old.yaw));p.yaw=old.yaw+angle*t}return p})
  return out
 }
}
