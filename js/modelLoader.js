import * as THREE from './three.module.js';
import { GLTFLoader } from './loaders/GLTFLoader.js';
import { CSS2DObject } from './renderers/CSS2DRenderer.js';
import { MeshoptDecoder } from './libs/meshopt_decoder.module.js';

const BASE = import.meta.env.VITE_ASSET_BASE_URL;

export const ANATOMY_MAP = {
    muscle: {
        "Object_152": { id: 1, side: "back", name: "Spinalis", desc: "Deep muscle of the back that extends the vertebral column and aids in posture." },
        "Object_112": { id: 2, side: "back", name: "Gluteus Medius", desc: "A pelvic muscle crucial for stabilizing the pelvis and rotating the thigh." },
        "Object_108": { id: 3, side: "back", name: "Trapezius", desc: "A large, triangular muscle of the upper back that moves the shoulder blade and supports the arm." },
        "Object_203": { id: 4, side: "front", name: "Abdomen", desc: "Core muscles, including the rectus abdominis, that protect internal organs and support the spine." },
        "Object_86": { id: 5, side: "front", name: "Chest", desc: "The pectoralis major, a thick, fan-shaped muscle responsible for movement of the shoulder joint." }
    },

    organs: {
        "Object_2": { id: 6, side: "front", name: "Bronchii", desc: "The primary airways that conduct air directly from the trachea into the functional tissues of the lungs." },
        "Object_54": { id: 7, side: "front", name: "Small Intestine", desc: "A highly coiled tube where the vast majority of digestion and nutrient absorption into the bloodstream occurs." },
        "Object_84": { id: 8, side: "back", name: "Kidneys", desc: "A pair of bean-shaped organs that filter waste and excess fluids from the blood, forming urine. They also regulate blood pressure, electrolyte balance, and red blood cell production." },
        "Object_75": { id: 9, side: "front", name: "Liver", desc: "The body's chemical factory, responsible for filtering toxins from the blood, producing bile, and storing glycogen." },
        "Object_85": { id: 10, side: "front", name: "Stomach", desc: "A muscular organ that churns food and secretes highly acidic gastric juices to break down proteins.", offset: [0.5, 0, 0] },
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
        "Object_49": { id: 21, side: "back", name: "Vertebrae", desc: "The interlocking bones of the spinal column that house and protect the delicate spinal cord." },
        "Object_86": { id: 22, side: "front", name: "Skull", desc: "The bony framework of the head, consisting of the cranium to protect the brain and facial bones." }
    }
};

// ================= LABEL CREATOR (unchanged) =================
function createInteractiveLabel(mesh, idNum, data, system, labelsArray, controls) {
    const anchor = document.createElement('div');
    anchor.className = 'label-anchor';

    const div = document.createElement('div');
    div.className = 'anatomy-label';
    div.style.pointerEvents = 'auto';
    div.innerHTML = `<div class="dot">${data.id}</div><div class="text">${data.name}</div>`;

    const labelObj = new CSS2DObject(anchor);
    labelObj.userData = data;

    div.onclick = (e) => {
        e.stopPropagation();

        document.querySelectorAll('.anatomy-label').forEach(el => el.classList.remove('expanded'));
        div.classList.add('expanded');

        if (window.showInfoPanel) window.showInfoPanel(data.name, data.desc, system);

        const camera = controls.object;
        const lookDir = new THREE.Vector3();
        camera.getWorldDirection(lookDir);

        const isFacingFront = lookDir.z < 0;
        const isAlreadyOut = div.classList.contains('is-pulled-out');

        if (isAlreadyOut) {
            div.classList.remove('is-pulled-out');
            controls.target.set(0, 0, 0);
            controls.update();
            if (window.toggleOrganPulloutFromLabel) {
                window.toggleOrganPulloutFromLabel(mesh, system);
            }
            return;
        }

        div.classList.add('is-pulled-out');

        let isRotating = false;

        if (data.side === 'back' && isFacingFront) {
            window.flyTo([0, 1, -15], [0, 0, 0]);
            isRotating = true;
        } else if (data.side === 'front' && !isFacingFront) {
            window.flyTo([0, 1, 15], [0, 0, 0]);
            isRotating = true;
        } else {
            const targetWorldPos = new THREE.Vector3();
            labelObj.getWorldPosition(targetWorldPos);
            controls.target.copy(targetWorldPos);
            controls.update();
        }

        const delayDuration = isRotating ? 1200 : 0;

        setTimeout(() => {
            if (window.toggleOrganPulloutFromLabel) {
                window.toggleOrganPulloutFromLabel(mesh, system);
            }
        }, delayDuration);
    };

    anchor.appendChild(div);

    mesh.geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(center);
    labelObj.position.copy(center);

    mesh.add(labelObj);
    labelsArray.push({ element: labelObj, system: system });
}

