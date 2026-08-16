import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { CameraTuple, Level } from "@/data/cameraUrl";
import { cameraToPose, formatCamera, poseToCamera } from "@/data/cameraUrl";
import type { CapturedBody } from "@/data/celestial";
import { bodyLabel, placeBodies, systemScale } from "@/data/celestial";
import type { SystemRow } from "@/data/catalog";
import { tunnels } from "@/data/catalog";
import { AFFIL, PLANET, glowSprite, gridSprite, nebulaTexture } from "./makeTextures";

export type ScreenPt = { x: number; y: number };

export type DisplayState = {
  affiliations: Record<string, boolean>;
  tunnels: { S: boolean; M: boolean; L: boolean };
  scanners: { lifeforms: boolean; economy: boolean; crime: boolean };
};

type Props = {
  bodies: CapturedBody[];
  systems: SystemRow[];
  mode: Level;
  view: "3d" | "2d";
  selected: CapturedBody | null;
  focusCode: string | null;
  currentSystem: string;
  display: DisplayState;
  routeSystems: string[];
  camera: CameraTuple;
  lookNonce?: number;
  inspectNonce?: number;
  onHover: (body: CapturedBody | null) => void;
  onSelect: (body: CapturedBody) => void;
  onSelectSystem: (code: string) => void;
  onBackground?: () => void;
  onContext?: (hit: { body?: CapturedBody; system?: string } | null, x: number, y: number) => void;
  onProject: (pt: ScreenPt | null) => void;
  onCamera: (c: CameraTuple) => void;
};

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
  if (!m) return new THREE.Color(s.startsWith("#") ? s : "#fcba5b");
  return new THREE.Color(`rgb(${m[0]},${m[1]},${m[2]})`);
}

function walkPick(obj: THREE.Object3D | null, meshes: Map<string, THREE.Object3D>) {
  while (obj) {
    const code = obj.userData.code as string | undefined;
    if (code && meshes.has(code)) return code;
    obj = obj.parent;
  }
  return null;
}

