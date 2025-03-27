import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ManejoFisicas = () => {
    const mountRef = useRef(null);
    const [carModel, setCarModel] = useState('car1.glb');
    const [lightsEnabled, setLightsEnabled] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);

    useEffect(() => {
        if (!mountRef.current) return;

        // 🌍 Mundo físico (Cannon.js)
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);
        world.broadphase = new CANNON.NaiveBroadphase();
        world.solver.iterations = 10;

        // 🎨 Escena (Three.js)
        const scene = new THREE.Scene();
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        // 📷 Cámara y controles
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(-6, 6, 10);
        scene.add(camera);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // 💡 Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, lightsEnabled ? 0.5 : 0);
        const directionalLight = new THREE.DirectionalLight(0xffffff, lightsEnabled ? 1 : 0);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;

        scene.add(ambientLight, directionalLight);

        // 🔲 Piso
        const floorMaterial = new CANNON.Material();
        const floorBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane(),
            material: floorMaterial
        });
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(floorBody);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: '#6a5acd', metalness: 0.5, roughness: 0.5 })
        );
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        // 🚗 Carro (Cuerpo físico)
        const carMaterial = new CANNON.Material();
        const carBody = new CANNON.Body({
            mass: 4,
            shape: new CANNON.Box(new CANNON.Vec3(1.5, 0.5, 3)),
            material: carMaterial,
            position: new CANNON.Vec3(0, 1, 0)
        });
        world.addBody(carBody);

        // 🔳 Cubo (Cuerpo físico)
        const boxMaterial = new CANNON.Material();
        const boxBody = new CANNON.Body({
            mass: 2,
            shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)),
            material: boxMaterial,
            position: new CANNON.Vec3(0, 2, 0) // 🟡 Asegura que inicie sobre el carro
        });
        world.addBody(boxBody);

        // 🎨 Carga del modelo 3D del carro
        let carMesh;
        const loader = new GLTFLoader();
        loader.load(`/assets/${carModel}`, (gltf) => {
            carMesh = gltf.scene;
            carMesh.scale.set(1, 1, 1);
            scene.add(carMesh);
        });

        // 🔲 Cubo visual
        const boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 'yellow' })
        );
        scene.add(boxMesh);

        // 🎵 Sonido de colisión
        const sound = new Audio('/assets/collision.mp3');
        sound.volume = 0.2;

        world.addEventListener('postStep', () => {
            if (carBody.velocity.length() > 2 && soundEnabled) {
                sound.play();
            }
        });

        // 🎮 Manejo de teclado
        const handleKeyDown = (event) => {
            const forceMagnitude = 10;
            let force = new CANNON.Vec3(0, 0, 0);

            switch (event.key) {
                case 'ArrowUp':
                    force.set(0, 0, -forceMagnitude);
                    break;
                case 'ArrowDown':
                    force.set(0, 0, forceMagnitude);
                    break;
                case 'ArrowLeft':
                    force.set(-forceMagnitude, 0, 0);
                    break;
                case 'ArrowRight':
                    force.set(forceMagnitude, 0, 0);
                    break;
                default:
                    return;
            }

            carBody.applyImpulse(force, carBody.position);
            boxBody.applyImpulse(force, boxBody.position);
        };
        window.addEventListener('keydown', handleKeyDown);

        // 🎞️ Animación
        const tick = () => {
            world.step(1 / 60);

            if (carMesh) {
                carMesh.position.copy(carBody.position);
                carMesh.quaternion.copy(carBody.quaternion);
            }

            boxMesh.position.copy(boxBody.position);
            boxMesh.quaternion.copy(boxBody.quaternion);

            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        tick();

        // 🗑️ Limpieza
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
        };
    }, [carModel, lightsEnabled, soundEnabled]);

    return (
        <div>
            <button onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? 'Disable Sound' : 'Enable Sound'}
            </button>
            <button onClick={() => setLightsEnabled(!lightsEnabled)}>
                {lightsEnabled ? 'Turn Off Lights' : 'Turn On Lights'}
            </button>
            <select onChange={(e) => setCarModel(e.target.value)}>
                <option value="car1.glb">Car Model 1</option>
                <option value="car2.glb">Car Model 2</option>
            </select>
            <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
        </div>
    );
};

export default ManejoFisicas;
