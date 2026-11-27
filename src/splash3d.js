/* ---------- 시작 화면 3D: 비 내리는 밤거리를 천천히 날아가는 카메라 (Three.js r149) ----------
 * - 양옆 빌딩(창문 불빛), 가로등, 젖은 도로 반사, 안개, 비, 거리 끝 하늘의 균열(보랏빛 번쩍임)
 * - 빌딩과 가로등은 카메라 뒤로 지나가면 앞쪽으로 다시 옮겨 끝없는 거리를 만든다
 * - WebGL 이나 라이브러리를 못 쓰면 false 를 돌려주고, 호출한 쪽이 2D 그림으로 대신한다
 */
function startSplash3D(canvas, isStarted) {
  const T = window.THREE;
  if (!T) return false;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' }); }
  catch (e) { return false; }   // WebGL 을 못 쓰는 기기
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = T.sRGBEncoding;

  const scene = new T.Scene();
  scene.background = new T.Color(0x0a0c14);
  scene.fog = new T.FogExp2(0x0d1020, 0.026);
  const cam = new T.PerspectiveCamera(62, 1, 0.1, 260);
  cam.position.set(0, 5.5, 0);

  scene.add(new T.HemisphereLight(0x3a4a7a, 0x05060a, 0.55));

  /* 창문 무늬 텍스처 (몇 가지를 미리 만들어 빌딩마다 골라 씀) */
  const rnd = seeded(77231);
  function windowTex() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#000'; g2.fillRect(0, 0, 64, 128);
    for (let y = 4; y < 124; y += 10) for (let x = 4; x < 60; x += 10) {
      const r = rnd();
      if (r > 0.82) { g2.fillStyle = r > 0.97 ? '#7ad0ff' : r > 0.9 ? '#ffd08a' : '#e0a060'; g2.fillRect(x, y, 5, 6); }
    }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping;
    return t;
  }
  const wins = Array.from({ length: 5 }, windowTex);
  const bodyMat = wins.map(w => new T.MeshStandardMaterial({ color: 0x0b0e16, roughness: 0.9, metalness: 0.1, emissive: 0xffffff, emissiveMap: w, emissiveIntensity: 1.25 }));

  /* 젖은 도로와 인도: 반질반질해서 가로등과 균열 빛이 비침 */
  const road = new T.Mesh(new T.PlaneGeometry(16, 600), new T.MeshStandardMaterial({ color: 0x0c0f16, roughness: 0.16, metalness: 0.85 }));
  road.rotation.x = -Math.PI / 2; road.position.z = -280; scene.add(road);
  const walkMat = new T.MeshStandardMaterial({ color: 0x141824, roughness: 0.5, metalness: 0.4 });
  for (const sx of [-1, 1]) { const w = new T.Mesh(new T.BoxGeometry(5, 0.3, 600), walkMat); w.position.set(sx * 10.5, 0.15, -280); scene.add(w); }

  /* 빌딩: 양쪽 줄, 앞에서부터 깊이 260 까지 */
  const SPAN = 260, buildings = [];
  const boxGeo = new T.BoxGeometry(1, 1, 1);
  for (const side of [-1, 1]) {
    for (let z = 0; z > -SPAN; ) {
      const d = 6 + rnd() * 8, w = 6 + rnd() * 6, h = 10 + rnd() * 34;
      const m = new T.Mesh(boxGeo, bodyMat[Math.floor(rnd() * bodyMat.length)]);
      m.scale.set(w, h, d); m.position.set(side * (13 + w / 2 + rnd() * 2), h / 2, z - d / 2);
      scene.add(m); buildings.push(m); z -= d + 0.6;
    }
  }

  /* 가로등: 기둥 + 등불 + 따뜻한 빛 (빛은 개수를 줄여 가볍게) */
  const lamps = [], LAMP_GAP = 26;
  const poleGeo = new T.CylinderGeometry(0.12, 0.12, 6, 6), poleMat = new T.MeshStandardMaterial({ color: 0x15151c, roughness: 0.6 });
  const bulbMat = new T.MeshBasicMaterial({ color: 0xffd58a });
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1, grp = new T.Group();
    const pole = new T.Mesh(poleGeo, poleMat); pole.position.y = 3; grp.add(pole);
    const bulb = new T.Mesh(new T.SphereGeometry(0.32, 8, 6), bulbMat); bulb.position.set(-side * 0.6, 6, 0); grp.add(bulb);
    // 휴대폰 부담을 줄이려고 빛은 가로등 두 개 중 하나에만 (나머지는 등불 모양만)
    if (i % 2 === 0) { const light = new T.PointLight(0xffb866, 2, 26, 2); light.position.set(-side * 0.6, 5.7, 0); grp.add(light); }
    grp.position.set(side * 8.6, 0, -8 - i * LAMP_GAP / 2); scene.add(grp); lamps.push(grp);
  }

  /* 거리 끝 지평선의 균열: 땅에서 솟은 들쭉날쭉한 세로 틈 + 둥근 번짐 + 도로를 물들이는 보랏빛
   * (하늘까지 올리면 로고와 글자를 가로지르므로 지평선 근처에만 둠) */
  const riftGrp = new T.Group(); riftGrp.position.set(0, 0, -150); scene.add(riftGrp);
  const pts = []; for (let i = 0; i <= 10; i++) pts.push(new T.Vector3((i ? (rnd() - 0.5) * 1.4 : 0), i * 1.15, 0));
  const riftCurve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  const riftCore = new T.Mesh(new T.TubeGeometry(riftCurve, 60, 0.14, 6, false), new T.MeshBasicMaterial({ color: 0xf1e8ff, fog: false }));
  const riftAura = new T.Mesh(new T.TubeGeometry(riftCurve, 60, 0.55, 8, false), new T.MeshBasicMaterial({ color: 0x9a70ff, transparent: true, opacity: 0.45, fog: false, blending: T.AdditiveBlending, depthWrite: false }));
  riftGrp.add(riftCore, riftAura);
  const gc = document.createElement('canvas'); gc.width = gc.height = 128;
  { const g2 = gc.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(170,130,255,.9)'); gr.addColorStop(1, 'rgba(170,130,255,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128); }
  const halo = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(gc), blending: T.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  halo.scale.set(26, 30, 1); halo.position.set(0, 6, -2); riftGrp.add(halo);
  const riftLight = new T.PointLight(0x9a70ff, 3, 150, 1.6); riftLight.position.set(0, 5, 10); riftGrp.add(riftLight);

  /* 비: 짧은 선분 여러 개 (카메라 주변 상자 안에서 떨어지고 다시 위로) */
  const N = 1400, rainPos = new Float32Array(N * 6), rainGeo = new T.BufferGeometry();
  const drops = [];
  for (let i = 0; i < N; i++) drops.push({ x: (rnd() - 0.5) * 40, y: rnd() * 30, z: -rnd() * 70, v: 22 + rnd() * 10 });
  rainGeo.setAttribute('position', new T.BufferAttribute(rainPos, 3));
  const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: 0xb8c6f0, transparent: true, opacity: 0.32 }));
  scene.add(rain);

  function resize() {
    const w = canvas.clientWidth || 360, h = canvas.clientHeight || 640;
    renderer.setSize(w, h, false); cam.aspect = w / h;
    // 지평선(거리 끝 균열)이 글자 아래에 오도록 카메라를 위로 듦: 글자 끝 + 화면 높이 9%
    const sk = document.querySelector('.sp-skip'), cr = canvas.getBoundingClientRect();
    const textBottom = sk ? (sk.getBoundingClientRect().bottom - cr.top) / h : 0.5;
    const p = Math.min(0.74, Math.max(0.56, textBottom + 0.09));
    cam.rotation.x = Math.atan((p - 0.5) * 2 * Math.tan(T.MathUtils.degToRad(cam.fov / 2)));
    cam.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  let last = performance.now(), flashT = 2, flash = 0;
  function frame(now) {
    if (isStarted()) {   // 게임이 시작되면 그리기를 멈추고 GPU 자원 정리
      ro.disconnect(); renderer.dispose(); return;
    }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = now / 1000;
    // 카메라 전진 + 살짝 흔들림
    cam.position.z -= dt * 6;
    cam.position.x = Math.sin(t * 0.3) * 0.6;
    const cz = cam.position.z;
    // 지나간 빌딩, 가로등, 균열은 앞으로 옮김 (끝없는 거리)
    for (const b of buildings) if (b.position.z > cz + 12) b.position.z -= SPAN;
    for (const l of lamps) if (l.position.z > cz + 8) l.position.z -= LAMP_GAP * 4;
    riftGrp.position.z = cz - 150;
    road.position.z = cz - 280;
    // 균열 번쩍임: 3~6초마다 짧게 밝아짐
    flashT -= dt; if (flashT <= 0) { flash = 1; flashT = 3 + Math.random() * 3; }
    flash = Math.max(0, flash - dt * 1.8);
    const fl = 0.75 + Math.sin(t * 2) * 0.08 + flash * (Math.sin(t * 70) > 0 ? 0.9 : 0.3);
    riftLight.intensity = 2.4 * fl; riftAura.material.opacity = 0.35 * fl; halo.material.opacity = 0.5 * fl;
    // 비
    for (let i = 0; i < N; i++) {
      const d = drops[i]; d.y -= d.v * dt; if (d.y < 0) { d.y = 28 + Math.random() * 4; d.x = (Math.random() - 0.5) * 40; d.z = -Math.random() * 70; }
      const k = i * 6, x = cam.position.x + d.x, z = cz + d.z;
      rainPos[k] = x; rainPos[k + 1] = d.y; rainPos[k + 2] = z;
      rainPos[k + 3] = x - 0.08; rainPos[k + 4] = d.y + 0.9; rainPos[k + 5] = z;
    }
    rainGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return true;
}
