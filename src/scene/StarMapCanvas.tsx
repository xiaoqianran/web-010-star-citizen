import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import bootup from "@capture/api/bootup.json";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel, sph } from "@/data/celestial";
import { AFFIL, glowSprite, nebulaTexture } from "./makeTextures";

export type ScreenPt = { x: number; y: number };

type Props = {
  bodies: CapturedBody[];
  systems: { id: number; code: string; name: string; position: number[]; affiliation: string[] }[];
  mode: "galaxy" | "system" | "object";
  view: "3d" | "2d";
  selected: CapturedBody | null;
  focusCode: string | null;
  onHover: (body: CapturedBody | null) => void;
  onSelect: (body: CapturedBody) => void;
  onProject: (pt: ScreenPt | null) => void;
};

const SCALE = 5.4;

const sunVert = `
  varying vec3 vN;
  void main() {
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const sunFrag = `
  uniform vec3 color1;
  uniform vec3 color2;
  uniform float time;
  varying vec3 vN;
  void main() {
    float fres = pow(1.0 - abs(vN.z), 1.35);
    float pulse = 0.92 + 0.08 * sin(time * 1.6);
    vec3 c = mix(color1, color2, fres) * pulse;
    gl_FragColor = vec4(c * 1.55, 1.0);
  }
