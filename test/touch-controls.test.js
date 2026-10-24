import {test} from 'node:test'
import assert from 'node:assert/strict'
import {installTouchControls} from '../src/touch-controls.js'
import {createPlayer,movePlayer} from '../shared/engine.js'
import {DEFAULTS} from '../shared/world.js'
class Surface extends EventTarget{constructor(){super();this.knob={style:{}};this.captured=[]}querySelector(){return this.knob}setPointerCapture(id){this.captured.push(id)}}
const fire=(target,type,id,x=0,y=0,extra={})=>{const e=new Event(type,{cancelable:true,bubbles:true});Object.assign(e,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,...extra});target.dispatchEvent(e);return e}
function setup(){const joystick=new Surface(),lookZone=new Surface(),jump=new Surface(),interact=new Surface(),state={move:{right:0,forward:0},look:[],actions:[]};installTouchControls({joystick,lookZone,buttons:[{element:jump,action:'jump'},{element:interact,action:'interact'}],onMove:v=>state.move=v,onLook:(x,y)=>state.look.push([x,y]),onAction:a=>state.actions.push(a)});return {joystick,lookZone,jump,interact,state}}
test('holding movement and pressing jump fires immediately without cancelling either pointer',()=>{
 const {joystick,jump,state}=setup();fire(joystick,'pointerdown',1,100,200);fire(joystick,'pointermove',1,100,158);assert.equal(state.move.forward,1)
 fire(jump,'pointerdown',2);assert.deepEqual(state.actions,['jump']);assert.equal(state.move.forward,1)
 const p=createPlayer('touch');movePlayer(p,{...state.move,jump:true},DEFAULTS);assert(p.vy>0);assert(p.z<28)
 fire(jump,'pointerup',2);const click=fire(jump,'click',2,0,0,{detail:1});assert(click.defaultPrevented);assert.equal(state.actions.length,1);assert.equal(state.move.forward,1)
 fire(joystick,'pointerup',1);assert.deepEqual(state.move,{right:0,forward:0})
})
test('look, interact and movement use independent pointer ids; cancelling one does not stop the others',()=>{
 const {joystick,lookZone,interact,state}=setup();fire(joystick,'pointerdown',1);fire(joystick,'pointermove',1,42,0);fire(lookZone,'pointerdown',3,100,100);fire(interact,'pointerdown',4);fire(lookZone,'pointercancel',4);fire(lookZone,'pointermove',3,120,110);assert.deepEqual(state.look,[[20,10]]);assert.equal(state.move.right,1);assert.deepEqual(state.actions,['interact']);fire(joystick,'lostpointercapture',1);assert.equal(state.move.right,0)
})
