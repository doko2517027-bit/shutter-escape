import {test} from 'node:test'
import assert from 'node:assert/strict'
import {PLATFORMS,layoutPlatforms,DEFAULTS,START,inside,jumpConnection,platformGap} from '../shared/world.js'
import {createPlayer,movePlayer,createMatch,tick} from '../shared/engine.js'
import {walkStage} from './walk-helper.js'
test('expanded irregular floor keeps both challenging and wider optional gaps',()=>{const layout=layoutPlatforms(7),gaps=[];for(const a of layout)for(const b of layout)if(jumpConnection(a,b))gaps.push(platformGap(a,b));assert(gaps.some(g=>g>2.5));assert(layout.some(a=>layout.some(b=>platformGap(a,b)>8)))})
test('water landing beside a raised brick still lets a player move away',()=>{const edge=PLATFORMS.find(p=>p.id!=='p0'&&p.id!=='exit'),p=createPlayer('side');Object.assign(p,{x:edge.x,z:edge.z+edge.d/2-.11,y:0,grounded:true,surface:'water'});const before=p.x;for(let i=0;i<45;i++)movePlayer(p,{right:-1,yaw:0},DEFAULTS);assert(p.x<before-1)})
test('walk/jump controls can reach all five switches and exit',()=>{const result=walkStage(23);assert(result.ticks>100)})
