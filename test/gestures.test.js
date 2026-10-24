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
