import * as THREE from './three.module.js';

export function updateClipping(camera, controls, clipPlane, state) {
    const dist = controls.getDistance();

    const visStart = 10; 
    const visEnd = 7.5;    
    let t = THREE.MathUtils.inverseLerp(visStart, visEnd, dist);
    t = THREE.MathUtils.clamp(t, 0, 1);

    const masterStart = 8; 
    const masterEnd = 5;
    let masterT = THREE.MathUtils.inverseLerp(masterStart, masterEnd, dist);
    masterT = THREE.MathUtils.clamp(masterT, 0, 1);

    //  Lung transparency Logic 
    let lungT = 0;
    if (state.viewInsideLungs) {
        const lungStart = 6;
        const lungEnd = 3;
        lungT = THREE.MathUtils.inverseLerp(lungStart, lungEnd, dist);
        lungT = THREE.MathUtils.clamp(lungT, 0, 1);
    }

    state.currentClipT = masterT;
    state.currentLungT = lungT;

    if (state.isDynamicClipping) {
        const viewDir = new THREE.Vector3().subVectors(controls.target, camera.position).normalize();
        clipPlane.normal.copy(viewDir);
    } else {
        clipPlane.normal.set(0, 0, -1);
    }

    // Internal View Check 
    const isInternalViewActive = state.manualVisibility.organs || 
                                 state.manualVisibility.blood || 
                                 state.manualVisibility.nerves;

    if (!isNaN(state.sliceDepth)) {
        if (!isInternalViewActive) {
            clipPlane.constant = 1000; // Skeleton stays solid
        } else {
            const multiplier = state.isDynamicClipping ? 1.4 : 0.7;
            clipPlane.constant = (1 - masterT) * (state.sliceDepth * multiplier); 
        }
    }
    
    //  Layer Assignments
    if (state.layers["muscle"]) {
        state.layers["muscle"].visible = (t < 0.5) && state.manualVisibility.muscle;
    }
    if (state.layers["organs"]) state.layers["organs"].visible = state.manualVisibility.organs;
    if (state.layers["blood"]) state.layers["blood"].visible = state.manualVisibility.blood;
    if (state.layers["nerves"]) state.layers["nerves"].visible = state.manualVisibility.nerves;
    if (state.layers["skeleton"]) state.layers["skeleton"].visible = !state.manualVisibility.nerves;
}