`;

function rgb(s: string) {
  const m = s.match(/(\d+)/g);
  if (!m) return new THREE.Color("#fcba5b");
  return new THREE.Color(`rgb(${m[0]},${m[1]},${m[2]})`);
}

export function StarMapCanvas({
  bodies,
  systems,
  mode,
  view,
  selected,
  focusCode,
  onHover,
  onSelect,
  onProject,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setMode: (m: Props["mode"]) => void;
    setView: (v: Props["view"]) => void;
    select: (code: string | null) => void;
    focusSystem: (code: string) => void;
  } | null>(null);
  const projectRef = useRef(onProject);
  const hoverRef = useRef(onHover);
  const selectRef = useRef(onSelect);
  const selectedRef = useRef(selected);
  projectRef.current = onProject;
  hoverRef.current = onHover;
  selectRef.current = onSelect;
  selectedRef.current = selected;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00040a);
    scene.fog = new THREE.FogExp2(0x00040a, 0.008);

    const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 500);
    camera.position.set(3.8, 2.1, 10.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    el.appendChild(labels.domElement);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.42, 0.18);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2;
    controls.maxDistance = 60;
    controls.rotateSpeed = 0.52;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x142838, 0.9));
    const key = new THREE.PointLight(0xfcba5b, 55, 50);
    scene.add(key);

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(3200 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 220;
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8fb4cf, size: 0.1 })));

    const nebTex = nebulaTexture();
    const nebula = new THREE.Mesh(
      new THREE.SphereGeometry(90, 48, 48),
      new THREE.MeshBasicMaterial({
        map: nebTex,
        transparent: true,
        opacity: 0.55,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    scene.add(nebula);

    const glowA = glowSprite("#ffb056");
    const glowB = glowSprite("#42e6ff");

    const systemGroup = new THREE.Group();
    const galaxyGroup = new THREE.Group();
    scene.add(systemGroup, galaxyGroup);

    const pickables: { mesh: THREE.Object3D; body: CapturedBody }[] = [];
    const meshes = new Map<string, THREE.Object3D>();
    const sunMats: THREE.ShaderMaterial[] = [];

    for (let i = 1; i <= 8; i++) {
      const r = i * 1.15;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(r - 0.006, r + 0.006, 128),
        new THREE.MeshBasicMaterial({
          color: 0x0a8bb7,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.08 + (i % 2) * 0.04,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      systemGroup.add(ring);
    }

    for (const body of bodies) {
      const p = sph(body.distance, body.latitude, body.longitude, SCALE);
      const isStar = body.type === "STAR";
      const isPlanet = body.type === "PLANET";
      const isJump = body.type === "JUMPPOINT";
      const radius = isStar ? 0.38 : isPlanet ? 0.1 : 0.045;
      const group = new THREE.Group();
      group.position.set(p.x, p.y, p.z);
      group.userData.code = body.code;
      systemGroup.add(group);
      meshes.set(body.code, group);

      if (isStar) {
        const c1 = rgb(body.shader_data?.sun?.color1 || "rgb(205,166,77)");
        const c2 = rgb(body.shader_data?.sun?.color2 || "rgb(205,90,26)");
        const mat = new THREE.ShaderMaterial({
          uniforms: { color1: { value: c1 }, color2: { value: c2 }, time: { value: 0 } },
          vertexShader: sunVert,
          fragmentShader: sunFrag,
        });
        sunMats.push(mat);
        const core = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), mat);
        group.add(core);
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowA, color: 0xffc56a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        sprite.scale.set(3.6, 3.6, 1);
        group.add(sprite);
        if (body.code.endsWith("GOSSA")) key.position.copy(group.position);
      } else if (isPlanet) {
        const core = new THREE.Mesh(
          new THREE.SphereGeometry(radius, 28, 28),
          new THREE.MeshStandardMaterial({ color: 0x2fd6a8, emissive: 0x145a48, emissiveIntensity: 0.8 }),
        );
        group.add(core);
        const halo = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowB, color: 0x3ad6a2, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
        );
        halo.scale.set(0.7, 0.7, 1);
        group.add(halo);
      } else {
        const mark = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.06, 0),
          new THREE.MeshBasicMaterial({ color: 0x14e6fa }),
        );
        group.add(mark);
      }

      if (isPlanet && body.show_orbitlines) {
        const orbit = new THREE.Mesh(
          new THREE.RingGeometry(body.distance * SCALE - 0.012, body.distance * SCALE + 0.012, 160),
          new THREE.MeshBasicMaterial({
            color: 0x14e6fa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.28,
          }),
        );
        orbit.rotation.x = Math.PI / 2;
        systemGroup.add(orbit);
      }

      if (body.show_label) {
        const div = document.createElement("div");
        const kind = isStar ? "STAR" : isPlanet ? "PLANET" : "";
        div.className = `label3d ${isStar ? "star" : ""} ${isJump ? "jump" : ""}`;
        div.textContent = `${bodyLabel(body)}${kind ? ` ${kind}` : ""}`;
        const obj = new CSS2DObject(div);
        obj.position.set(0, radius + 0.14, 0);
        group.add(obj);
        group.userData.label = div;
      }
      pickables.push({ mesh: group, body });
    }

    const byId = new Map(systems.map((s) => [s.id, s]));
    const goss = systems.find((s) => s.code === "GOSS");
    const origin = goss?.position ?? [0, 0, 0];
    const galaxyMeshes = new Map<string, THREE.Object3D>();
    const galPos = (s: (typeof systems)[number]) =>
      new THREE.Vector3(
        (s.position[0] - origin[0]) * 0.2,
        (s.position[2] - origin[2]) * 0.2,
        (s.position[1] - origin[1]) * 0.2,
      );

    for (const sys of systems) {
      const color = AFFIL[sys.affiliation[0]] ?? 0x7acbff;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(sys.code === "GOSS" ? 0.18 : 0.07, 14, 14),
        new THREE.MeshBasicMaterial({ color }),
      );
      m.position.copy(galPos(sys));
      galaxyGroup.add(m);
      galaxyMeshes.set(sys.code, m);
      const near = ["GOSS", "TERRA", "HELIOS", "TAYAC", "TYROL", "OSIRIS", "STANTON", "PYRO"];
      if (near.includes(sys.code)) {
        const div = document.createElement("div");
        div.className = "label3d";
        div.textContent = sys.code;
        m.add(new CSS2DObject(div));
      }
    }

    const tunnels = (bootup as { data: { tunnels: { resultset: { entry: { star_system_id: number }; exit: { star_system_id: number } }[] } } })
      .data.tunnels.resultset;
    const linePos: number[] = [];
    for (const t of tunnels) {
      const a = byId.get(t.entry.star_system_id);
      const b = byId.get(t.exit.star_system_id);
      if (!a || !b) continue;
      const pa = galPos(a);
      const pb = galPos(b);
      linePos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
    galaxyGroup.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3a2018, transparent: true, opacity: 0.55 })));

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovering: CapturedBody | null = null;
    let fly: { t: number; fromC: THREE.Vector3; toC: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null =
      null;

    const startFly = (target: THREE.Vector3, offset: THREE.Vector3) => {
      fly = {
        t: 0,
        fromC: camera.position.clone(),
        toC: target.clone().add(offset),
        fromT: controls.target.clone(),
        toT: target.clone(),
      };
    };

    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(
        pickables.map((p) => p.mesh),
        true,
      )[0];
      const next = hit
        ? pickables.find((p) => p.mesh === hit.object || p.mesh.children.includes(hit.object))?.body ?? null
        : null;
      if (next?.code !== hovering?.code) {
        hovering = next;
        hoverRef.current(next);
        pickables.forEach((p) => p.mesh.userData.label?.classList.toggle("hover", p.body.code === next?.code));
      }
    };
    const onClick = () => {
      if (hovering) selectRef.current(hovering);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labels.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    };
    resize();

    const setMode = (m: Props["mode"]) => {
      systemGroup.visible = m !== "galaxy";
      galaxyGroup.visible = m === "galaxy";
      controls.minDistance = m === "galaxy" ? 8 : 2;
      if (m === "galaxy") startFly(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 10, 18));
      else startFly(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.8, 2.1, 10.4));
    };
    const setView = (v: Props["view"]) => {
      if (v === "2d") {
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = 0.08;
        startFly(controls.target.clone(), new THREE.Vector3(0.01, 12, 0.01));
      } else {
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
      }
    };

    api.current = {
      setMode,
      setView,
      select: (code) => {
        const item = meshes.get(code ?? "");
        if (!item) return;
        startFly(item.position.clone(), new THREE.Vector3(1.4, 0.7, 2.2));
      },
      focusSystem: (code) => {
        const m = galaxyMeshes.get(code);
        if (!m) return;
        systemGroup.visible = false;
        galaxyGroup.visible = true;
        startFly(m.position.clone(), new THREE.Vector3(1.2, 2.2, 4));
      },
    };
    setMode(mode);
    setView(view);

    const ndc = new THREE.Vector3();
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("click", onClick);
    window.addEventListener("resize", resize);

    let frame = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      frame = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      sunMats.forEach((m) => {
        m.uniforms.time.value = t;
      });
      nebula.rotation.y += 0.00012;
      if (fly) {
        fly.t = Math.min(1, fly.t + 0.028);
        const e = fly.t * fly.t * (3 - 2 * fly.t);
        camera.position.lerpVectors(fly.fromC, fly.toC, e);
        controls.target.lerpVectors(fly.fromT, fly.toT, e);
        if (fly.t >= 1) fly = null;
      }
      controls.update();
      composer.render();
      labels.render(scene, camera);

      const code = selectedRef.current?.code;
      const obj = code ? meshes.get(code) : hovering ? meshes.get(hovering.code) : null;
      if (obj) {
        ndc.copy(obj.position).project(camera);
        const r = el.getBoundingClientRect();
        projectRef.current({
          x: (ndc.x * 0.5 + 0.5) * r.width,
          y: (-ndc.y * 0.5 + 0.5) * r.height,
        });
      } else {
        projectRef.current(null);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("click", onClick);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
  }, [bodies, systems]);

  useEffect(() => {
    api.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    api.current?.setView(view);
  }, [view]);

  useEffect(() => {
    api.current?.select(selected?.code ?? null);
  }, [selected]);

  useEffect(() => {
    if (focusCode) api.current?.focusSystem(focusCode);
  }, [focusCode]);

  return <div className="canvas-host" ref={host} />;
}
