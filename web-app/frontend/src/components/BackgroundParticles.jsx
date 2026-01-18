import React, { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 140;
const DEPTH = 1200;
const SPEED = 0.35;
const FOV = 420;

const BackgroundParticles = () => {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const particlesRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const context = canvas.getContext('2d');
    if (!context) return undefined;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return undefined;
    }

    const resize = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
    };

    const initParticles = () => {
      const width = canvas.width;
      const height = canvas.height;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: (Math.random() - 0.5) * width,
        y: (Math.random() - 0.5) * height,
        z: Math.random() * DEPTH,
        radius: Math.random() * 2.4 + 0.6,
        hue: 265 + Math.random() * 30,
      }));
    };

    resize();
    initParticles();

    const render = (time = 0) => {
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'lighter';

      const centerX = width / 2;
      const centerY = height / 2;
      const tiltX = pointerRef.current.y * 0.0008;
      const tiltY = pointerRef.current.x * 0.0008;
      const spin = time * 0.0001;
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const cosY = Math.cos(tiltY + spin);
      const sinY = Math.sin(tiltY + spin);
      const lightX = Math.max(-1, Math.min(1, pointerRef.current.x / (width / 2)));
      const lightY = Math.max(-1, Math.min(1, pointerRef.current.y / (height / 2)));

      for (const particle of particlesRef.current) {
        particle.z -= SPEED;
        if (particle.z <= 1) {
          particle.z = DEPTH;
          particle.x = (Math.random() - 0.5) * width;
          particle.y = (Math.random() - 0.5) * height;
        }

        const x = particle.x;
        const y = particle.y;
        const z = particle.z - DEPTH / 2;

        const rotatedX = x * cosY + z * sinY;
        const rotatedZ = -x * sinY + z * cosY;
        const rotatedY = y * cosX - rotatedZ * sinX;
        const depthZ = y * sinX + rotatedZ * cosX + DEPTH / 2;

        const scale = FOV / (FOV + depthZ);
        const x2d = rotatedX * scale + centerX;
        const y2d = rotatedY * scale + centerY;

        const alpha = Math.min(1, Math.max(0.25, 1 - depthZ / DEPTH));
        const size = particle.radius * scale * 1.4;

        const highlightX = x2d - lightX * size * 0.6;
        const highlightY = y2d - lightY * size * 0.6;
        const gradient = context.createRadialGradient(
          highlightX,
          highlightY,
          size * 0.15,
          x2d,
          y2d,
          size,
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.9})`);
        gradient.addColorStop(0.35, `hsla(${particle.hue}, 80%, 75%, ${alpha * 0.85})`);
        gradient.addColorStop(1, `hsla(${particle.hue}, 70%, 55%, ${alpha * 0.2})`);

        context.beginPath();
        context.fillStyle = gradient;
        context.arc(x2d, y2d, size, 0, Math.PI * 2);
        context.fill();
      }

      frameRef.current = requestAnimationFrame(render);
    };

    const handlePointer = (event) => {
      const { innerWidth, innerHeight } = window;
      pointerRef.current = {
        x: event.clientX - innerWidth / 2,
        y: event.clientY - innerHeight / 2,
      };
    };

    frameRef.current = requestAnimationFrame(render);
    window.addEventListener('pointermove', handlePointer);
    window.addEventListener('resize', resize);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
      window.removeEventListener('pointermove', handlePointer);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
};

export default BackgroundParticles;
