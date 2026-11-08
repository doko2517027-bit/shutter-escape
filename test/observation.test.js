import test from 'node:test'
import assert from 'node:assert/strict'
import {observesMonster,observationState} from '../shared/observation.js'
const p={id:'p',status:'active',x:0,y:0,z:0,yaw:0,pitch:0},m={x:0,y:0,z:-6}
test('stage 2 freezes only visible monsters, with wall occlusion',()=>{
 assert.equal(observesMonster(p,m,[]),true)
 assert.equal(observesMonster({...p,yaw:Math.PI},m,[]),false)
 assert.equal(observesMonster(p,m,[{x:0,z:-3,w:4,d:.4}]),false)
 assert.equal(observesMonster({...p,status:'dead'},m,[]),false)
})
test('any active co-op observer freezes the monster and it faces a player',()=>{
 const result=observationState([{...p,yaw:Math.PI},{...p,id:'friend'}],m,[])
 assert.equal(result.frozen,true)
 assert.equal(result.target,'p')
 assert.equal(result.lookYaw,0)
})
