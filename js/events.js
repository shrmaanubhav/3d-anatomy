import * as THREE from './three.module.js';
import { 
    getPullableOrganFromIntersections, 
    getVisiblePulloutMeshes, 
    toggleOrganPullout 
} from './organPullout.js';

export function setupEvents(camera, renderer, controls, state, mainGroup) {

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (!mainGroup) return;

        const pulloutMeshes = getVisiblePulloutMeshes(state);
        if (pulloutMeshes.length === 0) return;

        const intersects = raycaster.intersectObjects(pulloutMeshes, false);
        const clickedOrgan = getPullableOrganFromIntersections(intersects, state);

        if (clickedOrgan) {
            toggleOrganPullout(clickedOrgan, camera, state);
        }
    });

    // Zoom control
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY * 0.01;
        state.targetDistance += delta * 2.0;
        state.targetDistance = THREE.MathUtils.clamp(state.targetDistance, 2, 40);
    }, { passive: false });

    // Window resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Global UI Toggles
    window.toggleMuscle = () => state.manualVisibility.muscle = !state.manualVisibility.muscle;
    window.toggleOrgans = () => state.manualVisibility.organs = !state.manualVisibility.organs;
    window.toggleBlood = () => state.manualVisibility.blood = !state.manualVisibility.blood;
    window.toggleNerves = () => state.manualVisibility.nerves = !state.manualVisibility.nerves;
    window.toggleLungInterior = () => {
        state.viewInsideLungs = !state.viewInsideLungs;
        console.log("Lung X-Ray Mode:", state.viewInsideLungs ? "ON" : "OFF");
    };
    window.toggleClippingMode = () => {
        state.isDynamicClipping = !state.isDynamicClipping;
        console.log("Clipping Mode:", state.isDynamicClipping ? "X-Ray" : "Front-Only");
    };
}