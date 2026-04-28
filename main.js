import * as THREE from './js/three.module.js';
import { initScene } from './js/sceneSetup.js';
import { loadAllModels } from './js/modelLoader.js';
import { updateClipping } from './js/clipping.js';
import { setupEvents } from './js/events.js';
import { toggleOrganPullout, updateOrganPullouts } from './js/organPullout.js';

const state = {
    layers: {},
    manualVisibility: { muscle: true, organs: true, blood: true, nerves: true, skeleton: true },
    isDynamicClipping: true,
    isDigestiveFlowActive: true,
    digestiveFlowSpeed: 1,
    viewInsideLungs: false, 
    targetDistance: 20,
    sliceDepth: 10,
    currentClipT: 0,
    currentLungT: 0,
    isFlying: false
};

const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
const mainGroup = new THREE.Group();
const labelWorldPos = new THREE.Vector3(); 
const clock = new THREE.Clock();

// init
const { scene, camera, renderer, controls } = initScene();
scene.add(mainGroup);

// load models
loadAllModels(mainGroup, state, clipPlane, controls, (calculatedDepth) => {
    state.sliceDepth = calculatedDepth;

    const box = new THREE.Box3().setFromObject(mainGroup);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.4; 

    camera.position.z = cameraZ;
    state.targetDistance = cameraZ; 

    controls.target.set(0, 0, 0); 
    controls.update();
});

// setup events
setupEvents(camera, renderer, controls, state, mainGroup);

// animations & render loop
function animate() {
    requestAnimationFrame(animate); 
    const elapsedTime = clock.getElapsedTime();

    // smooth camera zooming
    if (!state.isFlying) {
        const currentDist = controls.getDistance();
        const newDist = THREE.MathUtils.lerp(currentDist, state.targetDistance, 0.1);
        const dir = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        camera.position.copy(controls.target.clone().add(dir.multiplyScalar(newDist)));
    }
    controls.update();
    updateClipping(camera, controls, clipPlane, state);
    updateOrganPullouts(state);

    // label visibility & occlusion logic
    if (state.labels) {
        let activeSystems = [];

        // Hierarchy Logic: Muscle -> Internals -> Skeleton
        if (state.manualVisibility.muscle && state.layers['muscle']?.visible) {
            activeSystems.push('muscle');
        } else if (state.manualVisibility.organs || state.manualVisibility.blood || state.manualVisibility.nerves) {
            if (state.manualVisibility.organs) activeSystems.push('organs');
            if (state.manualVisibility.blood) activeSystems.push('blood');
            if (state.manualVisibility.nerves) activeSystems.push('nerves');
        } else if (state.manualVisibility.skeleton && state.layers['skeleton']?.visible) {
            activeSystems.push('skeleton');
        }

        const isCameraAtFront = camera.position.z > 0;

        state.labels.forEach(label => {
            const data = label.element.userData;
            const isSystemActive = activeSystems.includes(label.system);
            
            // If the whole system is off, kill the label immediately
            if (!isSystemActive) {
                label.element.visible = false;
                label.element.element.style.display = 'none';
                return;
            }

            label.element.visible = true;
            label.element.element.style.display = 'flex';
            label.element.element.style.visibility = 'visible';

            // depth & occlusion logic
            label.element.getWorldPosition(labelWorldPos);
            
            // Check if label is on the "wrong" side of the body
            const isOppositeSide = (isCameraAtFront && data.side === 'back') || 
                                   (!isCameraAtFront && data.side === 'front');

            // Check if label is being sliced by the clipping plane
            const isClipped = clipPlane.distanceToPoint(labelWorldPos) < 0;
            const ignoresClip = ['organs', 'blood', 'muscle'].includes(label.system);
            const shouldOcclude = isOppositeSide || (isClipped && state.isDynamicClipping && !ignoresClip);

            if (shouldOcclude) {
                label.element.element.classList.add('occluded');
            } else {
                label.element.element.classList.remove('occluded');
            }
        });
    }

    // lungspecific transparency logic
    if (state.layers["organs"]) {
        state.layers["organs"].traverse(child => {
            if (child.isMesh) {
                const objNumber = parseInt(child.name.replace("Object_", ""));
                
                if (objNumber >= 62 && objNumber <= 64) {
                    child.material.transparent = true;
                    
                    if (state.viewInsideLungs) {
                        child.material.opacity = 1 - state.currentLungT;
                        child.visible = child.material.opacity > 0.05;
                    } else {
                        child.material.opacity = 1.0;
                        child.visible = true;
                    }
                }
            }
        });
    }

    renderer.render(scene, camera);

    if (window.labelRenderer) {
        window.labelRenderer.render(scene, camera);
    }
}
animate();

