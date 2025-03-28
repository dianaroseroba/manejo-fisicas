import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import popSound from '/assets/collision.mp3';

const ManejoFisicas = () => {
    const mountRef = useRef(null);
    const [roofEnabled, setRoofEnabled] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [carModel, setCarModel] = useState('car1.glb');
    const [lightsEnabled, setLightsEnabled] = useState(true);

    useEffect(() => {
        if (!mountRef.current) return;

        // Escena y mundo físico
        const scene = new THREE.Scene();
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(-6, 6, 6);
        scene.add(camera);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Luces
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 5);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0xffaa33, 1, 10);
        pointLight.position.set(0, 3, 0);
        scene.add(pointLight);

        const toggleLights = (enabled) => {
            ambientLight.intensity = enabled ? 0.5 : 0;
            directionalLight.intensity = enabled ? 1 : 0;
            pointLight.intensity = enabled ? 1 : 0;
        };
        toggleLights(lightsEnabled);

        // Piso azul
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(20, 20),
            new THREE.MeshStandardMaterial({ color: 'blue', metalness: 0.5, roughness: 0.5 })
        );
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(new CANNON.Plane());
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        // Carro: carga del modelo visual (inicia en reposo junto al cubo)
        let carMesh;
        const loader = new GLTFLoader();
        loader.load(`/assets/${carModel}`, (gltf) => {
            carMesh = gltf.scene;
            carMesh.position.set(0.75, 1, 0);  // Nueva posición más cercana al cubo
            carMesh.scale.set(1, 1, 1);
            scene.add(carMesh);
        });

        // Carro: parámetros del cuerpo físico
        // Carro: parámetros del cuerpo físico
        const carBody = new CANNON.Body({ mass: 2, position: new CANNON.Vec3(0.75, 1, 0) });
        carBody.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.5, 1.5)));
        // Caja proporcional al modelo del carro (dimensiones completas 1.5 x 1 x 3)
        carBody.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.5, 1.5)));
        carBody.fixedRotation = true;
        carBody.updateMassProperties();
        // Inicia en reposo
        carBody.velocity.set(0, 0, 0);
        world.addBody(carBody);

        // Cubo: parámetros del cuerpo físico (masa 2 y forma 1x1x1)
        const boxBody = new CANNON.Body({ mass: 2, position: new CANNON.Vec3(0, 1, 0) });
        boxBody.addShape(new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)));
        world.addBody(boxBody);

        const boxMesh = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 'red' })
        );
        scene.add(boxMesh);

        // Sonido de colisión
        const collisionSound = new Audio(popSound);
        collisionSound.volume = 0.5;
        carBody.addEventListener('collide', () => {
            if (soundEnabled) {
                collisionSound.currentTime = 0;
                collisionSound.play().catch(err => console.error('Sound error:', err));
            }
        });

        // Estado de teclas para el control horizontal
        const keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        const onKeyDown = (e) => {
            if (Object.prototype.hasOwnProperty.call(keys, e.key)) {
                keys[e.key] = true;
            }
        };

        const onKeyUp = (e) => {
            if (Object.prototype.hasOwnProperty.call(keys, e.key)) {
                keys[e.key] = false;
            }
        };

        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);

        // Ciclo de animación: movimiento horizontal
        const tick = () => {
            const speed = 5;
            let vx = 0, vz = 0;
            if (keys.ArrowUp) vz -= speed;
            if (keys.ArrowDown) vz += speed;
            if (keys.ArrowLeft) vx -= speed;
            if (keys.ArrowRight) vx += speed;
            
            carBody.velocity.x = vx;
            carBody.velocity.z = vz;
            
            // Forzar movimiento horizontal: se mantiene la misma altura (y = 1)
            carBody.position.y = 1;
            carBody.velocity.y = 0;
        
            world.step(1 / 60);
        
            if (carMesh) {
                carMesh.position.copy(carBody.position);
                carMesh.quaternion.copy(carBody.quaternion);
            }
        
            // Hacer que el cubo siga al carro
            boxBody.position.copy(carBody.position);
            boxBody.quaternion.copy(carBody.quaternion);
        
            boxMesh.position.copy(boxBody.position);
            boxMesh.quaternion.copy(boxBody.quaternion);
        
            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        

        tick();

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            mountRef.current.removeChild(renderer.domElement);
        };
    }, [roofEnabled, soundEnabled, carModel, lightsEnabled]);

    return (
        <div>
            <button onClick={() => setRoofEnabled(!roofEnabled)}>
                {roofEnabled ? 'Disable Roof' : 'Enable Roof'}
            </button>
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