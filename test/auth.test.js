import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPair} from 'jose/key/generate/keypair'
import {SignJWT} from 'jose/jwt/sign'
import {createTokenVerifier,isAdministrator} from '../server/auth.js'
import {createGameServer} from '../server/index.js'

const projectId='switch-auth-test',owner='owner@example.test'
test('admin requires a configured, verified matching email; client role claims do not grant access',()=>{
 assert.equal(isAdministrator({email:owner,email_verified:true},owner),true)
 assert.equal(isAdministrator({email:owner,email_verified:false,admin:true},owner),false)
 assert.equal(isAdministrator({email:'attacker@example.test',email_verified:true,admin:true},owner),false)
 assert.equal(isAdministrator({email:owner,email_verified:true},''),false)
})
test('signed identity checks issuer, audience, expiry, auth time and signature',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256'),verify=createTokenVerifier(projectId,publicKey)
 const sign=(claims={})=>new SignJWT({auth_time:Math.floor(Date.now()/1000),email:owner,email_verified:true,...claims}).setProtectedHeader({alg:'RS256'}).setSubject('owner').setIssuedAt().setIssuer('https://securetoken.google.com/'+projectId).setAudience(projectId).setExpirationTime('5m').sign(privateKey)
 assert.equal((await verify(await sign())).sub,'owner')
 await assert.rejects(()=>verify('eyJhbGciOiJub25lIn0.eyJhZG1pbiI6dHJ1ZX0.'))
 const wrongAudience=await new SignJWT({auth_time:1}).setProtectedHeader({alg:'RS256'}).setSubject('owner').setIssuedAt().setIssuer('https://securetoken.google.com/'+projectId).setAudience('another-project').setExpirationTime('5m').sign(privateKey)
 await assert.rejects(()=>verify(wrongAudience))
 async function badIssuer(){return new SignJWT({auth_time:1}).setProtectedHeader({alg:'RS256'}).setSubject('owner').setIssuedAt().setIssuer('https://securetoken.google.com/another-project').setAudience(projectId).setExpirationTime('5m').sign(privateKey)}
 await assert.rejects(()=>badIssuer().then(verify))
 const expired=await new SignJWT({auth_time:1}).setProtectedHeader({alg:'RS256'}).setSubject('owner').setIssuedAt().setIssuer('https://securetoken.google.com/'+projectId).setAudience(projectId).setExpirationTime(Math.floor(Date.now()/1000)-60).sign(privateKey)
 await assert.rejects(()=>verify(expired));await assert.rejects(()=>sign({auth_time:Date.now()/1000+100}).then(verify))
})
test('HTTP admin access rejects guests, unverified users, other users, revoked and disabled accounts',async()=>{
 const {privateKey,publicKey}=await generateKeyPair('RS256'),verify=createTokenVerifier(projectId,publicKey),accounts=new Map()
 const token=async(id,email,verified,extra={})=>{const signed=await new SignJWT({auth_time:Math.floor(Date.now()/1000),email,email_verified:verified,admin:true}).setProtectedHeader({alg:'RS256'}).setSubject(id).setIssuedAt().setIssuer('https://securetoken.google.com/'+projectId).setAudience(projectId).setExpirationTime('5m').sign(privateKey);accounts.set(signed,{localId:id,email,emailVerified:verified,...extra});return signed}
 const game=createGameServer({auth:{projectId,adminEmail:owner,verify,lookup:async value=>accounts.get(value)}})
 await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+game.server.address().port
 const get=(route,bearer)=>fetch(origin+route,{headers:bearer?{Authorization:'Bearer '+bearer}:{}})
 try{
  assert.equal((await get('/api/admin/access')).status,401)
  assert.equal((await get('/api/admin/access','forged-admin')).status,401)
  assert.equal((await get('/api/admin/access',await token('unverified',owner,false))).status,403)
  assert.equal((await get('/api/admin/access',await token('other','other@example.test',true))).status,403)
  assert.equal((await get('/api/admin/access',await token('revoked',owner,true,{validSince:Date.now()/1000+60}))).status,401)
  assert.equal((await get('/api/admin/access',await token('disabled',owner,true,{disabled:true}))).status,401)
  const good=await token('owner',owner,true),response=await get('/api/admin/access',good);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store')
  assert.equal((await(await get('/api/account',good)).json()).admin,true)
 }finally{await game.close()}
})
