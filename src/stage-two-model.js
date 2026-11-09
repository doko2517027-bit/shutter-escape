import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {AnimationMixer} from 'three'

export async function loadStageTwoMonster(){
 const gltf=await new GLTFLoader().loadAsync('/models/stage-two-ghost-runner.glb')
 return {model:gltf.scene,animations:gltf.animations,transform:{x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1}}
}

export function animateMonster(content,clips){
 const run=clips?.find(c=>/run/i.test(c.name))
 if(!run)return
 const mixer=new AnimationMixer(content)
 mixer.clipAction(run).play()
 content.userData.monsterMixer=mixer
}

export function updateMonsterAnimation(body,dt,frozen){
 body.traverse(o=>{if(o.userData.monsterMixer)o.userData.monsterMixer.update(frozen?0:Math.min(dt,.05))})
}
