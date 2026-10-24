import express from 'express'
import {createServer} from 'node:http'
import {randomBytes,randomInt} from 'node:crypto'
import {WebSocketServer,WebSocket} from 'ws'
import {fileURLToPath} from 'node:url'
import {resolve} from 'node:path'
import {STEP,MAX_PLAYERS,settings} from '../shared/world.js'
import {createPlayer,createMatch,tick,snapshot,sanitizeInput} from '../shared/engine.js'
export function createGameServer(){
 const app=express(),server=createServer(app),rooms=new Map(),wss=new WebSocketServer({server,path:'/socket',maxPayload:16384})
 app.disable('x-powered-by');app.use((_req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next()})
 app.get('/api/health',(_req,res)=>res.json({ok:true,game:'shutter-escape',rooms:rooms.size,protocol:1}))
 app.use(express.static(resolve(fileURLToPath(new URL('../dist',import.meta.url)))))
 app.get('/{*path}',(_req,res)=>res.sendFile(resolve(fileURLToPath(new URL('../dist/index.html',import.meta.url)))))
 const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data))},broadcast=(r,data)=>{for(const m of r.members.values())send(m.ws,data)}
 const lobby=r=>({type:'lobby',code:r.code,host:r.host,settings:r.settings,members:[...r.members.values()].map(m=>({id:m.id,name:m.name,ready:m.ready,connected:!!m.ws})),running:!!r.match})
 const start=r=>{r.match=createMatch([...r.members.values()].map((m,i)=>createPlayer(m.id,m.name,i)),r.settings);for(const m of r.members.values()){m.queue=[];m.enqueued=0;m.ready=false}broadcast(r,{type:'start',state:snapshot(r.match)});r.updated=Date.now()}
 wss.on('connection',(ws,req)=>{
  const origin=req.headers.origin,allowed=(process.env.ALLOWED_ORIGINS||'').split(',').filter(Boolean)
  if(origin&&allowed.length&&!allowed.includes(origin)){ws.close(1008,'origin');return}
  let room=null,member=null,rate={time:Date.now(),count:0}
  ws.on('error',()=>{})
  ws.on('message',raw=>{try{
   if(Date.now()-rate.time>1000)rate={time:Date.now(),count:0};if(++rate.count>100){ws.close(1008,'rate');return}
   const d=JSON.parse(raw.toString());if(!d||typeof d.type!=='string')throw Error('INVALID_REQUEST')
   if(d.type==='ping'){send(ws,{type:'pong',sent:d.sent});return}
   if(['create','join','resume'].includes(d.type)){
    if(member)throw Error('ALREADY_JOINED')
    if(d.type==='create'){if(rooms.size>=100)throw Error('ROOM_LIMIT');let code;do{code=Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('')}while(rooms.has(code));room={code,host:null,members:new Map(),settings:settings(d.settings),match:null,updated:Date.now()};rooms.set(code,room)}
    else{room=rooms.get(String(d.code||'').toUpperCase());if(!room)throw Error('ROOM_NOT_FOUND')}
    if(d.type==='resume'){
     member=room.members.get(String(d.id));if(!member||member.token!==d.token||member.ws||Date.now()-(member.disconnected||0)>30000)throw Error('RESUME_FAILED');member.ws=ws;member.queue=[];member.enqueued=room.match?.players.find(p=>p.id===member.id)?.ack||0;const p=room.match?.players.find(p=>p.id===member.id);if(p)p.connected=true
    }else{
     if(room.match)throw Error('ALREADY_STARTED');if(room.members.size>=MAX_PLAYERS)throw Error('ROOM_FULL')
     const id=randomBytes(8).toString('hex');member={id,token:randomBytes(24).toString('hex'),name:String(d.name||'探索者').trim().slice(0,16)||'探索者',ws,ready:false,queue:[],enqueued:0};room.members.set(id,member);room.host||=id
    }
    send(ws,{type:'joined',code:room.code,id:member.id,token:member.token,host:room.host});broadcast(room,lobby(room));if(room.match)send(ws,{type:'start',state:snapshot(room.match)});return
   }
   if(!room||!member)throw Error('JOIN_REQUIRED');room.updated=Date.now()
   if(d.type==='ready'){if(room.match)throw Error('ALREADY_STARTED');member.ready=!!d.ready;broadcast(room,lobby(room))}
   else if(d.type==='settings'){if(member.id!==room.host||room.match)throw Error('HOST_ONLY');room.settings=settings(d.settings);broadcast(room,lobby(room))}
   else if(d.type==='start'){if(member.id!==room.host)throw Error('HOST_ONLY');if(room.match||[...room.members.values()].some(m=>!m.ready||!m.ws))throw Error('NOT_READY');start(room)}
   else if(d.type==='restart'){if(member.id!==room.host)throw Error('HOST_ONLY');if([...room.members.values()].some(m=>!m.ws))throw Error('NOT_CONNECTED');start(room)}
   else if(d.type==='input'){
    if(!room.match||room.match.finished)return;if(!Array.isArray(d.commands)||d.commands.length>8)throw Error('INVALID_INPUT')
    for(const raw of d.commands){const input=sanitizeInput(raw);if(!input)throw Error('INVALID_INPUT');if(input.seq<=member.enqueued)continue;if(input.seq!==member.enqueued+1||member.queue.length>=90)throw Error('INPUT_OVERFLOW');member.queue.push(input);member.enqueued=input.seq}
   }
   else if(d.type==='leave'){ws.close(1000,'leave')}
   else throw Error('INVALID_REQUEST')
  }catch(error){send(ws,{type:'error',code:error.message||'INVALID_REQUEST'})}})
  ws.on('close',()=>{if(!member||member.ws!==ws)return;member.ws=null;member.disconnected=Date.now();const p=room?.match?.players.find(p=>p.id===member.id);if(p)p.connected=false;if(room)broadcast(room,lobby(room))})
 })
 let previous=performance.now(),acc=0,broadcastCount=0
 const timer=setInterval(()=>{const now=performance.now();acc+=Math.min(.2,(now-previous)/1000);previous=now
  while(acc>=STEP){acc-=STEP;broadcastCount++
   for(const [code,r]of rooms){
    for(const [id,m]of r.members)if(!m.ws&&Date.now()-(m.disconnected||0)>30000){r.members.delete(id);const p=r.match?.players.find(p=>p.id===id);if(p&&p.status==='active')p.status='left';if(id===r.host)r.host=[...r.members.keys()][0]||null;broadcast(r,lobby(r))}
    if(!r.members.size||Date.now()-r.updated>45*60*1000){for(const m of r.members.values())m.ws?.close(1000,'expired');rooms.delete(code);continue}
    if(r.match){const inputs={};for(const m of r.members.values())inputs[m.id]=m.queue.shift()||{};tick(r.match,inputs);if(broadcastCount%2===0)broadcast(r,{type:'state',state:snapshot(r.match),serverTime:Date.now()})}
   }
  }
 },1000/60)
 server.on('close',()=>clearInterval(timer))
 return {app,server,wss,rooms,close:()=>new Promise(resolve=>{clearInterval(timer);for(const ws of wss.clients)ws.terminate();wss.close();server.close(resolve)})}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const game=createGameServer();game.server.listen(Number(process.env.PORT||3107),'0.0.0.0',()=>console.log('Shutter Escape server listening on '+(process.env.PORT||3107)));process.on('SIGTERM',async()=>{await game.close();process.exit(0)})}
