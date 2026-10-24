import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DEFAULTS,migratePreferences,STEP} from '../shared/world.js'
import {createPlayer,createMatch,tick} from '../shared/engine.js'
test('updated monster default migrates old saved defaults without changing walking speed or custom settings',()=>{
 assert.equal(DEFAULTS.speed,4.6);assert.equal(DEFAULTS.monsterSpeed,24)
 assert.equal(migratePreferences({monsterSpeed:17,speed:4.6}).monsterSpeed,24)
 assert.equal(migratePreferences({monsterSpeed:21,speed:4.6}).monsterSpeed,21)
 assert.equal(migratePreferences({monsterSpeed:17,balanceVersion:2}).monsterSpeed,17)
})
test('alerted monsters use the faster authoritative water movement speed',()=>{
 const p=createPlayer('sound');Object.assign(p,{x:-30,z:-20,y:0,grounded:true,surface:'water'});const state=createMatch([p]);state.sounds=[{player:p.id,x:p.x,z:p.z,at:0}];const m=state.monsters[0],before={x:m.x,z:m.z};tick(state);assert(m.alert);assert(Math.abs(Math.hypot(m.x-before.x,m.z-before.z)-24*STEP)<.001)
})
