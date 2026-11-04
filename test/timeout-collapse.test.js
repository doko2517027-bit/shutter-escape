import test from 'node:test'
import assert from 'node:assert/strict'
import {createMatch,createPlayer,tick} from '../shared/engine.js'
import {STEP,MATCH_TIME_LIMIT,EXIT_APPROACH,EXIT_STAIRS,EXIT,layoutPlatforms,activePlatforms,isGoalPlatform} from '../shared/world.js'

test('time limit triggers once and removes every non-goal platform',()=>{
 const s=createMatch([createPlayer('p')],{},91);s.monsters=[];s.time=MATCH_TIME_LIMIT-STEP/2
 tick(s)
 assert.equal(s.timedOut,true)
 assert.equal(s.events.filter(e=>e.type==='timeout').length,1)
 const retained=activePlatforms(layoutPlatforms(s.layoutSeed),s.timedOut)
 assert(retained.length>2)
 assert(retained.every(isGoalPlatform))
 assert(retained.some(p=>p.id===EXIT_APPROACH.id))
 assert(retained.some(p=>p.id===EXIT.id))
 assert.equal(retained.filter(p=>p.stair).length,EXIT_STAIRS.length)
 tick(s)
 assert.equal(s.events.filter(e=>e.type==='timeout').length,1)
})

test('ordinary floors sink while the goal floor and stairs still support players',()=>{
 const ordinary=createMatch([createPlayer('ordinary')],{},17);ordinary.monsters=[];ordinary.time=MATCH_TIME_LIMIT-STEP/2
 for(let i=0;i<80;i++)tick(ordinary)
 assert.equal(ordinary.players[0].surface,'water')
 assert.equal(ordinary.players[0].y,0)

 const goal=createMatch([createPlayer('goal')],{},17);goal.monsters=[]
 Object.assign(goal.players[0],{x:EXIT_APPROACH.x,z:EXIT_APPROACH.z,y:EXIT_APPROACH.y,grounded:true,surface:'brick'})
 goal.time=MATCH_TIME_LIMIT-STEP/2
 for(let i=0;i<80;i++)tick(goal)
 assert.equal(goal.players[0].surface,'brick')
 assert.equal(goal.players[0].y,EXIT_APPROACH.y)
})
