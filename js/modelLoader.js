import * as THREE from './three.module.js';
import { GLTFLoader } from './loaders/GLTFLoader.js';
import { CSS2DObject } from './renderers/CSS2DRenderer.js';

export const ANATOMY_MAP = {
    muscle: {
        "Object_152": { id: 1, side: "back", name: "Spinalis", desc: "Deep muscle of the back that extends the vertebral column and aids in posture." },
        "Object_112": { id: 2,side: "back", name: "Gluteus Medius", desc: "A pelvic muscle crucial for stabilizing the pelvis and rotating the thigh." },
        "Object_108": { id: 3, side: "back", name: "Trapezius", desc: "A large, triangular muscle of the upper back that moves the shoulder blade and supports the arm." },
        "Object_203": { id: 4, side: "front", name: "Abdomen", desc: "Core muscles, including the rectus abdominis, that protect internal organs and support the spine." },
        "Object_86": { id: 5, side: "front", name: "Chest", desc: "The pectoralis major, a thick, fan-shaped muscle responsible for movement of the shoulder joint." }
    },
    organs: {
        "Object_2": { id: 6, side: "front", name: "Bronchii", desc: "The primary airways that conduct air directly from the trachea into the functional tissues of the lungs." },
        "Object_54": { id: 7, side: "front", name: "Small Intestine", desc: "A highly coiled tube where the vast majority of digestion and nutrient absorption into the bloodstream occurs." },
        "Object_52": { id: 8, side: "front", name: "Pancreas", desc: "A vital glandular organ that produces digestive enzymes to break down food, and secretes hormones like insulin to regulate blood sugar levels." },
        "Object_70": { id: 9, side: "front", name: "Liver", desc: "The body's chemical factory, responsible for filtering toxins from the blood, producing bile, and storing glycogen." },
        "Object_71": { id: 10, side: "front", name: "Stomach", desc: "A muscular organ that churns food and secretes highly acidic gastric juices to break down proteins.",offset: [0.5, 0, 0] },
        "Object_57": { id: 11, side: "front", name: "Large Intestine", desc: "The final section of the gastrointestinal tract, responsible for absorbing water and forming solid waste." },
        "Object_62": { id: 12, side: "front", name: "Lungs", desc: "Spongy, air-filled organs where life-sustaining oxygen enters the blood and carbon dioxide is expelled." }
    },
    blood: {
        "Object_152": { id: 13, side: "front", name: "Heart", desc: "A powerful, four-chambered muscular pump that continuously circulates blood throughout the entire body." },
        "Object_180": { id: 14, side: "front", name: "Great Blood Vessels", desc: "The body's primary circulatory highways. Includes the Aorta (red) carrying oxygen-rich blood away from the heart, and the Vena Cava (blue) returning oxygen-depleted blood back." }
    },
    nerves: {
        "Object_43": { id: 15, side: "front", name: "Cerebrum", desc: "The largest part of the brain, responsible for voluntary actions, complex thought, memory, and sensory processing." },
        "Object_52": { id: 16, side: "front", name: "Cerebellum", desc: "Located at the back of the brain, it meticulously coordinates voluntary movements, posture, and balance." }
    },
    skeleton: {
        "Object_4": { id: 17, side: "front", name: "Shoulder", desc: "The glenohumeral joint, a highly mobile ball-and-socket joint that allows for a massive range of arm motion." },
        "Object_6": { id: 18, side: "front", name: "Knee", desc: "A complex hinge joint connecting the thigh and lower leg, bearing the body's weight during movement." },
        "Object_27": { id: 19, side: "front", name: "Pelvis", desc: "A sturdy, basin-shaped bony structure that connects the spine to the legs and protects lower abdominal organs." },
        "Object_46": { id: 20, side: "front", name: "Ribcage", desc: "A flexible, bony basket that protects the heart and lungs while expanding to facilitate breathing." },
        "Object_49": { id: 21, side: "front", name: "Vertebrae", desc: "The interlocking bones of the spinal column that house and protect the delicate spinal cord." },
        "Object_86": { id: 22, side: "front", name: "Skull", desc: "The bony framework of the head, consisting of the cranium to protect the brain and facial bones." }
    }
};

