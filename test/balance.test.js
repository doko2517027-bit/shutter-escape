import {test} from 'node:test'
import assert from 'node:assert/strict'
import {DEFAULTS,migratePreferences,STEP} from '../shared/world.js'
import {createPlayer,createMatch,tick,movePlayer} from '../shared/engine.js'
test('updated monster default migrates old saved defaults without changing walking speed or custom settings',()=>{
 assert.equal(DEFAULTS.speed,4.6);assert(DEFAULTS.monsterSpeed>17)
 assert.equal(migratePreferences({monsterSpeed:17,speed:4.6}).monsterSpeed,DEFAULTS.monsterSpeed)
 assert.equal(migratePreferences({monsterSpeed:21,speed:4.6}).monsterSpeed,21)
 assert.equal(migratePreferences({monsterSpeed:17,balanceVersion:2}).monsterSpeed,17)
})
test('alerted monsters use the faster authoritative water movement speed',()=>{
 const p=createPlayer('sound');Object.assign(p,{x:-30,z:-20,y:0,grounded:true,surface:'water'});const state=createMatch([p]);state.sounds=[{player:p.id,x:p.x,z:p.z,at:0}];const m=state.monsters[0],before={x:m.x,z:m.z};tick(state);assert(m.alert);assert(Math.abs(Math.hypot(m.x-before.x,m.z-before.z)-DEFAULTS.monsterSpeed*STEP)<.001)
})
test('faster jump completes sooner at a similar height while ground walking is unchanged',()=>{
 const flight=tempo=>{const p=createPlayer('jump');let peak=p.y,ticks=0;for(let i=0;i<90;i++){movePlayer(p,{jump:i===0},{...DEFAULTS,jumpTempo:tempo},true);peak=Math.max(peak,p.y);ticks++;if(i>0&&p.grounded)break}return {peak,ticks}}
 const before=flight(1),after=flight(DEFAULTS.jumpTempo);assert(after.ticks<before.ticks*.9);assert(Math.abs(before.peak-after.peak)<.06)
 const a=createPlayer('a'),b=createPlayer('b');for(let i=0;i<10;i++){movePlayer(a,{forward:1},{...DEFAULTS,jumpTempo:1},true);movePlayer(b,{forward:1},DEFAULTS,true)}assert.equal(a.z,b.z);assert.equal(a.vz,b.vz)
})
