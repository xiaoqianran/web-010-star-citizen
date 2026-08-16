import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel, sph } from "@/data/celestial";

type Props = {
  bodies: CapturedBody[];
  systems: { code: string; name: string; position: number[]; affiliation: string[] }[];
  mode: "galaxy" | "system" | "object";
  selected: CapturedBody | null;
  onHover: (body: CapturedBody | null) => void;
  onSelect: (body: CapturedBody) => void;
};

const SCALE = 5.2;

export function StarMapCanvas({ bodies, systems, mode, selected, onHover, onSelect }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    select: (code: string | null) => void;
    setMode: (m: Props["mode"]) => void;
  } | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000508);
    scene.fog = new THREE.FogExp2(0x000508, 0.012);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
    camera.position.set(4.2, 2.4, 9.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    labels.domElement.style.position = "absolute";
    labels.domElement.style.inset = "0";
    labels.domElement.style.pointerEvents = "none";
    el.appendChild(labels.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.2;
    controls.maxDistance = 48;
    controls.rotateSpeed = 0.55;

    scene.add(new THREE.AmbientLight(0x1a3048, 1.2));
    const key = new THREE.PointLight(0xfcba5b, 40, 40);
    scene.add(key);

    const stars = new THREE.BufferGeometry();
    const starPos = new Float32Array(2400 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 180;
    stars.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        stars,
        new THREE.PointsMaterial({ color: 0x96b4cf, size: 0.12, transparent: true, opacity: 0.85 }),
      ),
    );

    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(70, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x3a1808,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
      }),
    );
    scene.add(nebula);

    const systemGroup = new THREE.Group();
    const galaxyGroup = new THREE.Group();
    scene.add(systemGroup, galaxyGroup);

    const pickables: { mesh: THREE.Object3D; body: CapturedBody }[] = [];
    const labelNodes = new Map<string, HTMLDivElement>();

    for (const body of bodies) {
      const p = sph(body.distance, body.latitude, body.longitude, SCALE);
      const isStar = body.type === "STAR";
      const isPlanet = body.type === "PLANET";
      const radius = isStar ? 0.42 : isPlanet ? 0.11 : 0.05;
      const color = isStar ? 0xfcba5b : isPlanet ? 0x3ad6a2 : 0x42cbf8;
      const mat = isStar
        ? new THREE.MeshBasicMaterial({ color })
        : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 32), mat);
      mesh.position.set(p.x, p.y, p.z);
      mesh.userData.code = body.code;
      systemGroup.add(mesh);
      if (isStar) {
        const glow = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 2.3, 24, 24),
          new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.18 }),
        );
        glow.position.copy(mesh.position);
        systemGroup.add(glow);
        if (body.code.endsWith("GOSSA")) key.position.copy(mesh.position);
      }
      if (isPlanet || body.show_orbitlines) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(body.distance * SCALE - 0.01, body.distance * SCALE + 0.01, 96),
          new THREE.MeshBasicMaterial({
            color: 0x14e6fa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.22,
          }),
        );
        ring.rotation.x = Math.PI / 2;
        systemGroup.add(ring);
      }
      if (body.show_label) {
        const div = document.createElement("div");
        div.className = `label3d ${isStar ? "star" : ""}`;
        div.textContent = `${bodyLabel(body)} ${isStar ? "STAR" : isPlanet ? "PLANET" : ""}`.trim();
        const obj = new CSS2DObject(div);
        obj.position.set(0, radius + 0.12, 0);
        mesh.add(obj);
        labelNodes.set(body.code, div);
      }
      if (isStar || isPlanet) pickables.push({ mesh, body });
    }

    const goss = systems.find((s) => s.code === "GOSS");
    const origin = goss?.position ?? [0, 0, 0];
    for (const sys of systems) {
      const dx = (sys.position[0] - origin[0]) * 0.18;
      const dy = (sys.position[2] - origin[2]) * 0.18;
      const dz = (sys.position[1] - origin[1]) * 0.18;
      const color = sys.code === "GOSS" ? 0x14e6fa : 0xff9a3c;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(sys.code === "GOSS" ? 0.16 : 0.08, 12, 12),
        new THREE.MeshBasicMaterial({ color }),
      );
      m.position.set(dx, dy, dz);
      galaxyGroup.add(m);
      const div = document.createElement("div");
      div.className = "label3d";
      div.textContent = sys.code;
      m.add(new CSS2DObject(div));
    }

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovering: CapturedBody | null = null;

    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(pickables.map((p) => p.mesh))[0];
      const next = hit ? pickables.find((p) => p.mesh === hit.object)?.body ?? null : null;
      if (next?.code !== hovering?.code) {
        hovering = next;
        onHover(next);
        labelNodes.forEach((node, code) => {
          node.classList.toggle("hover", code === next?.code);
        });
      }
    };
    const onClick = () => {
      if (hovering) onSelect(hovering);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labels.setSize(w, h);
    };
    resize();

    const setMode = (m: Props["mode"]) => {
      systemGroup.visible = m !== "galaxy";
      galaxyGroup.visible = m === "galaxy";
      controls.minDistance = m === "galaxy" ? 6 : 2.2;
      if (m === "galaxy") camera.position.set(0, 8, 16);
    };
    setMode(mode);

    api.current = {
      setMode,
      select: (code) => {
        const item = pickables.find((p) => p.body.code === code);
        if (!item) return;
        const t = item.mesh.position;
        controls.target.lerp(t, 1);
        camera.position.set(t.x + 1.6, t.y + 0.8, t.z + 2.4);
      },
    };

    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("click", onClick);
    window.addEventListener("resize", resize);

    let frame = 0;
    const tick = () => {
      frame = requestAnimationFrame(tick);
      nebula.rotation.y += 0.00015;
      controls.update();
      renderer.render(scene, camera);
      labels.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [bodies, systems, onHover, onSelect]);

  useEffect(() => {
    api.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    api.current?.select(selected?.code ?? null);
  }, [selected]);

  return <div className="canvas-host" ref={host} />;
}
