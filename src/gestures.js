// Restrict browser page zoom, without cancelling the pointer events used by controls.
export function installZoomGuard(target,isPlaying=()=>false){
 const prevent=event=>{if(event.cancelable)event.preventDefault()}
 const wheel=event=>{if(event.ctrlKey||isPlaying())prevent(event)}
 const touchMove=event=>{if(isPlaying()&&!(event.touches?.length===1&&event.target?.matches?.('input[type=range]')))prevent(event)}
 const scrollKeys=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'])
 const keyDown=event=>{if(isPlaying()&&scrollKeys.has(event.code)&&!event.target?.matches?.('input,select,textarea,button'))prevent(event)}
 const doubleTap=event=>{if(event.pointerType==='touch'||event.sourceCapabilities?.firesTouchEvents)prevent(event)}
 const options={passive:false}
 for(const type of ['gesturestart','gesturechange','gestureend'])target.addEventListener(type,prevent,options)
 target.addEventListener('wheel',wheel,options);target.addEventListener('dblclick',doubleTap,options)
 target.addEventListener('touchmove',touchMove,options);target.addEventListener('keydown',keyDown)
 return ()=>{for(const type of ['gesturestart','gesturechange','gestureend'])target.removeEventListener(type,prevent);target.removeEventListener('wheel',wheel);target.removeEventListener('dblclick',doubleTap);target.removeEventListener('touchmove',touchMove);target.removeEventListener('keydown',keyDown)}
}
