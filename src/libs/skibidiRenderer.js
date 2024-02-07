import * as THREE from "./three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { OrbitControls } from "./OrbitControls.js";
const container = document.getElementById('skin-viewer');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ alpha: true });
const controls = new OrbitControls( camera, renderer.domElement );
controls.enableZoom = false;

renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearAlpha(0);
container.appendChild(renderer.domElement);

const loader = new GLTFLoader();
let obj;
loader.load('http://localhost:3300/libs/models/player.json', function (gltf) {
    obj = gltf.scene;
    scene.add(gltf.scene);
});


const light = new THREE.HemisphereLight(0xffffff, 0x000000, 2)
scene.add(light);


camera.position.set(0, 0.5, 3)
controls.update();
function handleScroll() {
    const boundingRect = container.getBoundingClientRect();
    const relativeScrollTop = boundingRect.top / (document.documentElement.clientHeight - boundingRect.height);
    const targetY = 0.5 + relativeScrollTop * 1;
    camera.position.setY(targetY);
    obj.rotation.y += targetY / 10;
}

window.addEventListener('scroll', handleScroll);

function animate() {
    requestAnimationFrame(animate);
    obj.rotation.y += 0.002;
    controls.update();
    renderer.render(scene, camera);
}

animate();
