// Restrict browser page zoom, without cancelling the pointer events used by controls.
export function installZoomGuard(target){
 const prevent=event=>{if(event.cancelable)event.preventDefault()}
 const wheel=event=>{if(event.ctrlKey)prevent(event)}
 const doubleTap=event=>{if(event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents)prevent(event)}
 const options={passive:false}
 for(const type of ['gesturestart','gesturechange','gestureend'])target.addEventListener(type,prevent,options)
 target.addEventListener('wheel',wheel,options);target.addEventListener('dblclick',doubleTap,options)
 return ()=>{for(const type of ['gesturestart','gesturechange','gestureend'])target.removeEventListener(type,prevent);target.removeEventListener('wheel',wheel);target.removeEventListener('dblclick',doubleTap)}
}
