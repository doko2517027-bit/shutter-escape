import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateGLB,safeTransform} from '../src/assets.js'
function glb(json){let data=Buffer.from(JSON.stringify(json));data=Buffer.concat([data,Buffer.alloc((4-data.length%4)%4,32)]);const out=Buffer.alloc(data.length+20);out.writeUInt32LE(0x46546c67);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(data.length,12);out.writeUInt32LE(0x4e4f534a,16);data.copy(out,20);return out.buffer.slice(out.byteOffset,out.byteOffset+out.byteLength)}
test('embedded GLB accepted and external network resources rejected',()=>{assert(validateGLB(glb({asset:{version:'2.0'},scenes:[{}]})));assert.throws(()=>validateGLB(glb({images:[{uri:'https://example.com/tracker.png'}]})),/外部/);assert.throws(()=>validateGLB(glb({extensionsRequired:['KHR_draco_mesh_compression']})),/圧縮/);assert.throws(()=>validateGLB(new ArrayBuffer(5)),/GLB/);assert.doesNotThrow(()=>validateGLB(glb({images:[{uri:'data:image/png;base64,abc'}]})))})
test('asset transforms reject nonfinite values and clamp ranges',()=>{assert.deepEqual(safeTransform({x:NaN,scale:999,ry:-999,y:3}),{x:0,y:3,z:0,scale:20,rx:0,ry:-100,rz:0})})
