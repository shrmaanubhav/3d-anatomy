import * as THREE from './three.module.js';

const pullDistance = 4.2;
const pullLerp = 0.13;
const pullableMeshesBySystem = {
    organs: new Set([
        'Object_2',
        'Object_52',
        'Object_54',
        'Object_57',
        'Object_62',
        'Object_63',
        'Object_64',
        'Object_70',
        'Object_71'
    ]),
    blood: new Set([
        'Object_152'
    ]),
    nerves: new Set([
        'Object_43',
        'Object_52'
    ])
};

const meshCenter = new THREE.Vector3();
const worldCenter = new THREE.Vector3();
const targetWorldCenter = new THREE.Vector3();
const targetParentCenter = new THREE.Vector3();
const cameraRight = new THREE.Vector3();

function isDescendantOf(object, root) {
    let current = object;

    while (current) {
        if (current === root) return true;
        current = current.parent;
    }

    return false;
}

function isObjectVisible(object) {
    let current = object;

    while (current) {
        if (!current.visible) return false;
        current = current.parent;
    }

    return true;
}

function getPullableSystemForObject(object, state) {
    for (const [system, names] of Object.entries(pullableMeshesBySystem)) {
        const layer = state.layers[system];

        if (!layer) continue;
        if (!names.has(object.name)) continue;
        if (!state.manualVisibility[system] || !layer.visible) continue;
        if (!isDescendantOf(object, layer)) continue;

        return system;
    }

    return null;
}

export function getVisiblePulloutMeshes(state) {
    const meshes = [];

    Object.entries(pullableMeshesBySystem).forEach(([system, names]) => {
        const layer = state.layers[system];

        if (!layer) return;
        if (!state.manualVisibility[system] || !layer.visible) return;

        layer.traverse(child => {
            if (child.isMesh && names.has(child.name) && isObjectVisible(child)) {
                meshes.push(child);
            }
        });
    });

    return meshes;
}

function getMaterialList(mesh) {
    if (!mesh.material) return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function setSelectedMaterial(mesh, isSelected) {
    getMaterialList(mesh).forEach(material => {
        if (!material.emissive) return;

        if (!material.userData.pulloutBaseEmissive) {
            material.userData.pulloutBaseEmissive = material.emissive.clone();
            material.userData.pulloutBaseEmissiveIntensity = material.emissiveIntensity || 0;
        }

        if (isSelected) {
            material.emissive.setHex(0x6f3f00);
            material.emissiveIntensity = 0.35;
        } else {
            material.emissive.copy(material.userData.pulloutBaseEmissive);
            material.emissiveIntensity = material.userData.pulloutBaseEmissiveIntensity;
        }

        material.needsUpdate = true;
    });
}

function getEntry(mesh, state) {
    if (!state.organPullouts) {
        state.organPullouts = {
            active: null,
            entries: new Map()
        };
    }

    if (!state.organPullouts.entries.has(mesh)) {
        state.organPullouts.entries.set(mesh, {
            mesh,
            basePosition: mesh.position.clone(),
            targetPosition: mesh.position.clone(),
            isOut: false
        });
    }

    return state.organPullouts.entries.get(mesh);
}

function getTargetPosition(mesh, camera) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(meshCenter);

    mesh.localToWorld(worldCenter.copy(meshCenter));
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    targetWorldCenter.copy(worldCenter).addScaledVector(cameraRight, pullDistance);

    mesh.parent.worldToLocal(targetParentCenter.copy(targetWorldCenter));
    return targetParentCenter.sub(meshCenter);
}

function resetActiveOrgan(state) {
    const active = state.organPullouts?.active;
    if (!active) return;

    active.isOut = false;
    active.targetPosition.copy(active.basePosition);
    setSelectedMaterial(active.mesh, false);
    state.organPullouts.active = null;
}

export function getPullableOrganFromIntersections(intersections, state) {
    for (const hit of intersections) {
        const object = hit.object;

        if (!object?.isMesh) continue;
        if (object.parent?.name === 'digestive_flow_visualization') continue;
        if (!getPullableSystemForObject(object, state)) continue;

        return object;
    }

    return null;
}

export function toggleOrganPullout(mesh, camera, state) {
    if (!mesh || !camera || !state) return false;
    if (!getPullableSystemForObject(mesh, state)) return false;

    const entry = getEntry(mesh, state);
    const active = state.organPullouts.active;

    if (active && active !== entry) {
        resetActiveOrgan(state);
    }

    if (entry.isOut) {
        entry.isOut = false;
        entry.targetPosition.copy(entry.basePosition);
        setSelectedMaterial(entry.mesh, false);
        state.organPullouts.active = null;
        return true;
    }

    entry.isOut = true;
    entry.targetPosition.copy(getTargetPosition(mesh, camera));
    state.organPullouts.active = entry;
    setSelectedMaterial(entry.mesh, true);

    return true;
}

export function updateOrganPullouts(state) {
    if (!state.organPullouts) return;

    state.organPullouts.entries.forEach(entry => {
        entry.mesh.position.lerp(entry.targetPosition, pullLerp);
    });
}
