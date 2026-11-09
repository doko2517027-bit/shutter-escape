export const PREFERENCE_LIMITS={sensitivity:[.0008,.006],sensitivity2:[.0008,.006],fov:[55,85],bgm:[0,1],se:[0,1]}
export function preferences(raw={}){raw=raw&&typeof raw==='object'?raw:{};const out={};for(const[k,[min,max]]of Object.entries(PREFERENCE_LIMITS))if(Number.isFinite(raw[k]))out[k]=Math.max(min,Math.min(max,raw[k]));if(['low','medium','high'].includes(raw.quality))out.quality=raw.quality;if(typeof raw.reduced==='boolean')out.reduced=raw.reduced;return out}
export function profile(raw={}){raw=raw&&typeof raw==='object'?raw:{};return {completedStage:Number.isInteger(raw.completedStage)?Math.max(0,Math.min(2,raw.completedStage)):0,preferences:preferences(raw.preferences)}}
export function retryStage(stage,registered){return stage===2&&registered?2:1}
export function mergeProfile(remote,local){return {completedStage:Math.max(profile(remote).completedStage,profile(local).completedStage),preferences:{...preferences(remote?.preferences),...preferences(local?.preferences)}}}
