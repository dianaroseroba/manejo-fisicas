import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const ManejoFisicas = () => {
    const mountRef = useRef(null);
    const [limitesActivos, setLimitesActivos] = useState(true);
    const audioRef = useRef(new Audio('assets/collision.mp3'));

    useEffect(() => {
        if (!mountRef.current) return;

        const gui = new GUI();
        const scene = new THREE.Scene();
        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);

        const limites = { x: 5, z: 5, y: 3 };

        // Piso
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({ color: '#777777', metalness: 0.3, roughness: 0.4 })
        );
        floor.receiveShadow = true;
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        // Vehículo
        const carShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        const carBody = new CANNON.Body({ mass: 2, position: new CANNON.Vec3(0, 1, 0) });
        carBody.addShape(carShape);
        world.addBody(carBody);

        const car = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1, 4),
            new THREE.MeshStandardMaterial({ color: 'red' })
        );
        car.castShadow = true;
        scene.add(car);

        // Esfera
        const sphereShape = new CANNON.Sphere(0.5);
        const sphereBody = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(2, 1, 0) });
        sphereBody.addShape(sphereShape);
        world.addBody(sphereBody);

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32),
            new THREE.MeshStandardMaterial({ color: 'green' })
        );
        sphere.castShadow = true;
        scene.add(sphere);

        // Cubo de límite
        const limitBox = new THREE.Mesh(
            new THREE.BoxGeometry(limites.x * 2, limites.y * 2, limites.z * 2),
            new THREE.MeshStandardMaterial({ color: 'blue', transparent: true, opacity: 0.2, wireframe: true })
        );
        limitBox.position.y = limites.y;
        scene.add(limitBox);

        // Luces del vehículo
        const headlight1 = new THREE.PointLight(0xffffff, 2, 5);
        const headlight2 = new THREE.PointLight(0xffffff, 2, 5);
        scene.add(headlight1, headlight2);

        // Iluminación ambiental
        const ambientLight = new THREE.AmbientLight(0xffffff, 1);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const sizes = { width: window.innerWidth, height: window.innerHeight };
        const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100);
        camera.position.set(-5, 5, 10);
        scene.add(camera);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(sizes.width, sizes.height);
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
        window.addEventListener('keydown', (e) => keys[e.code] = true);
        window.addEventListener('keyup', (e) => keys[e.code] = false);

        const clock = new THREE.Clock();
        let oldElapsedTime = 0;

        const tick = () => {
            const elapsedTime = clock.getElapsedTime();
            const deltaTime = elapsedTime - oldElapsedTime;
            oldElapsedTime = elapsedTime;

            world.step(1 / 60, deltaTime, 3);

            if (keys.ArrowUp) carBody.position.z -= 0.1;
            if (keys.ArrowDown) carBody.position.z += 0.1;
            if (keys.ArrowLeft) carBody.position.x -= 0.1;
            if (keys.ArrowRight) carBody.position.x += 0.1;

            if (limitesActivos) {
                carBody.position.x = Math.max(-limites.x, Math.min(limites.x, carBody.position.x));
                carBody.position.z = Math.max(-limites.z, Math.min(limites.z, carBody.position.z));
                carBody.position.y = Math.min(limites.y, carBody.position.y);
                sphereBody.position.x = Math.max(-limites.x, Math.min(limites.x, sphereBody.position.x));
                sphereBody.position.z = Math.max(-limites.z, Math.min(limites.z, sphereBody.position.z));
                sphereBody.position.y = Math.min(limites.y, sphereBody.position.y);
                limitBox.visible = true;
            } else {
                limitBox.visible = false;
            }

            car.position.copy(carBody.position);
            car.quaternion.copy(carBody.quaternion);
            sphere.position.copy(sphereBody.position);
            sphere.quaternion.copy(sphereBody.quaternion);

            headlight1.position.set(car.position.x - 0.8, car.position.y + 0.5, car.position.z + 2);
            headlight2.position.set(car.position.x + 0.8, car.position.y + 0.5, car.position.z + 2);

            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };
        tick();

        return () => {
            gui.destroy();
            mountRef.current.removeChild(renderer.domElement);
        };
    }, [limitesActivos]);

    const reproducirSonido = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    return (
        <div>
            <button onClick={() => setLimitesActivos(!limitesActivos)}>
                {limitesActivos ? 'Desactivar Límites' : 'Activar Límites'}
            </button>
            <button onClick={reproducirSonido}>Reproducir sonido</button>
            <div ref={mountRef} />
        </div>
    );
};

export default ManejoFisicas;
