import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../core/context/ThemeContext';

export default function Login3DScene({ mousePos = { x: 0, y: 0 } }) {
    const mountRef = useRef(null);
    const { isDark } = useTheme();

    useEffect(() => {
        const container = mountRef.current;
        if (!container) return;

        // Scene, Camera, Renderer
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(
            55,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 24;

        const renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // Theme colors
        const primaryColor = isDark ? 0x13ec6d : 0x059669;
        const secondaryColor = isDark ? 0x00f0ff : 0x0284c7;
        const particleColor = isDark ? 0xa7f3d0 : 0x10b981;

        // Group containing all 3D objects
        const mainGroup = new THREE.Group();
        scene.add(mainGroup);

        // 1. Core Polyhedron (Icosahedron wireframe + inner glowing sphere)
        const coreGeo = new THREE.IcosahedronGeometry(5.2, 1);
        const wireMat = new THREE.MeshBasicMaterial({
            color: primaryColor,
            wireframe: true,
            transparent: true,
            opacity: isDark ? 0.45 : 0.65
        });
        const coreMesh = new THREE.Mesh(coreGeo, wireMat);
        mainGroup.add(coreMesh);

        // Inner glowing solid octahedron
        const innerGeo = new THREE.OctahedronGeometry(2.8, 0);
        const innerMat = new THREE.MeshBasicMaterial({
            color: secondaryColor,
            wireframe: true,
            transparent: true,
            opacity: isDark ? 0.6 : 0.75
        });
        const innerMesh = new THREE.Mesh(innerGeo, innerMat);
        mainGroup.add(innerMesh);

        // 2. Concentric Orbiting Holographic Rings
        const ringGeo1 = new THREE.TorusGeometry(8.5, 0.05, 16, 100);
        const ringMat1 = new THREE.MeshBasicMaterial({
            color: secondaryColor,
            transparent: true,
            opacity: isDark ? 0.35 : 0.5
        });
        const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
        ring1.rotation.x = Math.PI / 3;
        mainGroup.add(ring1);

        const ringGeo2 = new THREE.TorusGeometry(10.2, 0.04, 16, 100);
        const ringMat2 = new THREE.MeshBasicMaterial({
            color: primaryColor,
            transparent: true,
            opacity: isDark ? 0.25 : 0.4
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.y = Math.PI / 4;
        mainGroup.add(ring2);

        // 3. Floating Particle Constellation (Skill Nodes)
        const particleCount = 200;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const radius = 6 + Math.random() * 16;
            const theta = THREE.MathUtils.randFloatSpread(360);
            const phi = THREE.MathUtils.randFloatSpread(360);

            positions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
            positions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
            positions[i * 3 + 2] = radius * Math.cos(theta);
            scales[i] = Math.random() * 2 + 1;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

        const particleMat = new THREE.PointsMaterial({
            color: particleColor,
            size: 0.25,
            transparent: true,
            opacity: isDark ? 0.75 : 0.85,
            blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending
        });

        const particles = new THREE.Points(particleGeo, particleMat);
        mainGroup.add(particles);

        // Resize Observer
        const handleResize = () => {
            if (!container) return;
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        // Animation Loop
        let animationFrameId;
        let clock = new THREE.Clock();

        let targetRotX = 0;
        let targetRotY = 0;

        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();

            // Constant organic rotations
            coreMesh.rotation.x = elapsedTime * 0.18;
            coreMesh.rotation.y = elapsedTime * 0.25;

            innerMesh.rotation.x = -elapsedTime * 0.35;
            innerMesh.rotation.z = elapsedTime * 0.28;

            ring1.rotation.z = elapsedTime * 0.15;
            ring2.rotation.x = elapsedTime * 0.12;

            particles.rotation.y = elapsedTime * 0.05;

            // Parallax mouse follow
            targetRotX = mousePos.y * 0.6;
            targetRotY = mousePos.x * 0.8;

            mainGroup.rotation.x += (targetRotX - mainGroup.rotation.x) * 0.05;
            mainGroup.rotation.y += (targetRotY - mainGroup.rotation.y) * 0.05;

            // Floating gentle bobbing
            mainGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.4;

            renderer.render(scene, camera);
        };

        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }

            // Dispose geometries and materials
            coreGeo.dispose();
            wireMat.dispose();
            innerGeo.dispose();
            innerMat.dispose();
            ringGeo1.dispose();
            ringMat1.dispose();
            ringGeo2.dispose();
            ringMat2.dispose();
            particleGeo.dispose();
            particleMat.dispose();
            renderer.dispose();
        };
    }, [isDark, mousePos.x, mousePos.y]);

    return (
        <div 
            ref={mountRef} 
            className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
            aria-hidden="true"
        />
    );
}
