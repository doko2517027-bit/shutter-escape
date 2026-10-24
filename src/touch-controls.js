export function installTouchControls({joystick,lookZone,buttons,onMove,onLook,onAction}){
 let moveId=null,lookId=null,origin={},last={}
 const capture=(element,id)=>{try{element.setPointerCapture?.(id)}catch{}}
 const knob=joystick.querySelector('b')
 joystick.addEventListener('pointerdown',event=>{if(moveId!==null)return;event.preventDefault();moveId=event.pointerId;origin={x:event.clientX,y:event.clientY};capture(joystick,moveId)})
 joystick.addEventListener('pointermove',event=>{if(event.pointerId!==moveId)return;const right=Math.max(-1,Math.min(1,(event.clientX-origin.x)/42)),forward=Math.max(-1,Math.min(1,(origin.y-event.clientY)/42));onMove({right,forward});if(knob)knob.style.transform=`translate(${right*30}px,${-forward*30}px)`})
 const stopMove=event=>{if(event.pointerId!==moveId)return;moveId=null;onMove({right:0,forward:0});if(knob)knob.style.transform=''}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(type,stopMove)
 lookZone.addEventListener('pointerdown',event=>{if(lookId!==null)return;event.preventDefault();lookId=event.pointerId;last={x:event.clientX,y:event.clientY};capture(lookZone,lookId)})
 lookZone.addEventListener('pointermove',event=>{if(event.pointerId!==lookId)return;onLook(event.clientX-last.x,event.clientY-last.y);last={x:event.clientX,y:event.clientY}})
 const stopLook=event=>{if(event.pointerId===lookId)lookId=null}
 for(const type of ['pointerup','pointercancel','lostpointercapture'])lookZone.addEventListener(type,stopLook)
 for(const {element,action} of buttons){let lastTouch=-Infinity
  element.addEventListener('pointerdown',event=>{if(!['touch','pen'].includes(event.pointerType))return;event.preventDefault();event.stopPropagation();lastTouch=Date.now();capture(element,event.pointerId);onAction(action)})
  // A touch action already fired on press. Ignore its compatibility click on release.
  // Mouse and keyboard activation keep using the existing click handler.
  element.addEventListener('click',event=>{if(event.detail!==0&&(event.pointerType==='touch'||Date.now()-lastTouch<800)){event.preventDefault();event.stopPropagation()}})
 }
}
