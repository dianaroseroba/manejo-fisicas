import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import GUI from 'lil-gui';
import * as CANNON from 'cannon-es';

const Lab5 = () => {
    const mountRef = useRef(null);
    const [barriersEnabled, setBarriersEnabled] = useState(true);

    useEffect(() => {
        if (!mountRef.current) return;

        const gui = new GUI();
        const debugObject = {};
        const scene = new THREE.Scene();

        const world = new CANNON.World();
        world.gravity.set(0, -9.82, 0);

        const defaultMaterial = new CANNON.Material('default');
        const defaultContactMaterial = new CANNON.ContactMaterial(
            defaultMaterial,
            defaultMaterial,
            { friction: 0.1, restitution: 0.6 }
        );
        world.addContactMaterial(defaultContactMaterial);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.shadowMap.enabled = true;
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(-3, 3, 3);
        scene.add(camera);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 2.1);
        scene.add(ambientLight);
        gui.add(ambientLight, 'intensity').min(0).max(3).step(0.1).name('Amb. Light');

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.castShadow = true;
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 10),
            new THREE.MeshStandardMaterial({ color: '#777777' })
        );
        floor.rotation.x = -Math.PI * 0.5;
        scene.add(floor);

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({ mass: 0 });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
        world.addBody(floorBody);

        const barriers = [];
        if (barriersEnabled) {
            const createBarrier = (position, size) => {
                const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
                const body = new CANNON.Body({ mass: 0 });
                body.addShape(shape);
                body.position.set(position.x, position.y, position.z);
                world.addBody(body);
                barriers.push(body);
            };

            createBarrier({ x: 0, y: 0.5, z: 5 }, { x: 10, y: 1, z: 0.2 });
            createBarrier({ x: 0, y: 0.5, z: -5 }, { x: 10, y: 1, z: 0.2 });
            createBarrier({ x: 5, y: 0.5, z: 0 }, { x: 0.2, y: 1, z: 10 });
            createBarrier({ x: -5, y: 0.5, z: 0 }, { x: 0.2, y: 1, z: 10 });
        }

        const playerShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
        const playerBody = new CANNON.Body({ mass: 1, position: new CANNON.Vec3(0, 1, 0), shape: playerShape });
        world.addBody(playerBody);

        const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 'red' }));
        scene.add(playerMesh);

        const keyStates = {};
        window.addEventListener('keydown', (event) => { keyStates[event.code] = true; });
        window.addEventListener('keyup', (event) => { keyStates[event.code] = false; });

        const tick = () => {
            world.step(1 / 60);

            const moveSpeed = 100;

            if (keyStates['KeyW']) playerBody.applyForce(new CANNON.Vec3(0, 0, -moveSpeed), playerBody.position);
            if (keyStates['KeyS']) playerBody.applyForce(new CANNON.Vec3(0, 0, moveSpeed), playerBody.position);
            if (keyStates['KeyA']) playerBody.applyForce(new CANNON.Vec3(-moveSpeed, 0, 0), playerBody.position);
            if (keyStates['KeyD']) playerBody.applyForce(new CANNON.Vec3(moveSpeed, 0, 0), playerBody.position);

            playerBody.velocity.x *= 0.45;
            playerBody.velocity.z *= 0.45;

            playerMesh.position.copy(playerBody.position);
            playerMesh.quaternion.copy(playerBody.quaternion);

            controls.update();
            renderer.render(scene, camera);
            requestAnimationFrame(tick);
        };

        tick();

        return () => {
            gui.destroy();
            if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
        };
    }, [barriersEnabled]);

    return (
        <div>
            <button onClick={() => setBarriersEnabled(!barriersEnabled)}>
                {barriersEnabled ? 'Disable Barriers' : 'Enable Barriers'}
            </button>
            <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
        </div>
    );
};

export default Lab5;
