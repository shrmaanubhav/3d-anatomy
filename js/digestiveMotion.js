import * as THREE from './three.module.js';

const PATH_ANCHORS = {
    stomach: 'Object_71',
    smallIntestine: 'Object_54',
    largeIntestine: 'Object_57'
};

const foodColor = new THREE.Color(0xff9f1c);
const pathColor = new THREE.Color(0xffc857);

function getMeshCenter(mesh, target) {
    mesh.geometry.computeBoundingBox();
    mesh.geometry.boundingBox.getCenter(target);
    return mesh.localToWorld(target);
}

function findMesh(root, name) {
    let result = null;

    root.traverse(child => {
        if (!result && child.isMesh && child.name === name) {
            result = child;
        }
    });

    return result;
}

function createPathPoints(mainGroup, organsLayer) {
    const stomach = findMesh(organsLayer, PATH_ANCHORS.stomach);
    const smallIntestine = findMesh(organsLayer, PATH_ANCHORS.smallIntestine);
    const largeIntestine = findMesh(organsLayer, PATH_ANCHORS.largeIntestine);

    if (!stomach || !smallIntestine || !largeIntestine) return [];

    mainGroup.updateMatrixWorld(true);
    organsLayer.updateMatrixWorld(true);

    const stomachCenter = getMeshCenter(stomach, new THREE.Vector3());
    const smallCenter = getMeshCenter(smallIntestine, new THREE.Vector3());
    const largeCenter = getMeshCenter(largeIntestine, new THREE.Vector3());

    const stomachLocal = mainGroup.worldToLocal(stomachCenter.clone());
    const smallLocal = mainGroup.worldToLocal(smallCenter.clone());
    const largeLocal = mainGroup.worldToLocal(largeCenter.clone());

    const throat = stomachLocal.clone().add(new THREE.Vector3(0, 6.4, 0.1));
    const esophagusTop = stomachLocal.clone().add(new THREE.Vector3(0, 4.4, 0.05));
    const esophagusBottom = stomachLocal.clone().add(new THREE.Vector3(0.15, 2.0, 0));
    const stomachEntry = stomachLocal.clone().add(new THREE.Vector3(0.25, 0.5, 0));
    const stomachExit = stomachLocal.clone().add(new THREE.Vector3(-0.65, -0.35, 0.15));
    const smallStart = smallLocal.clone().add(new THREE.Vector3(-0.5, 0.45, 0.15));
    const smallLoopA = smallLocal.clone().add(new THREE.Vector3(0.7, 0.15, 0.25));
    const smallLoopB = smallLocal.clone().add(new THREE.Vector3(-0.75, -0.25, 0.15));
    const smallLoopC = smallLocal.clone().add(new THREE.Vector3(0.55, -0.55, 0.2));
    const largeStart = largeLocal.clone().add(new THREE.Vector3(-0.85, -0.4, 0.1));
    const largeRise = largeLocal.clone().add(new THREE.Vector3(-0.95, 0.65, 0.15));
    const largeAcross = largeLocal.clone().add(new THREE.Vector3(0.85, 0.65, 0.15));
    const largeDown = largeLocal.clone().add(new THREE.Vector3(0.9, -0.4, 0.1));
    const exit = largeLocal.clone().add(new THREE.Vector3(0, -1.0, 0));

    return [
        throat,
        esophagusTop,
        esophagusBottom,
        stomachEntry,
        stomachLocal,
        stomachExit,
        smallStart,
        smallLoopA,
        smallLoopB,
        smallLoopC,
        largeStart,
        largeRise,
        largeAcross,
        largeDown,
        exit
    ];
}

function createPulseRing() {
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.018, 8, 28),
        new THREE.MeshBasicMaterial({
            color: 0xffd166,
            transparent: true,
            opacity: 0.75,
            depthTest: false,
            depthWrite: false
        })
    );

    return ring;
}

