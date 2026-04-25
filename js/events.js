import * as THREE from './three.module.js';
export function setupEvents(camera, renderer, controls, state, mainGroup) {

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    //  CLICK DETECTOR: Identifies "Object_XX" names in the console
    renderer.domElement.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        if (!mainGroup) {
            console.error("Raycaster Error: mainGroup is not defined in setupEvents.");
            return;
        }

        const intersects = raycaster.intersectObjects(mainGroup.children, true);
        // debugging function to print all intersected objects
        if (intersects.length > 0) {
            const hit = intersects[0];
            const clickedObj = hit.object;
            
            // 1. Get the exact surface point you clicked in the mesh's local space
            const localHitPoint = clickedObj.worldToLocal(hit.point.clone());

            console.log("----------------------------");
            console.log(`🎯 Mesh Found: ${clickedObj.name}`);
            console.log(`System: ${clickedObj.parent.name || "Unknown"}`);
            
            // 2. This prints the exact array formatted for your ANATOMY_MAP!
            console.log(`✅ COPY THIS POSITION: [${localHitPoint.x.toFixed(3)}, ${localHitPoint.y.toFixed(3)}, ${localHitPoint.z.toFixed(3)}]`);
            
            // 3. Visual feedback: flashes the clicked part red
            if (clickedObj.material && clickedObj.material.color) {
                const originalColor = clickedObj.material.color.getHex();
                clickedObj.material.color.setHex(0xff0000); 
                setTimeout(() => clickedObj.material.color.setHex(originalColor), 200);
            }
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