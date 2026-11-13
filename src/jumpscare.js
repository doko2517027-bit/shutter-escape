import {Box3, Color, HemisphereLight, PerspectiveCamera, PointLight, Scene, Vector3} from 'three'

export function createJumpscare(view, stage, reduced, now) {
 const model = view.transformed('monster', 2.25)
 const monster = model || (stage === 2 ? view.watcherModel() : view.defaultMonster())
 const scene = new Scene()
 scene.background = new Color('#080103')
 scene.add(monster, new HemisphereLight('#fff0df', '#410006', 1.25))
 monster.updateMatrixWorld(true)

 const bounds = new Box3().setFromObject(monster)
 const head = monster.getObjectByName('Head')
 const face = head ? new Box3().setFromObject(head) : null
 const center = (face && !face.isEmpty() ? face : bounds).getCenter(new Vector3())
 if (!face || face.isEmpty()) center.y = bounds.max.y - (bounds.max.y - bounds.min.y) * .16
 const direction = !model && stage === 1 ? -1 : 1
 const front = direction > 0 ? bounds.max.z : bounds.min.z
 const light = new PointLight('#ff3527', 19, 6)
 light.position.set(center.x - .45, center.y + .22, front + direction * 1.1)
 scene.add(light)
 const camera = new PerspectiveCamera(48, 1, .025, 20)
 const duration = reduced ? 650 : 1040
 const ownedMaterials = new Set()
 const ownedGeometries = new Set()
 monster.traverse(object => {
  if (!model || object.geometry?.type === 'PlaneGeometry' && !view.models[view.stageRole('monster')]?.model) {
   if (object.geometry) ownedGeometries.add(object.geometry)
   if (object.material) for (const material of [].concat(object.material)) ownedMaterials.add(material)
  }
 })

 return {
  end: now + duration,
  render(time) {
   const elapsed = Math.max(0, time - now)
   const approach = reduced ? 1 : 1 - Math.pow(1 - Math.min(1, elapsed / 220), 3)
   const distance = (1.65 - approach * 1.04) * Math.max(1, .8 / view.camera.aspect)
   const shake = reduced ? 0 : Math.sin(elapsed * .075) * .045 * (1 - elapsed / duration)
   camera.aspect = view.camera.aspect
   camera.updateProjectionMatrix()
   camera.position.set(center.x + shake, center.y + .035 + shake, front + direction * distance)
   camera.lookAt(center)
   view.renderer.render(scene, camera)
  },
  dispose() {
   for (const geometry of ownedGeometries) geometry.dispose()
   for (const material of ownedMaterials) material.dispose()
  }
 }
}
