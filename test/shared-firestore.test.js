import {test} from 'node:test'
import assert from 'node:assert/strict'
import {initializeApp,deleteApp} from 'firebase/app'
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,terminate,serverTimestamp} from 'firebase/firestore'
import {createSharedAssets,packAsset} from '../src/shared-assets.js'
const enabled=process.env.FIRESTORE_EMULATOR_HOST==='127.0.0.1:8189'
test('real rules: administrator publishes, independent guests receive model/settings, private drafts and unauthorised writes are denied',{skip:!enabled,timeout:60000},async()=>{
 const projectId='demo-shutter-assets',base=`http://127.0.0.1:8189/v1/projects/${projectId}/databases/(default)/documents`,apps=[],dbs=[],services=[],errors=[]
 await fetch(`http://127.0.0.1:8189/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'})
 const seed=await fetch(base+'/internal/assetAdmin',{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{uid:{stringValue:'asset-owner'}}})});assert(seed.ok)
 const create=(name,claims)=>{const app=initializeApp({projectId,apiKey:'demo-key',appId:'demo-app'},name);apps.push(app);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8189,claims?{mockUserToken:claims}:{});dbs.push(db);return {app,db}}
 const owner=create('asset-owner',{sub:'asset-owner',email_verified:true}),guest=create('asset-guest'),stranger=create('asset-stranger',{sub:'other-user',email_verified:true}),unverified=create('asset-unverified',{sub:'asset-owner',email_verified:false})
 const service=async context=>{const result=await createSharedAssets({initialized:Promise.resolve(),auth:{app:context.app},requireAdmin:async()=>{}},()=>{},e=>errors.push(e));services.push(result);await result.initialized;return result}
 const wait=async fn=>{const deadline=Date.now()+12000;while(!fn()){if(Date.now()>deadline)throw errors[0]||Error('shared update timeout');await new Promise(r=>setTimeout(r,25))}}
 try{
  const writer=await service(owner),reader=await service(guest)
  const json=Buffer.from(JSON.stringify({asset:{version:'2.0'},scenes:[{}],extras:{padding:'x'.repeat(420000)}})),length=Math.ceil(json.length/4)*4,out=Buffer.alloc(20+length,32);out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(length,12);out.writeUInt32LE(0x4e4f534a,16);json.copy(out,20)
  const asset={role:'monster',name:'emulator-only.glb',kind:'glb',blob:new Blob([out]),transform:{scale:1.3}}
  const id=await writer.publish(asset,{useColor:true,color:'#123456'});await wait(()=>reader.assets.monster?.uploadId===id);assert.equal(reader.assets.monster.transform.scale,1.3);assert.equal(reader.records.monster.look.color,'#123456');assert.equal((await reader.assets.monster.blob.arrayBuffer()).byteLength,out.length)
  await writer.setLook('monster',{useColor:true,color:'#abcdef'});await wait(()=>reader.records.monster.look.color==='#abcdef');assert.equal(reader.assets.monster.uploadId,id)
  await writer.setSettings({title:'Switch & Shutter',environment:{exposure:1.6}});await wait(()=>reader.settings?.environment.exposure===1.6)
  const wav=new Uint8Array(46);wav.set(new TextEncoder().encode('RIFF'),0);wav.set(new TextEncoder().encode('WAVE'),8);const audio={role:'sound_door',kind:'audio',name:'test.wav',blob:new Blob([wav],{type:'audio/wav'}),transform:{}};const audioId=await writer.publish(audio);await wait(()=>reader.assets.sound_door?.uploadId===audioId);assert.equal(reader.assets.sound_door.kind,'audio');await writer.setSettings({audio:{sound_door:{volume:.4,rate:1.2}}});await wait(()=>reader.settings?.audio?.sound_door.volume===.4);await writer.setSettings({environment:{exposure:1.7}});await wait(()=>reader.settings.environment.exposure===1.7);assert.equal(reader.settings.audio.sound_door.volume,.4);const fresh=await service(create('asset-fresh-guest'));assert.equal(fresh.assets.monster.uploadId,id)
  const {meta}=await packAsset(asset);await setDoc(doc(owner.db,'assetUploads','unfinished'),{...meta,createdAt:serverTimestamp()});await assert.rejects(()=>getDoc(doc(guest.db,'assetUploads','unfinished')),e=>e.code==='permission-denied')
  for(const context of [guest,stranger,unverified]){await assert.rejects(()=>setDoc(doc(context.db,'sharedAssets','monster'),{role:'monster',uploadId:'',previous:'',transform:{},look:null,updatedAt:serverTimestamp()}),e=>e.code==='permission-denied');await assert.rejects(()=>setDoc(doc(context.db,'internal','assetAdmin'),{uid:'other-user'}),e=>e.code==='permission-denied')}
  await writer.reset('monster');await wait(()=>reader.records.monster.uploadId===''&&!reader.assets.monster);assert.equal(reader.records.monster.previous,id)
 }finally{for(const s of services)s.close();for(const db of dbs)await terminate(db);for(const app of apps)await deleteApp(app)}
})
