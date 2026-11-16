import * as THREE from 'three';
export const mat = (color, roughness=.58, metalness=.04) => new THREE.MeshStandardMaterial({color, roughness, metalness});
// Four-step cel-shading ramp for the Japanese anime / game-art character finish.
const toonRampData = new Uint8Array([35,35,35,255, 92,92,92,255, 166,166,166,255, 255,255,255,255]);
export const toonRamp = new THREE.DataTexture(toonRampData,4,1,THREE.RGBAFormat);
toonRamp.magFilter = THREE.NearestFilter; toonRamp.minFilter = THREE.NearestFilter; toonRamp.generateMipmaps = false; toonRamp.needsUpdate = true;
export const toonMat = (color) => new THREE.MeshToonMaterial({color, gradientMap:toonRamp});
export const floorMat = mat(0x27345b,.9);
export const gold = mat(0xffc15c,.4,.2), dark = mat(0x202944), skin = mat(0xffd0b2), white = mat(0xf4f3ff), black = mat(0x202033);