//  THE LABEL CREATOR 
function createInteractiveLabel(mesh, idNum, data, system, labelsArray, controls) {
    const anchor = document.createElement('div');
    anchor.className = 'label-anchor';

    const div = document.createElement('div');
    div.className = 'anatomy-label';
    div.style.pointerEvents = 'auto'; 
    div.innerHTML = `<div class="dot">${data.id}</div><div class="text">${data.name}</div>`;
    
    // 1. Initialize the 3D Label Object first so the click handler can use it
    const labelObj = new CSS2DObject(anchor);
    labelObj.userData = data; 

    div.onclick = (e) => {
        e.stopPropagation();
        
        // UI Feedback
        document.querySelectorAll('.anatomy-label').forEach(el => el.classList.remove('expanded'));
        div.classList.add('expanded');

        if (window.showInfoPanel) window.showInfoPanel(data.name, data.desc, system);
        
        const camera = controls.object;
        const isCameraAtFront = camera.position.z > 0;

        //  Trigger rotation if the camera is on the wrong side
        if (data.side === 'back' && isCameraAtFront) {
            window.flyTo([0, 1, -1], [0, 0, 0]); 
        } else if (data.side === 'front' && !isCameraAtFront) {
            window.flyTo([0, 1, 1], [0, 0, 0]); 
        } else {
            // Already on correct side: Focus on the specific mesh
            const targetWorldPos = new THREE.Vector3();
            labelObj.getWorldPosition(targetWorldPos);
            controls.target.copy(targetWorldPos);
            controls.update();
        }
    };

    anchor.appendChild(div);
    
    // Positioning logic (Centering on mesh)
    mesh.geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(center);
    labelObj.position.copy(center);
    
    mesh.add(labelObj); 
    labelsArray.push({ element: labelObj, system: system });
}

//  THE MODEL LOADER ---
export function loadAllModels(mainGroup, state, clipPlane, controls, onModelsLoaded) {
    const loader = new GLTFLoader();
    
    if (!state) {
        console.error("State object is missing in loadAllModels!");
        return;
    }

    const layers = state.layers;
    state.labels = []; 

    const modelPaths = [
        { path: 'models/skeleton.glb', name: 'skeleton' },
        { path: 'models/muscle.glb', name: 'muscle' },
        { path: 'models/organs.glb', name: 'organs' },
        { path: 'models/blood.glb', name: 'blood' },
        { path: 'models/nerves.glb', name: 'nerves' }
    ];

    let modelsLoaded = 0;

    modelPaths.forEach(m => {
        loader.load(m.path, (gltf) => {
            const model = gltf.scene;
            model.scale.set(5, 5, 5);
            layers[m.name] = model;

            model.traverse(child => {
                if (child.isMesh) {
                    
                    if (m.name === "organs" && ["Object_50", "Object_51", "Object_66", "Object_68"].includes(child.name)) {
                        child.visible = false;
                    }
                    if (m.name === "blood" && ["Object_39", "Object_42", "Object_52", "Object_209"].includes(child.name)) {
                        child.visible = false;
                    }

                    child.material = child.material.clone();
                    child.material.side = THREE.DoubleSide; 
                    child.material.clipShadows = true;
                    child.material.needsUpdate = true;

                    const objNumber = parseInt(child.name.replace("Object_", ""));

                    if (m.name === "nerves") {
                        const isBone = (objNumber >= 6 && objNumber <= 34) || (objNumber >= 54 && objNumber <= 70);
                        child.material.clippingPlanes = isBone ? [clipPlane] : [];
                    } 
                    else if (m.name === "organs") {
                        const isBone = (objNumber >= 8 && objNumber <= 24) || (objNumber >= 34 && objNumber <= 49);
                        const isOuterLung = (objNumber >= 62 && objNumber <= 64);

                        if (isBone) {
                            child.material.clippingPlanes = [clipPlane];
                        } 
                        else if (isOuterLung) {
                            child.material.clippingPlanes = []; 
                            child.material.transparent = true; 
                        } 
                        else {
                            child.material.clippingPlanes = []; 
                        }
                    } 
                    else {
                        child.material.clippingPlanes = (m.name === "muscle" || m.name === "blood") ? [] : [clipPlane];
                    }

                    // --- GENERATE ALL LABELS DYNAMICALLY ---
                    const systemMap = ANATOMY_MAP[m.name];
                    if (systemMap && systemMap[child.name]) {
                        createInteractiveLabel(
                            child, 
                            objNumber, // Uses the actual object number for the circle UI
                            systemMap[child.name], 
                            m.name, 
                            state.labels, 
                            controls
                        );
                    }
                }
            });

            mainGroup.add(model);
            modelsLoaded++;

            if (modelsLoaded === modelPaths.length) {
                const box = new THREE.Box3().setFromObject(mainGroup);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                mainGroup.position.sub(center);
                controls.target.set(0, 0, 0);
                controls.update();

                if (onModelsLoaded) onModelsLoaded(size.z);
            }
        });
    });
}