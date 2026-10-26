import {test} from 'node:test'
import assert from 'node:assert/strict'
import {WebSocket} from 'ws'
import {layoutPlatforms} from '../shared/world.js'
import {createGameServer} from '../server/index.js'
const wait=(ws,type,predicate=()=>true)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{ws.off('message',handler);reject(Error('Timeout '+type))},5000);const handler=raw=>{const data=JSON.parse(raw);if(data.type===type&&predicate(data)){clearTimeout(timer);ws.off('message',handler);resolve(data)}};ws.on('message',handler)})
const send=(ws,type,data={})=>ws.send(JSON.stringify({type,...data}))
test('real sockets: room, ready, shared start, monster count, invalid input, reconnect',async()=>{const game=createGameServer();await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url='ws://127.0.0.1:'+game.server.address().port+'/socket';const connect=()=>new Promise(r=>{const ws=new WebSocket(url);ws.on('open',()=>r(ws))});const a=await connect(),b=await connect();try{
 const joinedA=wait(a,'joined');send(a,'create',{name:'Host'});const session=await joinedA
 const joinedB=wait(b,'joined');send(b,'join',{code:session.code,name:'Friend'});const friend=await joinedB
 let error=wait(b,'error');send(b,'start');assert.equal((await error).code,'HOST_ONLY')
 const readyA=wait(a,'lobby',d=>d.members.find(m=>m.id===session.id)?.ready);send(a,'ready',{ready:true});await readyA
 const readyB=wait(a,'lobby',d=>d.members.every(m=>m.ready));send(b,'ready',{ready:true});await readyB
 const startA=wait(a,'start'),startB=wait(b,'start');send(a,'start');const [sa,sb]=await Promise.all([startA,startB]);assert.equal(sa.state.monsters.length,2);assert.deepEqual(sa.state.levers,sb.state.levers);assert.equal(sa.state.layoutSeed,sb.state.layoutSeed);assert.deepEqual(layoutPlatforms(sa.state.layoutSeed),layoutPlatforms(sb.state.layoutSeed))
 let updated=wait(a,'state',d=>d.state.players.find(p=>p.id===session.id)?.ack===1);send(a,'input',{commands:[{seq:1,right:1,forward:0,yaw:0,pitch:0}]});await updated
 error=wait(a,'error');send(a,'input',{commands:[{seq:2,right:0,forward:0,yaw:'bad',pitch:0}]});assert.equal((await error).code,'INVALID_INPUT')
 const closed=new Promise(r=>b.on('close',r));b.close();await closed;const c=await connect();const resumed=wait(c,'joined'),resumedStart=wait(c,'start');send(c,'resume',{code:session.code,id:friend.id,token:friend.token});assert.equal((await resumed).id,friend.id);assert.equal((await resumedStart).state.layoutSeed,sa.state.layoutSeed);const newStartA=wait(a,'start'),newStartC=wait(c,'start');send(a,'restart');const [ra,rc]=await Promise.all([newStartA,newStartC]);assert.notEqual(ra.state.layoutSeed,sa.state.layoutSeed);assert.equal(ra.state.layoutSeed,rc.state.layoutSeed);c.close()
}finally{a.close();b.close();await game.close()}})