// ================= MAIN LOADER =================
export async function loadAllModels(mainGroup, state, clipPlane, controls, onModelsLoaded) {

    const loader = new GLTFLoader();

    await MeshoptDecoder.ready;
    loader.setMeshoptDecoder(MeshoptDecoder);

    const layers = state.layers;
    state.labels = [];

    const cache = {};
    const loading = {};

    function processModel(gltf, name) {
        const model = gltf.scene;
        model.scale.set(5, 5, 5);

        // =========================
        // 🔥 PASS 1: IMMEDIATE (visibility + labels)
        // =========================
        model.traverse(child => {
            if (!child.isMesh) return;

            // --- hide unwanted parts ---
            if (name === "organs" && ["Object_50", "Object_51", "Object_66", "Object_68"].includes(child.name)) {
                child.visible = false;
            }

            if (name === "blood" && ["Object_39", "Object_42", "Object_52", "Object_209"].includes(child.name)) {
                child.visible = false;
            }

            // --- 🔥 CREATE LABELS IMMEDIATELY ---
            const systemMap = ANATOMY_MAP[name];
            if (systemMap && systemMap[child.name]) {
                const objNumber = parseInt(child.name.replace("Object_", ""));
                createInteractiveLabel(
                    child,
                    objNumber,
                    systemMap[child.name],
                    name,
                    state.labels,
                    controls
                );
            }
        });

        // =========================
        // 🟡 PASS 2: HEAVY WORK (deferred)
        // =========================
        requestIdleCallback(() => {
            model.traverse(child => {
                if (!child.isMesh) return;

                child.material = child.material.clone();
                child.material.side = THREE.DoubleSide;
                child.material.clipShadows = true;
                child.material.needsUpdate = true;

                const objNumber = parseInt(child.name.replace("Object_", ""));

                if (name === "nerves") {
                    const isBone = (objNumber >= 6 && objNumber <= 34) || (objNumber >= 54 && objNumber <= 70);
                    child.material.clippingPlanes = isBone ? [clipPlane] : [];
                } 
                else if (name === "organs") {
                    const isBone = (objNumber >= 8 && objNumber <= 24) || (objNumber >= 34 && objNumber <= 49);
                    child.material.clippingPlanes = isBone ? [clipPlane] : [];
                } 
                else {
                    child.material.clippingPlanes = (name === "muscle" || name === "blood") ? [] : [clipPlane];
                }
            });
        });

        return model;
    }
    function loadModel(name, onReady) {
        if (cache[name] || loading[name]) return;
        loading[name] = true;

        loader.load(`${BASE}/${name}.glb`, (gltf) => {
            const model = processModel(gltf, name);
            cache[name] = model;
            delete loading[name];

            if (onReady) onReady(model);
        });
    }

    function activateLayer(name) {
        if (layers[name]) return;

        if (cache[name]) {
            layers[name] = cache[name];
            mainGroup.add(cache[name]);
        } else {
            loadModel(name, (model) => {
                layers[name] = model;
                mainGroup.add(model);
            });
        }
    }

    loadModel("muscle", (model) => {
        layers["muscle"] = model;
        mainGroup.add(model);

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        mainGroup.position.sub(center);

        controls.target.set(0, 0, 0);
        controls.update();

        if (onModelsLoaded) {
            onModelsLoaded(box.getSize(new THREE.Vector3()).z);
        }

        requestIdleCallback(() => {
            ["organs", "blood", "nerves"].forEach(name => loadModel(name));
        });

        setTimeout(() => {
            loadModel("skeleton");
        }, 800);
    });

    state.activateLayer = activateLayer;
}