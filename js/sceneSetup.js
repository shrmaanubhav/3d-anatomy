import * as THREE from './three.module.js';
import { OrbitControls } from './controls/OrbitControls.js';
import { CSS2DRenderer } from './renderers/CSS2DRenderer.js';

export function initScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 20);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.listenToKeyEvents(window);
    controls.minDistance = 2;
    controls.maxDistance = 25;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 7);
    scene.add(light);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    labelRenderer.domElement.style.left = '0px';
    labelRenderer.domElement.style.pointerEvents = 'none'; 
    document.body.appendChild(labelRenderer.domElement);

    window.labelRenderer = labelRenderer;

    return { scene, camera, renderer, controls,labelRenderer };
}