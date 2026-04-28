import * as THREE from './three.module.js';

const pullDistance = 4.2;
const pullLerp = 0.13;
const pullScale = 1.4; 
const spinSpeed = 0.005; 

// SHARED VECTORS (Memory Optimization)
const cameraRight = new THREE.Vector3();
const inverseParentMatrix = new THREE.Matrix4();
const worldUp = new THREE.Vector3(0, 1, 0);
const localUp = new THREE.Vector3();
const spinQuat = new THREE.Quaternion();
const tempOffset = new THREE.Vector3();
const p1 = new THREE.Vector3();
const p2 = new THREE.Vector3();
const offsetFromOrigin = new THREE.Vector3();

const organGroups = {
    heart: { system: 'blood', meshes: ['Object_152'] },
    small_intestine: { system: 'organs', meshes: ['Object_54', 'Object_55', 'Object_56'] },
    large_intestine: { system: 'organs', meshes: ['Object_53', 'Object_57'] },
    stomach: { system: 'organs', meshes: ['Object_85'] },
    kidneys: { system: 'organs', meshes: ['Object_84'] },
    bronchii: { system: 'organs', meshes: ['Object_2'] },
    lungs: { system: 'organs', meshes: ['Object_62', 'Object_63', 'Object_64'] },
    liver: { system: 'organs', meshes: ['Object_70', 'Object_71', 'Object_72', 'Object_73', 'Object_74', 'Object_75', 'Object_76'] }
};

const meshToOrgan = new Map();
const organToSystem = new Map();

Object.entries(organGroups).forEach(([organ, data]) => {
    organToSystem.set(organ, data.system);
    data.meshes.forEach(name => meshToOrgan.set(name, organ));
});

// HELPERS 
function isObjectVisible(object) {
    let current = object;
    while (current) {
        if (!current.visible) return false;
        current = current.parent;
    }
    return true;
}

function getOrganMeshes(mesh, state) {
    const organ = meshToOrgan.get(mesh.name);
    if (!organ) return null;

    const system = organToSystem.get(organ);
    const layer = state.layers[system];
    
    if (!layer || !state.manualVisibility[system] || !layer.visible) return null;

    const meshes = [];
    layer.traverse(child => {
        if (child.isMesh && meshToOrgan.get(child.name) === organ && isObjectVisible(child)) {
            meshes.push(child);
        }
    });

    return meshes.length ? { organ, meshes } : null;
}