export function initDigestiveMotion(mainGroup, state) {
    const organsLayer = state.layers.organs;
    if (!mainGroup || !organsLayer) return;

    const points = createPathPoints(mainGroup, organsLayer);
    if (points.length < 2) return;

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.35);
    const group = new THREE.Group();
    group.name = 'digestive_flow_visualization';

    const path = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 180, 0.045, 10, false),
        new THREE.MeshBasicMaterial({
            color: pathColor,
            transparent: true,
            opacity: 0.28,
            depthTest: false,
            depthWrite: false
        })
    );
    path.renderOrder = 10;
    group.add(path);

    const bolus = new THREE.Mesh(
        new THREE.SphereGeometry(0.19, 24, 16),
        new THREE.MeshStandardMaterial({
            color: foodColor,
            emissive: foodColor,
            emissiveIntensity: 0.35,
            depthTest: false,
            roughness: 0.65
        })
    );
    bolus.renderOrder = 12;
    group.add(bolus);

    const trailMaterial = new THREE.MeshBasicMaterial({
        color: foodColor,
        transparent: true,
        opacity: 0.45,
        depthTest: false,
        depthWrite: false
    });

    const trail = Array.from({ length: 9 }, () => {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.085, 14, 10),
            trailMaterial.clone()
        );
        group.add(particle);
        return particle;
    });

    const rings = Array.from({ length: 5 }, () => {
        const ring = createPulseRing();
        group.add(ring);
        return ring;
    });

    mainGroup.add(group);

    state.digestiveMotion = {
        curve,
        group,
        bolus,
        trail,
        rings,
        tangent: new THREE.Vector3(),
        normal: new THREE.Vector3(),
        binormal: new THREE.Vector3()
    };
}

function setObjectOnCurve(object, motion, progress) {
    const t = THREE.MathUtils.euclideanModulo(progress, 1);
    const position = motion.curve.getPointAt(t);
    const tangent = motion.curve.getTangentAt(t).normalize();

    object.position.copy(position);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);

    return { t, position, tangent };
}

function setRingOnCurve(ring, motion, progress) {
    const t = THREE.MathUtils.euclideanModulo(progress, 1);
    const position = motion.curve.getPointAt(t);
    const tangent = motion.curve.getTangentAt(t).normalize();

    ring.position.copy(position);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

    return { t, position, tangent };
}

export function updateDigestiveMotion(state, elapsedTime) {
    const motion = state.digestiveMotion;
    const organsLayer = state.layers.organs;

    if (!motion || !organsLayer) return;

    const isVisible = state.isDigestiveFlowActive &&
        state.manualVisibility.organs &&
        organsLayer.visible;

    motion.group.visible = isVisible;
    if (!isVisible) return;

    const speed = state.digestiveFlowSpeed || 1;
    const progress = (elapsedTime * 0.065 * speed) % 1;

    const bolusState = setObjectOnCurve(motion.bolus, motion, progress);
    const peristalsis = 1 + Math.sin(elapsedTime * 12) * 0.14;
    motion.bolus.scale.set(1.15 / peristalsis, peristalsis, 1.15 / peristalsis);

    motion.trail.forEach((particle, index) => {
        const delay = (index + 1) * 0.012;
        const trailState = setObjectOnCurve(particle, motion, progress - delay);
        const fade = 1 - index / motion.trail.length;
        const pulse = 0.7 + Math.sin(elapsedTime * 8 - index * 0.55) * 0.15;

        particle.scale.setScalar(fade * pulse);
        particle.material.opacity = 0.38 * fade;

        motion.normal.crossVectors(trailState.tangent, new THREE.Vector3(0, 0, 1)).normalize();
        if (motion.normal.lengthSq() < 0.001) {
            motion.normal.set(1, 0, 0);
        }

        particle.position.addScaledVector(
            motion.normal,
            Math.sin(elapsedTime * 7 - index) * 0.05
        );
    });

    motion.rings.forEach((ring, index) => {
        const offset = index * 0.055;
        const ringState = setRingOnCurve(ring, motion, bolusState.t - offset);
        const wave = THREE.MathUtils.euclideanModulo(progress * 10 - index * 0.35, 1);
        const scale = 0.9 + wave * 1.45;

        ring.scale.set(scale, scale, scale);
        ring.material.opacity = (1 - wave) * 0.55;
        ring.position.copy(ringState.position);
    });
}
