import {test} from 'node:test'
import assert from 'node:assert/strict'
import {installZoomGuard} from '../src/gestures.js'
test('pinch gestures and touch double tap zoom are cancelled, but pointer controls and normal scrolling are preserved',()=>{
 const target=new EventTarget(),remove=installZoomGuard(target)
 const event=(type,properties={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,properties);target.dispatchEvent(e);return e}
 for(const type of ['gesturestart','gesturechange','gestureend'])assert(event(type).defaultPrevented)
 assert(event('wheel',{ctrlKey:true}).defaultPrevented);assert(!event('wheel',{ctrlKey:false}).defaultPrevented)
 assert(event('dblclick',{pointerType:'touch'}).defaultPrevented);assert(!event('dblclick',{pointerType:'mouse'}).defaultPrevented)
 assert(!event('pointerdown',{pointerId:1,pointerType:'touch'}).defaultPrevented)
 assert(!event('pointerdown',{pointerId:2,pointerType:'touch'}).defaultPrevented)
 remove();assert(!event('gesturestart').defaultPrevented)
})
test('gameplay blocks scrolling without swallowing movement or jump events, and menus regain scrolling',()=>{
 const target=new EventTarget();let playing=true,spaceReceived=0
 const remove=installZoomGuard(target,()=>playing)
 target.addEventListener('keydown',e=>{if(e.code==='Space')spaceReceived++})
 const event=(type,properties={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,properties);target.dispatchEvent(e);return e}
 assert(event('wheel',{ctrlKey:false}).defaultPrevented)
 assert(event('touchmove',{touches:[{identifier:1},{identifier:2}]}).defaultPrevented)
 for(const code of ['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'])assert(event('keydown',{code}).defaultPrevented)
 assert.equal(spaceReceived,1)
 for(const type of ['pointerdown','pointermove','pointerup'])assert(!event(type,{pointerId:2,pointerType:'touch'}).defaultPrevented)
 assert(!event('keydown',{code:'KeyW'}).defaultPrevented)
 playing=false
 assert(!event('touchmove').defaultPrevented);assert(!event('wheel',{ctrlKey:false}).defaultPrevented);assert(!event('keydown',{code:'Space'}).defaultPrevented)
 remove()
})
