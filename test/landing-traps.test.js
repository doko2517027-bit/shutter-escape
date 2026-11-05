import test from 'node:test'
import assert from 'node:assert/strict'
import {createMatch,createPlayer,tick} from '../shared/engine.js'
import {MATCH_TIME_LIMIT,TRAP_TIMING,createTrapStates,isGoalPlatform,layoutPlatforms,runtimePlatforms,trapAmount,trapWalls} from '../shared/world.js'

test('match lasts 2 minutes 30 seconds',()=>{
 assert.equal(MATCH_TIME_LIMIT,150)
})

test('each layout deterministically selects one moving floor and one falling wall',()=>{
 for(const seed of[1,42,999]){
  const platforms=layoutPlatforms(seed),traps=createTrapStates(seed,platforms)
  assert.deepEqual(traps.map(t=>t.kind),['shift','wall'])
  assert.equal(new Set(traps.map(t=>t.platformId)).size,2)
  for(const trap of traps){
   const floor=platforms.find(p=>p.id===trap.platformId)
   assert(floor)
   assert.equal(Boolean(floor.leverId||floor.optional||floor.deadEnd||isGoalPlatform(floor)),false)
  }
  assert.deepEqual(createTrapStates(seed,platforms),traps)
 }
})

test('traps trigger while a player is airborne over the selected landing floor',()=>{
 const state=createMatch([createPlayer('p')],{},42),platforms=layoutPlatforms(state.layoutSeed)
 state.monsters=[]
 for(const trap of state.traps){
  const floor=platforms.find(p=>p.id===trap.platformId),player=state.players[0]
  Object.assign(player,{x:floor.x,z:floor.z,y:floor.y+1.2,vx:0,vz:0,vy:-2.5,grounded:false,surface:'air',status:'active'})
  tick(state,{})
  assert.equal(trap.triggered,true)
  assert.equal(state.events.at(-1).type,'trap')
  assert.equal(state.events.at(-1).trap,trap.kind)
 }
})

test('moving floor changes only its visual/physical position and wall retracts again',()=>{
 const seed=42,platforms=layoutPlatforms(seed),traps=createTrapStates(seed,platforms),shift=traps.find(t=>t.kind==='shift'),wall=traps.find(t=>t.kind==='wall')
 shift.triggered=true;shift.startedAt=1;shift.dx=TRAP_TIMING.shift
 wall.triggered=true;wall.startedAt=1;wall.axis='x'
 const peak=1+TRAP_TIMING.deploy+.01,base=platforms.find(p=>p.id===shift.platformId),moved=runtimePlatforms(platforms,traps,peak).find(p=>p.id===shift.platformId)
 assert(moved.x>base.x+TRAP_TIMING.shift*.9)
 assert.equal(trapWalls(platforms,traps,peak).length,1)
 const finished=1+TRAP_TIMING.deploy+TRAP_TIMING.hold+TRAP_TIMING.retract+.01
 assert.equal(trapAmount(shift,finished),0)
 assert.equal(trapWalls(platforms,traps,finished).length,0)
 assert.equal(runtimePlatforms(platforms,traps,finished).find(p=>p.id===shift.platformId).x,base.x)
})