export function StarMapCanvas({
  bodies,
  systems,
  mode,
  view,
  selected,
  focusCode,
  currentSystem,
  display,
  routeSystems,
  camera,
  lookNonce = 0,
  inspectNonce = 0,
  onHover,
  onSelect,
  onSelectSystem,
  onBackground,
  onContext,
  onProject,
  onCamera,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<{
    setMode: (m: Level) => void;
    setView: (v: "3d" | "2d") => void;
    select: (code: string | null) => void;
    focusSystem: (code: string) => void;
    rebuild: (bodies: CapturedBody[]) => void;
    applyDisplay: (d: DisplayState, route: string[]) => void;
    applyCamera: (c: CameraTuple, m: Level) => void;
    resetHome: () => void;
    nudge: (az: number, el: number, zoom: number) => void;
  } | null>(null);
  const projectRef = useRef(onProject);
  const hoverRef = useRef(onHover);
  const selectRef = useRef(onSelect);
  const selectSysRef = useRef(onSelectSystem);
  const backgroundRef = useRef(onBackground);
  const contextRef = useRef(onContext);
  const camRef = useRef(onCamera);
  const selectedRef = useRef(selected);
  const modeRef = useRef(mode);
  projectRef.current = onProject;
  hoverRef.current = onHover;
  selectRef.current = onSelect;
  selectSysRef.current = onSelectSystem;
  backgroundRef.current = onBackground;
  contextRef.current = onContext;
  camRef.current = onCamera;
  selectedRef.current = selected;
  modeRef.current = mode;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x00040a);
    scene.fog = new THREE.FogExp2(0x00040a, 0.008);

    const cam = new THREE.PerspectiveCamera(48, 1, 0.05, 800);
    cam.position.set(3.8, 2.1, 10.4);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        stencil: false,
        powerPreference: "default",
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      el.classList.add("canvas-fail");
      el.textContent = "当前浏览器似乎不支持 WebGL。";
      return;
    }
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "") : "";
    const weak = (navigator.hardwareConcurrency || 8) <= 4 || /SwiftShader|llvmpipe|software/i.test(gpu);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, weak ? 1 : 1.75));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const labels = new CSS2DRenderer();
    Object.assign(labels.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
    el.appendChild(labels.domElement);

    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, cam));
      bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), weak ? 0.45 : 0.85, 0.42, 0.18);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch {
      composer = null;
      bloom = null;
    }

    const controls = new OrbitControls(cam, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 2;
    controls.maxDistance = 80;
    controls.rotateSpeed = 0.52;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.touches.ONE = THREE.TOUCH.ROTATE;
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
    const glowR = glowSprite("#ff6b4a");
    const heatGrid = gridSprite("#9be80d");

    const systemGroup = new THREE.Group();
    const galaxyGroup = new THREE.Group();
    scene.add(systemGroup, galaxyGroup);

    const pickables: { mesh: THREE.Object3D; body: CapturedBody }[] = [];
    const meshes = new Map<string, THREE.Object3D>();
    const sunMats: THREE.ShaderMaterial[] = [];

    const GAL = 0.18;
    const galPos = (s: SystemRow) => new THREE.Vector3(s.position[0] * GAL, s.position[2] * GAL, s.position[1] * GAL);
    const galaxyMeshes = new Map<string, THREE.Mesh>();
    const galaxyHits: THREE.Object3D[] = [];
    const galHitMat = new THREE.MeshBasicMaterial({ visible: false });
    const heatSprites = new Map<string, THREE.Sprite>();

    for (const sys of systems) {
      const color = AFFIL[sys.affiliation[0]] ?? 0x7acbff;
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 14, 14),
        new THREE.MeshBasicMaterial({ color }),
      );
      m.position.copy(galPos(sys));
      m.userData.system = sys.code;
      m.userData.affil = sys.affiliation[0] || "uee";
      galaxyGroup.add(m);
      galaxyMeshes.set(sys.code, m);
      const galHit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), galHitMat);
      galHit.position.copy(m.position);
      galHit.userData.system = sys.code;
      galaxyGroup.add(galHit);
      galaxyHits.push(galHit);
      m.userData.hit = galHit;
      const near = ["GOSS", "TERRA", "HELIOS", "TAYAC", "TYROL", "OSIRIS", "STANTON", "PYRO", "SOL", "TAMSA", "NYX"];
      if (near.includes(sys.code)) {
        const div = document.createElement("div");
        div.className = "label3d";
        div.textContent = sys.code;
        m.add(new CSS2DObject(div));
      }
      const heat = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: heatGrid,
          color: 0x9be80d,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      heat.position.copy(m.position);
      heat.scale.set(0.01, 0.01, 1);
      galaxyGroup.add(heat);
      heatSprites.set(sys.code, heat);
    }

    const tunnelLines = new THREE.Group();
    galaxyGroup.add(tunnelLines);
    const byCode = new Map(systems.map((s) => [s.code, s]));
    const rebuildTunnels = (d: DisplayState, route: string[]) => {
      tunnelLines.clear();
      const linePos: number[] = [];
      const routePos: number[] = [];
      const routeSet = new Set(route);
      for (const t of tunnels) {
        if (!d.tunnels[t.size]) continue;
        const a = byCode.get(t.from);
        const b = byCode.get(t.to);
        if (!a || !b) continue;
        const visA = d.affiliations[a.affiliation[0] || "uee"] !== false;
        const visB = d.affiliations[b.affiliation[0] || "uee"] !== false;
        if (!visA || !visB) continue;
        const pa = galPos(a);
        const pb = galPos(b);
        const onRoute = routeSet.has(t.from) && routeSet.has(t.to);
        if (onRoute) routePos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
        else linePos.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
      }
      if (linePos.length) {
        const lg = new THREE.BufferGeometry();
        lg.setAttribute("position", new THREE.Float32BufferAttribute(linePos, 3));
        tunnelLines.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x3a2018, transparent: true, opacity: 0.55 })));
      }
      if (routePos.length) {
        const rg = new THREE.BufferGeometry();
        rg.setAttribute("position", new THREE.Float32BufferAttribute(routePos, 3));
        tunnelLines.add(new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0x14e6fa, transparent: true, opacity: 0.95 })));
      }
    };

    const applyDisplay = (d: DisplayState, route: string[]) => {
      for (const sys of systems) {
        const m = galaxyMeshes.get(sys.code);
        const heat = heatSprites.get(sys.code);
        if (!m || !heat) continue;
        const aff = sys.affiliation[0] || "uee";
        m.visible = d.affiliations[aff] !== false;
        const extra = m.userData.hit as THREE.Object3D | undefined;
        if (extra) extra.visible = m.visible;
        const scan = d.scanners;
        const active = scan.lifeforms || scan.economy || scan.crime;
        heat.visible = m.visible && active;
        if (!active) continue;
        const value = scan.crime ? sys.danger : scan.economy ? sys.economy : sys.population;
        const color = scan.crime ? 0xed7346 : scan.economy ? 0xefc22f : 0x9be80d;
        (heat.material as THREE.SpriteMaterial).color.setHex(color);
        (heat.material as THREE.SpriteMaterial).opacity = 0.25 + Math.min(1, value / 10) * 0.7;
        const s = 0.8 + Math.min(1, value / 10) * 3.2;
        heat.scale.set(s, s, 1);
      }
      rebuildTunnels(d, route);
    };

    const invisible = new THREE.MeshBasicMaterial({ visible: false });

    const dropLabels = (root: THREE.Object3D) => {
      root.traverse((obj) => {
        const el = (obj as { element?: HTMLElement }).element;
        if (el) el.remove();
      });
    };

    const rebuild = (next: CapturedBody[]) => {
      dropLabels(systemGroup);
      systemGroup.clear();
      pickables.length = 0;
      meshes.clear();
      sunMats.length = 0;
      const scale = systemScale(next);
      const placed = placeBodies(next, scale);

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

      for (const body of next) {
        const p = placed.get(body.id) ?? { x: 0, y: 0, z: 0 };
        const isStar = body.type === "STAR";
        const isPlanet = body.type === "PLANET";
        const isJump = body.type === "JUMPPOINT";
        const isMoon = body.type === "SATELLITE";
        const isStation = body.type === "MANMADE";
        const isBelt = body.type === "ASTEROID_BELT" || body.type === "ASTEROID_FIELD";
        const isHole = body.type === "BLACKHOLE";
        const isPoi = body.type === "POI";
        const radius = isStar || isHole ? 0.38 : isPlanet ? 0.1 : isMoon ? 0.045 : 0.04;
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
          group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 48), mat));
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowA, color: 0xffc56a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          sprite.scale.set(3.6, 3.6, 1);
          group.add(sprite);
          if (body.code.includes("GOSSA") || isStar) key.position.copy(group.position);
        } else if (isHole) {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 32, 32), new THREE.MeshBasicMaterial({ color: 0x050308 })));
          const disk = new THREE.Mesh(
            new THREE.RingGeometry(0.34, 0.72, 64),
            new THREE.MeshBasicMaterial({ color: 0x9898f2, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
          );
          disk.rotation.x = Math.PI / 2.4;
          group.add(disk);
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowR, color: 0x9898f2, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          sprite.scale.set(2.8, 2.8, 1);
          group.add(sprite);
        } else if (isPlanet) {
          const col = PLANET[body.appearance || "DEFAULT"] ?? 0x6a8aaa;
          group.add(
            new THREE.Mesh(
              new THREE.SphereGeometry(radius, 28, 28),
              new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.35 }),
            ),
          );
          const halo = new THREE.Sprite(
            new THREE.SpriteMaterial({ map: glowB, color: col, transparent: true, opacity: 0.65, depthWrite: false, blending: THREE.AdditiveBlending }),
          );
          halo.scale.set(0.7, 0.7, 1);
          group.add(halo);
        } else if (isMoon) {
          group.add(new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), new THREE.MeshStandardMaterial({ color: 0x9aa7b4, roughness: 0.8 })));
        } else if (isStation) {
          group.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.12), new THREE.MeshBasicMaterial({ color: 0xefc22f })));
        } else if (isBelt) {
          const beltR = Math.hypot(p.x, p.z) || body.distance || 2;
          const belt = new THREE.Mesh(
            new THREE.RingGeometry(beltR - 0.18, beltR + 0.18, 96),
            new THREE.MeshBasicMaterial({ color: 0x8a6a44, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }),
          );
          belt.rotation.x = Math.PI / 2;
          belt.position.set(0, 0, 0);
          systemGroup.add(belt);
        } else if (isPoi || body.type === "LZ") {
          const col = body.appearance === "WARNING_RED" ? 0xff4444 : 0x14e6fa;
          group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshBasicMaterial({ color: col })));
        } else {
          group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), new THREE.MeshBasicMaterial({ color: 0x14e6fa })));
        }

        const hit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), invisible);
        group.add(hit);

        if (isPlanet && body.show_orbitlines) {
          const orbitR = Math.hypot(p.x, p.z) || 1;
          const orbit = new THREE.Mesh(
            new THREE.RingGeometry(orbitR - 0.012, orbitR + 0.012, 160),
            new THREE.MeshBasicMaterial({ color: 0x14e6fa, side: THREE.DoubleSide, transparent: true, opacity: 0.28 }),
          );
          orbit.rotation.x = Math.PI / 2;
          systemGroup.add(orbit);
        }

        if (body.show_label || isStar || isPlanet || isJump || isHole || isStation || body.type === "LZ") {
          const div = document.createElement("div");
          const kind = isStar ? "STAR" : isPlanet ? "PLANET" : isHole ? "BLACKHOLE" : isStation ? "STATION" : isMoon ? "MOON" : body.type === "LZ" ? "LZ" : "";
          div.className = `label3d ${isStar || isHole ? "star" : ""} ${isJump ? "jump" : ""} ${isPoi ? "poi" : ""}`;
          div.textContent = `${bodyLabel(body)}${kind ? ` ${kind}` : ""}`;
          const obj = new CSS2DObject(div);
          obj.position.set(0, radius + 0.14, 0);
          group.add(obj);
          group.userData.label = div;
        }
        pickables.push({ mesh: group, body });
      }
    };

    let fly: { t: number; fromC: THREE.Vector3; toC: THREE.Vector3; fromT: THREE.Vector3; toT: THREE.Vector3 } | null = null;
    const startFly = (target: THREE.Vector3, offset: THREE.Vector3) => {
      fly = {
        t: 0,
        fromC: cam.position.clone(),
        toC: target.clone().add(offset),
        fromT: controls.target.clone(),
        toT: target.clone(),
      };
    };

    const setMode = (m: Level) => {
      systemGroup.visible = m !== "galaxy";
      galaxyGroup.visible = m === "galaxy";
      systemGroup.traverse((obj) => {
        const el = (obj as { element?: HTMLElement }).element;
        if (el) el.style.display = m === "galaxy" ? "none" : "";
      });
      galaxyGroup.traverse((obj) => {
        const el = (obj as { element?: HTMLElement }).element;
        if (el) el.style.display = m === "galaxy" ? "" : "none";
      });
      controls.minDistance = m === "galaxy" ? 8 : 2;
      const here = galaxyMeshes.get(currentSystem);
      if (m === "galaxy") {
        const t = here?.position.clone() ?? new THREE.Vector3(0, 0, 0);
        startFly(t, new THREE.Vector3(0, 10, 18));
      } else {
        startFly(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3.8, 2.1, 10.4));
      }
    };
    const setView = (v: "3d" | "2d") => {
      if (v === "2d") {
        controls.enablePan = true;
        controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
        controls.touches.ONE = THREE.TOUCH.PAN;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = 0.08;
        startFly(controls.target.clone(), new THREE.Vector3(0.01, 14, 0.01));
      } else {
        controls.enablePan = false;
        controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
        controls.touches.ONE = THREE.TOUCH.ROTATE;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
      }
    };

    const applyCamera = (tuple: CameraTuple, m: Level) => {
      const pose = cameraToPose(tuple, m);
      cam.position.set(pose.position.x, pose.position.y, pose.position.z);
      controls.target.set(pose.target.x, pose.target.y, pose.target.z);
      fly = null;
    };

    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovering: CapturedBody | null = null;
    let hoverSys: string | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.buttons) drag = Math.hypot(e.clientX - downX, e.clientY - downY);
      const r = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      ray.setFromCamera(pointer, cam);
      if (modeRef.current === "galaxy") {
        const hit = ray.intersectObjects(galaxyHits, false)[0];
        hoverSys = hit ? ((hit.object.userData.system as string) ?? null) : null;
        hovering = null;
        hoverRef.current(null);
        return;
      }
      const hit = ray.intersectObjects(
        pickables.map((p) => p.mesh),
        true,
      )[0];
      const code = hit ? walkPick(hit.object, meshes) : null;
      const next = code ? (pickables.find((p) => p.body.code === code)?.body ?? null) : null;
      if (next?.code !== hovering?.code) {
        hovering = next;
        hoverRef.current(next);
        pickables.forEach((p) => p.mesh.userData.label?.classList.toggle("hover", p.body.code === next?.code));
      }
    };
    let drag = 0;
    let downX = 0;
    let downY = 0;
    const onDown = (e: PointerEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
        active.blur();
      }
      drag = 0;
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClick = () => {
      if (drag > 8) return;
      if (modeRef.current === "galaxy" && hoverSys) {
        selectSysRef.current(hoverSys);
        return;
      }
      if (hovering) {
        selectRef.current(hovering);
        return;
      }
      backgroundRef.current?.();
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (drag > 6) return;
      if (modeRef.current === "galaxy") {
        contextRef.current?.(hoverSys ? { system: hoverSys } : null, e.clientX, e.clientY);
        return;
      }
      contextRef.current?.(hovering ? { body: hovering } : null, e.clientX, e.clientY);
    };

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 2 || h < 2) return;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      labels.setSize(w, h);
      composer?.setSize(w, h);
      bloom?.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);

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
      rebuild,
      applyDisplay,
      applyCamera,
      resetHome: () => {
        const galaxy = modeRef.current === "galaxy";
        const home: CameraTuple = galaxy ? [10, 0, 0.4, 0, 0] : [10, 102.98, 0.002, 0, 0];
        applyCamera(home, galaxy ? "galaxy" : "system");
        camRef.current(home);
      },
      nudge: (az, el, zoom) => {
        const sph = new THREE.Spherical().setFromVector3(cam.position.clone().sub(controls.target));
        sph.theta += az;
        sph.phi = Math.min(Math.PI - 0.05, Math.max(0.05, sph.phi + el));
        sph.radius = Math.min(controls.maxDistance, Math.max(controls.minDistance, sph.radius * zoom));
        cam.position.copy(new THREE.Vector3().setFromSpherical(sph).add(controls.target));
        camRef.current(poseToCamera(cam.position, controls.target, modeRef.current));
      },
    };
    rebuild(bodies);
    applyDisplay(display, routeSystems);
    systemGroup.visible = mode !== "galaxy";
    galaxyGroup.visible = mode === "galaxy";
    controls.minDistance = mode === "galaxy" ? 8 : 2;
    if (view === "2d") {
      controls.enablePan = true;
      controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      controls.touches.ONE = THREE.TOUCH.PAN;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = 0.08;
    }
    applyCamera(camera, mode);

    const ndc = new THREE.Vector3();
    let lastEmit = 0;
    let lastCamKey = "";
    let lastPx = 1e9;
    let lastPy = 1e9;
    const emitCam = () => {
      const now = performance.now();
      if (now - lastEmit < 180) return;
      lastEmit = now;
      const next = poseToCamera(cam.position, controls.target, modeRef.current);
      const key = formatCamera(next);
      if (key === lastCamKey) return;
      lastCamKey = key;
      camRef.current(next);
    };
    controls.addEventListener("change", emitCam);

    const onLost = (e: Event) => {
      e.preventDefault();
      el.classList.add("canvas-fail");
      el.textContent = "当前浏览器似乎不支持 WebGL。";
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);
    renderer.domElement.addEventListener("webglcontextlost", onLost);
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
        cam.position.lerpVectors(fly.fromC, fly.toC, e);
        controls.target.lerpVectors(fly.fromT, fly.toT, e);
        if (fly.t >= 1) fly = null;
      }
      controls.update();
      if (composer) composer.render();
      else renderer.render(scene, cam);
      labels.render(scene, cam);

      const code = selectedRef.current?.code;
      const obj = code ? meshes.get(code) : hovering ? meshes.get(hovering.code) : null;
      if (obj) {
        ndc.copy(obj.position).project(cam);
        const r = el.getBoundingClientRect();
        const x = (ndc.x * 0.5 + 0.5) * r.width;
        const y = (-ndc.y * 0.5 + 0.5) * r.height;
        if (Math.abs(x - lastPx) > 0.6 || Math.abs(y - lastPy) > 0.6) {
          lastPx = x;
          lastPy = y;
          projectRef.current({ x, y });
        }
      } else if (lastPx < 1e8) {
        lastPx = 1e9;
        lastPy = 1e9;
        projectRef.current(null);
      }
    };
    tick();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      renderer.domElement.removeEventListener("webglcontextlost", onLost);
      controls.dispose();
      composer?.dispose();
      renderer.dispose();
      el.replaceChildren();
    };
    // scene is created once; later props go through api
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const boot = useRef(true);

  useEffect(() => {
    api.current?.rebuild(bodies);
  }, [bodies]);

  useEffect(() => {
    if (boot.current) return;
    api.current?.setMode(mode);
  }, [mode]);

  useEffect(() => {
    if (boot.current) return;
    api.current?.setView(view);
  }, [view]);

  useEffect(() => {
    if (boot.current) {
      boot.current = false;
      return;
    }
    api.current?.select(selected?.code ?? null);
  }, [selected]);

  useEffect(() => {
    if (focusCode) api.current?.focusSystem(focusCode);
  }, [focusCode]);

  useEffect(() => {
    api.current?.applyDisplay(display, routeSystems);
  }, [display, routeSystems]);

  useEffect(() => {
    if (!lookNonce) return;
    api.current?.resetHome();
  }, [lookNonce]);

  useEffect(() => {
    if (!inspectNonce) return;
    if (selected?.code) api.current?.select(selected.code);
  }, [inspectNonce, selected]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      const k = e.key.toLowerCase();
      if (k === "a" || k === "arrowleft") api.current?.nudge(-0.08, 0, 1);
      if (k === "d" || k === "arrowright") api.current?.nudge(0.08, 0, 1);
      if (k === "w" || k === "arrowup") api.current?.nudge(0, -0.05, 1);
      if (k === "s" || k === "arrowdown") api.current?.nudge(0, 0.05, 1);
      if (k === "+" || k === "=") api.current?.nudge(0, 0, 0.88);
      if (k === "-" || k === "_") api.current?.nudge(0, 0, 1.14);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return <div className="canvas-host" ref={host} />;
}