function getMaterialList(mesh) {
    if (!mesh.material) return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function setSelectedMaterial(meshes, isSelected) {
    meshes.forEach(mesh => {
        getMaterialList(mesh).forEach(material => {
            if (!material || !material.emissive) return;

            if (!material.userData._pulloutInit) {
                material.userData._pulloutInit = true;
                material.userData.baseEmissive = material.emissive.clone();
                material.userData.baseEmissiveIntensity = material.emissiveIntensity !== undefined ? material.emissiveIntensity : 1;
            }

            if (isSelected) {
                material.emissive.setHex(0x6f3f00);
                material.emissiveIntensity = 0.35;
            } else {
                material.emissive.copy(material.userData.baseEmissive);
                material.emissiveIntensity = material.userData.baseEmissiveIntensity;
            }
            material.needsUpdate = true;
        });
    });
}

// ENTRY STORAGE (VISUAL PIVOT MATH)
function getEntry(organ, meshes, state) {
    if (!state.organPullouts) {
        state.organPullouts = { active: null, entries: new Map() };
    }

    if (!state.organPullouts.entries.has(organ)) {
        
        // Calculate the raw unscaled geometry centers once
        const localCenters = meshes.map(mesh => {
            if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
            const center = new THREE.Vector3();
            mesh.geometry.boundingBox.getCenter(center);
            return center;
        });

        // Convert those into the true visual centers in the 3D world
        const baseVisualCenters = meshes.map((mesh, i) => {
            const c = localCenters[i].clone();
            c.multiply(mesh.scale).applyQuaternion(mesh.quaternion).add(mesh.position);
            return c;
        });

        state.organPullouts.entries.set(organ, {
            meshes,
            localCenters,
            baseVisualCenters,
            
            // animate the visual centers directly instead of the raw positions
            currentVisualCenters: baseVisualCenters.map(v => v.clone()),
            targetVisualCenters: baseVisualCenters.map(v => v.clone()),
            
            baseScales: meshes.map(m => m.scale.clone()),
            targetScales: meshes.map(m => m.scale.clone()),
            
            baseQuats: meshes.map(m => m.quaternion.clone()),
            targetQuats: meshes.map(m => m.quaternion.clone()),
            
            pivot: null,
            isOut: false
        });
    }
    return state.organPullouts.entries.get(organ);
}

function resetActive(state) {
    const active = state.organPullouts?.active;
    if (!active) return;

    active.isOut = false;
    active.targetVisualCenters = active.baseVisualCenters.map(v => v.clone());
    active.targetScales = active.baseScales.map(s => s.clone());
    active.targetQuats = active.baseQuats.map(q => q.clone());
    active.pivot = null;
    
    setSelectedMaterial(active.meshes, false);
    state.organPullouts.active = null;
}

// main functions
export function getPullableOrganFromIntersections(intersections, state) {
    for (const hit of intersections) {
        const object = hit.object;
        if (!object?.isMesh) continue;
        if (object.parent?.name === 'digestive_flow_visualization') continue;

        const organ = meshToOrgan.get(object.name);
        if (organ) {
            const system = organToSystem.get(organ);
            if (state.layers[system] && state.layers[system].visible && state.manualVisibility[system]) {
                return object;
            }
        }
    }
    return null;
}

export function toggleOrganPullout(mesh, camera, state) {
    if (!mesh || !camera || !state) return false;

    const data = getOrganMeshes(mesh, state);
    if (!data) return false;

    const { organ, meshes } = data;
    const entry = getEntry(organ, meshes, state);

    if (state.organPullouts.active && state.organPullouts.active !== entry) {
        resetActive(state);
    }

    if (entry.isOut) {
        resetActive(state);
        return true;
    }

    const parent = entry.meshes[0].parent;
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const worldOffset = cameraRight.multiplyScalar(pullDistance);
    
    inverseParentMatrix.copy(parent.matrixWorld).invert();
    p1.set(0, 0, 0).applyMatrix4(inverseParentMatrix);
    p2.copy(worldOffset).applyMatrix4(inverseParentMatrix);
    const localOffset = p2.sub(p1);

    entry.targetVisualCenters = entry.baseVisualCenters.map(v => v.clone().add(localOffset));
    entry.targetScales = entry.baseScales.map(s => s.clone().multiplyScalar(pullScale));
    entry.targetQuats = entry.baseQuats.map(q => q.clone()); 

    const pivot = new THREE.Vector3();
    entry.targetVisualCenters.forEach(v => pivot.add(v));
    pivot.divideScalar(entry.targetVisualCenters.length);
    entry.pivot = pivot;

    entry.isOut = true;
    state.organPullouts.active = entry;
    setSelectedMaterial(entry.meshes, true);

    return true;
}

export function updateOrganPullouts(state) {
    if (!state.organPullouts) return;

    state.organPullouts.entries.forEach(entry => {
        
        if (entry.isOut && entry.pivot) {
            // Find "Up" relative to the organ to spin it naturally
            const parent = entry.meshes[0].parent;
            inverseParentMatrix.copy(parent.matrixWorld).invert();
            localUp.copy(worldUp).transformDirection(inverseParentMatrix).normalize();
            spinQuat.setFromAxisAngle(localUp, spinSpeed);

            entry.meshes.forEach((mesh, i) => {
                tempOffset.copy(entry.targetVisualCenters[i]).sub(entry.pivot);
                tempOffset.applyQuaternion(spinQuat);
                entry.targetVisualCenters[i].copy(entry.pivot).add(tempOffset);
                entry.targetQuats[i].premultiply(spinQuat).normalize();
            });
        }

        entry.meshes.forEach((mesh, i) => {
            mesh.scale.lerp(entry.targetScales[i], pullLerp);
            mesh.quaternion.slerp(entry.targetQuats[i], pullLerp);
            entry.currentVisualCenters[i].lerp(entry.targetVisualCenters[i], pullLerp);

            offsetFromOrigin.copy(entry.localCenters[i])
                .multiply(mesh.scale)
                .applyQuaternion(mesh.quaternion);
                
            mesh.position.subVectors(entry.currentVisualCenters[i], offsetFromOrigin);
        });
    });
}

export function getVisiblePulloutMeshes(state) {
    const meshes = [];
    const systemsToCheck = new Set(organToSystem.values());

    systemsToCheck.forEach(system => {
        const layer = state.layers[system];
        if (!layer || !state.manualVisibility[system] || !layer.visible) return;

        layer.traverse(child => {
            if (child.isMesh && meshToOrgan.has(child.name) && isObjectVisible(child)) {
                meshes.push(child);
            }
        });
    });
    return meshes;
}