// ui functions
window.showInfoPanel = (title, desc, system) => {
    const panel = document.getElementById('info-panel');
    document.getElementById('info-title').innerText = title;
    document.getElementById('info-system').innerText = system + " System";
    document.getElementById('info-desc').innerText = desc;
    panel.style.display = 'block';
};

window.toggleOrganPulloutFromLabel = (mesh, system) => {
    if (!['organs', 'blood', 'nerves'].includes(system)) return false;
    return toggleOrganPullout(mesh, camera, state);
};



// 1. Handle Anatomy Layers (Muscle, Organs, etc.)
window.toggleLayer = (system) => {
    if (state.layers[system]) {
        state.layers[system].visible = !state.layers[system].visible;
        state.manualVisibility[system] = state.layers[system].visible;
    }
};

// 2. Handle Visualization Tools (Clipping & Lung X-Ray)
document.addEventListener('DOMContentLoaded', () => {
    const clipToggle = document.getElementById('clip-toggle');
    const lungToggle = document.getElementById('lung-toggle');
    const digestiveFlowToggle = document.getElementById('digestive-flow-toggle');

    if (clipToggle) {
        clipToggle.addEventListener('change', (e) => {
            state.isDynamicClipping = e.target.checked;
        });
    }

    if (lungToggle) {
        lungToggle.addEventListener('change', (e) => {
            state.viewInsideLungs = e.target.checked;
        });
    }

    if (digestiveFlowToggle) {
        digestiveFlowToggle.addEventListener('change', (e) => {
            state.isDigestiveFlowActive = e.target.checked;
        });
    }
});

window.flyTo = function(newPosArr, newTargetArr) {
    state.isFlying = true; 
    controls.enabled = false; 

    const duration = 1500; 
    const startTime = performance.now();
    
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(...newTargetArr);
    const currentRadius = startPos.distanceTo(startTarget);
    const relStart = new THREE.Vector3().subVectors(startPos, startTarget);
    const startSpherical = new THREE.Spherical().setFromVector3(relStart);

    const endPosDir = new THREE.Vector3(...newPosArr);
    const endSpherical = new THREE.Spherical().setFromVector3(endPosDir);

    let thetaDiff = endSpherical.theta - startSpherical.theta;
    if (thetaDiff > Math.PI) thetaDiff -= Math.PI * 2;
    if (thetaDiff < -Math.PI) thetaDiff += Math.PI * 2;
    const targetTheta = startSpherical.theta + thetaDiff;

    function animateFly(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const ease = progress < 0.5 
            ? 2 * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // --- THE HORIZONTAL SWEEP ---
        const currentSpherical = new THREE.Spherical(
            currentRadius,
            THREE.MathUtils.lerp(startSpherical.phi, endSpherical.phi, ease),
            THREE.MathUtils.lerp(startSpherical.theta, targetTheta, ease)
        );

        // Update Target (if moving focus)
        controls.target.lerpVectors(startTarget, endTarget, ease);
        const offset = new THREE.Vector3().setFromSpherical(currentSpherical);
        camera.position.copy(controls.target).add(offset);
        
        camera.lookAt(controls.target);
        controls.update();

        if (progress < 1) {
            requestAnimationFrame(animateFly);
        } else {
            state.targetDistance = currentRadius;
            state.isFlying = false;
            controls.enabled = true;
        }
    }
    requestAnimationFrame(animateFly);
};
