import {createRemoteJWKSet} from 'jose/jwks/remote'
import {jwtVerify} from 'jose/jwt/verify'
import {readFileSync} from 'node:fs'

const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'))
export function createTokenVerifier(projectId,keys=googleKeys){return async token=>{
 const {payload}=await jwtVerify(token,keys,{algorithms:['RS256'],issuer:`https://securetoken.google.com/${projectId}`,audience:projectId,clockTolerance:5,maxTokenAge:'65m'})
 const now=Date.now()/1000
 if(typeof payload.sub!=='string'||!payload.sub.length||payload.sub.length>128||!Number.isFinite(payload.auth_time)||payload.auth_time>now+5||payload.iat>now+5)throw Error('INVALID_IDENTITY')
 return payload
}}
export function isAdministrator(identity,adminEmail){return !!adminEmail&&identity.email_verified===true&&typeof identity.email==='string'&&identity.email.trim().toLowerCase()===adminEmail.trim().toLowerCase()}
export function mountAccounts(app,options={}){
 let config={};try{config=JSON.parse(readFileSync(new URL('../public/firebase-config.json',import.meta.url)))}catch{}
 const projectId=options.projectId||config.projectId,apiKey=options.apiKey||config.apiKey,adminEmail=options.adminEmail??process.env.ADMIN_EMAIL
 const verify=options.verify||createTokenVerifier(projectId)
 const lookup=options.lookup||(async token=>{const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw Error('INVALID_IDENTITY');return (await response.json()).users?.[0]})
 const origins=new Set(['https://switch-and-shutter.onrender.com','https://shutter-escape-test.onrender.com','https://shutter-escape-lab.kooooooo3333.chatgpt.site','http://127.0.0.1:5181','http://localhost:5181'])
 app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store');const origin=req.headers.origin;if(origin&&origins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS')}if(req.method==='OPTIONS'){res.sendStatus(origin&&!origins.has(origin)?403:204);return}next()})
 const authenticate=async req=>{
  const header=req.headers.authorization||'';if(!header.startsWith('Bearer ')||header.length>8192)throw Error('UNAUTHENTICATED')
  const token=header.slice(7),claims=await verify(token),user=await lookup(token)
  if(!user||user.localId!==claims.sub||user.disabled||Number(user.validSince||0)>claims.auth_time)throw Error('UNAUTHENTICATED')
  // Use fresh account data as well as the signed token: a stale verified token is insufficient.
  const identity={...claims,email:user.email,email_verified:claims.email_verified===true&&user.emailVerified===true&&claims.email?.toLowerCase()===user.email?.toLowerCase()}
  return {signedIn:true,uid:identity.sub,email:identity.email||'',verified:identity.email_verified,admin:isAdministrator(identity,adminEmail)}
 }
 app.get('/api/account',async(req,res)=>{if(!req.headers.authorization){res.json({signedIn:false,admin:false});return}try{res.json(await authenticate(req))}catch{res.status(401).json({error:'UNAUTHENTICATED',admin:false})}})
 app.get('/api/admin/access',async(req,res)=>{try{const user=await authenticate(req);if(!user.admin){res.status(403).json({error:'FORBIDDEN'});return}res.json({allowed:true})}catch{res.status(401).json({error:'UNAUTHENTICATED'})}})
}
