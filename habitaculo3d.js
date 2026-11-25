/* Habitáculo de .log — modelo 3D recorrible (sección habitáculo)
   Medidas de las fichas técnicas (UTDT · Lab 8), en metros:
   planta de techos 8,35 × 9,67 · piso 8,71 × 10,09 a 0,20 del terreno · altura libre 2,98 · máx. 3,49
   3 puertas abatibles hacia arriba: trapecio 5,98 / 3,02 × 2,96, abiertas 73° como alero, 2 pistones c/u */
(function(){
  const box = document.getElementById("hb-3d");
  if (!box || !window.THREE) return;
  const T = THREE;

  const renderer = new T.WebGLRenderer({antialias:true, alpha:true});
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
  box.appendChild(renderer.domElement);
  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(45, 1.5, 0.05, 200);
  const ctl = new T.OrbitControls(cam, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = .08;
  ctl.minDistance = .3; ctl.maxDistance = 40; ctl.maxPolarAngle = Math.PI/2 - .03;
  ctl.screenSpacePanning = true;

  // luces
  scene.add(new T.HemisphereLight(0xffffff, 0x8a9a7a, .75));
  const sol = new T.DirectionalLight(0xfff3e0, .9); sol.position.set(-12, 18, 9); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, {left:-12, right:12, top:12, bottom:-12, near:1, far:60}); sol.shadow.bias = -.0005;
  scene.add(sol);

  // materiales
  const M = (c, o) => new T.MeshStandardMaterial(Object.assign({color:c, roughness:.7, metalness:0}, o || {}));
  // materiales del mockup, con aire de "ghosted" de Rhino: perfiles de acero grafito con aristas marcadas,
  // policarbonato/vidrio acanalado translúcido celeste-grisáceo (cerramientos, banda alta, cubierta y aleros),
  // piso de madera cálida sobre bastidor oscuro con tacos cuadrados, estantes grafito con las tapas de la editorial
  const acero = M(0x3d4249, {roughness:.45, metalness:.5});
  const vidrio = M(0xc4d3e0, {roughness:.2, metalness:.05, transparent:true, opacity:.42, side:T.DoubleSide, depthWrite:false, emissive:0x1c2a3a, emissiveIntensity:.15});
  const pizarra = vidrio;
  const fenolico = M(0x6f4b31, {roughness:.55, metalness:.05});
  const canto = acero;
  const rojo = M(0x3a3f46, {roughness:.5, metalness:.4});
  const lineaVidrio = new T.LineBasicMaterial({color:0xf2f6fa, transparent:true, opacity:.5});
  const lineaPiso = new T.LineBasicMaterial({color:0x4e3220, transparent:true, opacity:.6});
  const lineaTecho = new T.LineBasicMaterial({color:0x3d4249});

  const g = new T.Group(); scene.add(g);
  const add = (geo, mat, sombra) => { const m = new T.Mesh(geo, mat); if (sombra !== false){ m.castShadow = true; m.receiveShadow = true; } g.add(m); return m; };
  const lineas = (arr, mat) => { const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(arr, 3)); g.add(new T.LineSegments(geo, mat)); };
  const p3 = ([a, b], y) => [a, y, -b];
  // barra (tubo rectangular) entre dos puntos
  const barra = (P, Q, w, h, mat) => {
    const d = new T.Vector3(Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]), L = Math.hypot(Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]);
    const m = add(new T.BoxGeometry(w, L, h), mat || acero);
    m.position.set((P[0] + Q[0])/2, (P[1] + Q[1])/2, (P[2] + Q[2])/2);
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize());
    return m;
  };
  // cara plana a partir de puntos 3D (polígono convexo)
  const cara = (P, mat) => { const v = []; for (let i = 1; i < P.length - 1; i++) v.push(...P[0], ...P[i], ...P[i + 1]);
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.Float32BufferAttribute(v, 3)); geo.computeVertexNormals();
    const m = add(geo, mat, mat !== vidrio); return m; };
  // vidrio acanalado: paño + líneas verticales cada 0,12 m
  const panoVidrio = (A, B, ya0, yb0, ya1, yb1, t, n) => {
    // A,B: extremos en planta; recorre u de 0..1 a lo largo, alturas lineales entre (ya0,yb0) abajo y (ya1,yb1) arriba
    cara([p3(A, ya0), p3(B, yb0), p3(B, yb1), p3(A, ya1)], vidrio);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), arr = [];
    for (let u = .12; u < L - .06; u += .12){ const k = u/L, x = A[0] + (B[0] - A[0])*k, y = A[1] + (B[1] - A[1])*k;
      arr.push(x, ya0 + (yb0 - ya0)*k, -y, x, ya1 + (yb1 - ya1)*k, -y); }
    lineas(arr, lineaVidrio);
  };

  // planta: triángulo truncado (3 lados largos con puerta, 3 cortos)
  const kx = 8.35/290, ky = 9.67/333, cx = 595, cy = 293.5;
  const V = [[450,235],[640,127],[740,185],[740,400],[640,460],[450,350]].map(([x, y]) => [(x - cx)*kx, (cy - y)*ky]);
  const VP = V.map(([a, b]) => [a*1.043, b*1.043]);              // piso 8,71 × 10,09
  const PISO = .2, H = PISO + 2.98, TOPE = 3.49;

  // terreno
  const suelo = add(new T.CircleGeometry(14, 48).rotateX(-Math.PI/2), new T.ShadowMaterial({opacity:.22}), false); suelo.receiveShadow = true;   // solo la sombra, sin contexto

  // gatos regulables bajo el piso (base + vástago)
  const forma = pts => new T.Shape(pts.map(([a, b]) => new T.Vector2(a, b)));
  const losa = (pts, y0, alto, mat) => add(new T.ExtrudeGeometry(forma(pts), {depth:alto, bevelEnabled:false}).rotateX(-Math.PI/2).translate(0, y0, 0), mat);
  const dentro = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++){ const [xi, yi] = P[i], [xj, yj] = P[j];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi)*(y - yi)/(yj - yi) + xi)) c = !c; } return c; };
  const gatoBase = new T.BoxGeometry(.16, .06, .16).translate(0, .025, 0), gatoVas = new T.BoxGeometry(.1, .12, .1);
  for (let x = -4.6; x <= 4.6; x += 1.22) for (let y = -5.2; y <= 5.2; y += 1.22){
    if (!dentro(x, y, VP.map(([a, b]) => [a*.97, b*.97]))) continue;
    const b0 = add(gatoBase, acero); b0.position.set(x, .005, -y); const v0 = add(gatoVas, acero); v0.position.set(x, .07, -y);
  }
  VP.forEach(([a, b]) => { const b0 = add(gatoBase, acero); b0.position.set(a*.98, .005, -b*.98); });
  // piso: bastidor de acero + fenólico 18 mm con juntas de paneles 1,22 × 2,44
  losa(VP, .12, .06, canto);
  losa(VP, .18, .02, fenolico);
  const jp = [], lim = VP.map(([a, b]) => [a*.995, b*.995]);
  const corta = (x0, y0, x1, y1) => { const n = 60; let ini = null;
    for (let i = 0; i <= n; i++){ const x = x0 + (x1 - x0)*i/n, y = y0 + (y1 - y0)*i/n, d = dentro(x, y, lim);
      if (d && !ini) ini = [x, y]; if ((!d || i === n) && ini){ jp.push(ini[0], PISO + .003, -ini[1], x, PISO + .003, -y); ini = null; } } };
  for (let x = -4.88; x <= 4.9; x += 1.22) corta(x, -5.2, x, 5.2);
  for (let y = -4.88; y <= 4.9; y += 2.44) corta(-4.6, y, 4.6, y);
  lineas(jp, lineaPiso);

  // estructura, cerramientos y puertas
  const tubo = .12;
  V.forEach(v => barra(p3(v, PISO), p3(v, H), tubo, tubo));                         // parantes en cada vértice
  for (let i = 0; i < 6; i++){
    const A = V[i], B = V[(i + 1) % 6], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), t = [dx/L, dy/L], n = [-t[1], t[0]];
    const en = u => [A[0] + t[0]*u, A[1] + t[1]*u];
    barra(p3(A, H), p3(B, H), tubo, tubo);                                           // viga superior
    barra(p3(A, PISO + .03), p3(B, PISO + .03), .08, .06);                           // solera
    if (L < 4){ panoVidrio(A, B, PISO, PISO, H, H); continue; }                     // lado corto: paño entero
    const ab = (L - 3.02)/2, ar = (L - 5.98)/2;
    panoVidrio(A, en(ab), PISO, PISO, H, H);                                         // paños triangulares a los costados de la puerta
    cara([p3(en(ab), PISO), p3(en(ar), H), p3(A, H)], vidrio);
    panoVidrio(en(L - ab), B, PISO, PISO, H, H);
    cara([p3(en(L - ab), PISO), p3(B, H), p3(en(L - ar), H)], vidrio);
    barra(p3(en(ab), PISO), p3(en(ar), H), tubo, tubo);                              // parantes inclinados
    barra(p3(en(L - ab), PISO), p3(en(L - ar), H), tubo, tubo);
    // puerta abierta 73°: bisagra arriba (5,98), borde libre a 2,82 m afuera y 0,86 m más abajo (3,02)
    const sale = 2.95*Math.sin(T.MathUtils.degToRad(73)), baja = 2.95*Math.cos(T.MathUtils.degToRad(73)), c0 = L/2;
    const af = (u, d, y) => p3([A[0] + t[0]*u + n[0]*d, A[1] + t[1]*u + n[1]*d], y);
    const q = [af(c0 - 2.99, .05, H - .02), af(c0 + 2.99, .05, H - .02), af(c0 + 1.51, sale, H - baja), af(c0 - 1.51, sale, H - baja)];
    cara(q, pizarra);
    for (let k = 0; k < 4; k++) barra(q[k], q[(k + 1) % 4], .052, .025);            // marco 52 × 25
    for (let s = -2; s <= 2; s++){ const u0 = c0 + s*2.99/2.5, u1 = c0 + s*1.51/2.5; barra(af(u0, .05, H - .02), af(u1, sale, H - baja), .03, .02); }
    // pistones a gas (2 por hoja)
    [-1.6, 1.6].forEach(o => {
      const P = af(c0 + o*1.05, .06, 1.35), Q = af(c0 + o*.95, sale*.55, H - baja*.55);
      const mid = [P[0] + (Q[0] - P[0])*.55, P[1] + (Q[1] - P[1])*.55, P[2] + (Q[2] - P[2])*.55];
      const c1 = barra(P, mid, .04, .04, M(0x22262b, {metalness:.5, roughness:.4})); c1.geometry = new T.CylinderGeometry(.02, .02, Math.hypot(mid[0] - P[0], mid[1] - P[1], mid[2] - P[2]), 8);
      const c2 = barra(mid, Q, .02, .02, M(0xc9ced4, {metalness:.8, roughness:.2})); c2.geometry = new T.CylinderGeometry(.01, .01, Math.hypot(Q[0] - mid[0], Q[1] - mid[1], Q[2] - mid[2]), 8);
    });
  }
  // cubierta: faja perimetral de acero, correas y vidrio acanalado (pend. 3 %)
  losa(V.map(([a, b]) => [a*1.01, b*1.01]), H, .14, acero);
  losa(V.map(([a, b]) => [a*.99, b*.99]), TOPE - .03, .03, pizarra);
  for (let i = 0; i < 6; i++){ const A = V[i], B = V[(i + 1) % 6];
    panoVidrio(A, B, H + .14, H + .14, TOPE - .03, TOPE - .03);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), nm = Math.max(1, Math.round(L/2));
    for (let k = 0; k <= nm; k++){ const u = k/nm, P = [A[0] + (B[0] - A[0])*u, A[1] + (B[1] - A[1])*u]; barra(p3(P, H + .14), p3(P, TOPE - .03), .06, .06); } }
  const corr = [];
  for (let y = -4.6; y <= 4.7; y += 1.15){ const n = 80; let ini = null;
    for (let i = 0; i <= n; i++){ const x = -4.3 + 8.6*i/n, d = dentro(x, y, V.map(([a, b]) => [a*.98, b*.98]));
      if (d && !ini) ini = x; if ((!d || i === n) && ini !== null){ barra([ini, TOPE - .1, -y], [x, TOPE - .1, -y], .06, .12); corr.push(ini, TOPE + .004, -y, x, TOPE + .004, -y); ini = null; } } }
  lineas(corr, lineaTecho);
  // faja superior y borde de techo
  for (let i = 0; i < 6; i++){ const A = V[i], B = V[(i + 1) % 6]; barra(p3([A[0]*1.01, A[1]*1.01], TOPE - .015), p3([B[0]*1.01, B[1]*1.01], TOPE - .015), .08, .05); }

  // estantes rojos de acero con las editoriales A5, contra los tres lados cortos
  const texTapa = new T.TextureLoader().load("img/editorial-tapa.jpg"); texTapa.encoding = T.sRGBEncoding; texTapa.anisotropy = 8;
  const canto2 = M(0xf1f1ee, {roughness:.8});
  const tapaMat = [canto2, canto2, canto2, canto2, new T.MeshStandardMaterial({map:texTapa, roughness:.65, emissive:0xffffff, emissiveMap:texTapa, emissiveIntensity:.18}), canto2];
  const libro = new T.BoxGeometry(.148, .21, .012), LIBROS = [];
    [[5, 0], [1, 2], [3, 4]].forEach(([i0, i1]) => {
    const A = V[i0], B = V[i1], mx = (A[0] + B[0])/2, my = (A[1] + B[1])/2, ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    const est = new T.Group(); g.add(est);
    const nIn = [B[1] - A[1], -(B[0] - A[0])], nl = Math.hypot(...nIn);             // hacia adentro (planta en sentido horario)
    est.position.set(mx + nIn[0]/nl*.28, PISO, -(my + nIn[1]/nl*.28)); est.rotation.y = ang;
    const W = 3, alto = 2.3, prof = .3;
    const pz = (w, h, d, x, y, z, mat) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; est.add(m); };
    for (let c = 0; c <= 8; c++) pz(.03, alto, prof, -W/2 + c*W/8, alto/2, .02, rojo);   // 8 casilleros
    for (let k = 0; k < 5; k++){
      const y = .2 + k*.5;
      pz(W, .03, prof, 0, y, .02, rojo);
      if (k === 4) continue;
      for (let c = 0; c < 8; c++){                                                      // una tapa por casillero, inclinada
        const m = new T.Mesh(libro, tapaMat);
        m.position.set(-W/2 + (c + .5)*W/8, y + .135, .07); m.rotation.x = -.12; m.castShadow = true; est.add(m); LIBROS.push(m);
      }
    }
    // luz cálida sobre los estantes
    const lz = new T.PointLight(0xffd7a0, .35, 5, 2); lz.position.set(0, 2.4, 1.2); est.add(lz);
  });
  // "ghosted": aristas oscuras sobre perfiles, piso y paños (las tapas no)
  const arista = new T.LineBasicMaterial({color:0x2a2e33, transparent:true, opacity:.55});
  g.children.slice().forEach(o => { if (o.isMesh && o.material !== vidrio && o.geometry.type !== "CircleGeometry") o.add(new T.LineSegments(new T.EdgesGeometry(o.geometry, 25), arista)); });
  // cámara: afuera / adentro
  const VISTAS = {
    afuera: {pos:[9.6, 4.9, 8.9], tgt:[0, 1.5, 0]},
    adentro: {pos:[2.2, 1.65, 1.6], tgt:[-2.4, 1.35, -.9]}
  };
  cam.position.set(...VISTAS.afuera.pos); ctl.target.set(...VISTAS.afuera.tgt); ctl.update();
  let viaje = null;
  function irA(nombre){
    const v = VISTAS[nombre]; if (!v) return;
    viaje = {t0:performance.now(), p0:cam.position.clone(), t0v:ctl.target.clone(), p1:new T.Vector3(...v.pos), t1:new T.Vector3(...v.tgt)};
    box.querySelectorAll(".hb3-btn button").forEach(b => b.classList.toggle("on", b.dataset.v === nombre));
  }
  box.querySelectorAll(".hb3-btn button").forEach(b => b.addEventListener("click", () => irA(b.dataset.v)));
  ctl.addEventListener("start", () => { viaje = null; box.classList.add("usado"); });

  // tamaño y loop (solo cuando se ve)
  function medir(){ const w = box.clientWidth, h = box.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w/h; cam.updateProjectionMatrix(); }
  new ResizeObserver(medir).observe(box); medir();
  let visible = false;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) loop(); }).observe(box);
  let raf = 0;
  function loop(){
    cancelAnimationFrame(raf);
    if (!visible || !box.offsetParent) return;
    raf = requestAnimationFrame(loop);
    if (viaje){
      const k = Math.min(1, (performance.now() - viaje.t0)/1400), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
      cam.position.lerpVectors(viaje.p0, viaje.p1, e); ctl.target.lerpVectors(viaje.t0v, viaje.t1, e);
      if (k >= 1) viaje = null;
    }
    ctl.update(); renderer.render(scene, cam);
  }
  window.__hab3dVer = () => { medir(); loop(); };

  /* ---------- clic en una editorial: se agranda y gira mostrando tapa y contratapa ---------- */
  const rc = new T.Raycaster(), pm = new T.Vector2();
  const libroBajo = (x, y) => { const r = renderer.domElement.getBoundingClientRect();
    pm.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1); rc.setFromCamera(pm, cam);
    return rc.intersectObjects(LIBROS, false).length > 0; };
  let pd = null;
  renderer.domElement.addEventListener("pointerdown", e => pd = [e.clientX, e.clientY]);
  renderer.domElement.addEventListener("pointerup", e => {
    if (pd && Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) < 6 && libroBajo(e.clientX, e.clientY)) abrirEditorial();
    pd = null; });
  // cartelito "ver editorial" que sigue al mouse cuando está sobre una editorial
  const tip = document.createElement("span"); tip.className = "hb3-tip"; tip.textContent = "ver editorial"; tip.hidden = true; box.appendChild(tip);
  renderer.domElement.addEventListener("pointermove", e => {
    const si = !e.buttons && libroBajo(e.clientX, e.clientY);
    renderer.domElement.style.cursor = si ? "pointer" : "";
    tip.hidden = !si;
    if (si){ const r = box.getBoundingClientRect(); tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top - 12) + "px"; }
  });
  renderer.domElement.addEventListener("pointerleave", () => { tip.hidden = true; });

  let ed = null;
  function abrirEditorial(){
    if (!ed){
      const el = document.createElement("div"); el.className = "hb-ed";
      el.innerHTML = '<button type="button" class="hb-ed-x" aria-label="Cerrar">×</button><p class="hb-ed-tit">Editorial .log · Edición N1 · Patrimonio oculto</p><p class="hb-ed-ayuda">clic afuera o esc para cerrar</p>';
      document.body.appendChild(el);
      const r2 = new T.WebGLRenderer({antialias:true, alpha:true}); r2.setClearColor(0, 0); r2.outputEncoding = T.sRGBEncoding;
      r2.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); el.insertBefore(r2.domElement, el.firstChild);
      const sc = new T.Scene(), c2 = new T.PerspectiveCamera(32, 1, .1, 50); c2.position.set(0, 0, 6.2);
      sc.add(new T.HemisphereLight(0xffffff, 0xb8c4d6, .95));
      const dl = new T.DirectionalLight(0xffffff, .55); dl.position.set(2, 3, 5); sc.add(dl);
      const tl = new T.TextureLoader(), tx = src => { const t = tl.load(src); t.encoding = T.sRGBEncoding; t.anisotropy = 8; return t; };
      const papel = new T.MeshStandardMaterial({color:0xf3f2ee, roughness:.85});
      const cara = t => new T.MeshStandardMaterial({map:t, roughness:.6, emissive:0xffffff, emissiveMap:t, emissiveIntensity:.25});
      // revista con cuerpo: bloque de hojas (cantos rayados), tapas apenas más grandes y lomo redondeado a la izquierda
      const G = .042, W = 1.48, Hh = 2.1;                                  // revista: pocas hojas, tapa blanda
      const hojas = vertical => { const c = document.createElement("canvas"); c.width = vertical ? 256 : 8; c.height = vertical ? 8 : 256;
        const x = c.getContext("2d"); x.fillStyle = "#f4f3ef"; x.fillRect(0, 0, c.width, c.height);
        for (let i = 0; i < 256; i += 6){ x.fillStyle = i % 9 ? "rgba(0,0,0,.07)" : "rgba(0,0,0,.14)"; vertical ? x.fillRect(i, 0, 1, 8) : x.fillRect(0, i, 8, 1); }
        const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; return new T.MeshStandardMaterial({map:t, roughness:.9}); };
      const cantoV = hojas(true), cantoH = hojas(false);
      const lb = new T.Group(); sc.add(lb);
      lb.add(new T.Mesh(new T.BoxGeometry(W - .008, Hh - .008, G - .004), [cantoV, papel, cantoH, cantoH, papel, papel]));
      const tapaGeo = new T.BoxGeometry(W, Hh, .002);
      const fr = new T.Mesh(tapaGeo, [papel, papel, papel, papel, cara(tx("img/editorial-tapa.jpg")), papel]); fr.position.z = G/2 - .001; lb.add(fr);
      const bk = new T.Mesh(tapaGeo, [papel, papel, papel, papel, papel, cara(tx("img/editorial-contratapa.jpg"))]); bk.position.z = -G/2 + .001; lb.add(bk);
      const lomo = new T.Mesh(new T.CylinderGeometry(G/2, G/2, Hh, 20, 1, false, Math.PI, Math.PI), papel); lomo.position.x = -W/2; lb.add(lomo);
      lb.children.forEach(o => { o.castShadow = true; });
      ed = {el, r2, sc, c2, lb, t0:0, raf:0, abierto:false};
      const cerrar = () => cerrarEditorial();
      el.addEventListener("click", e => { if (e.target === el || e.target.classList.contains("hb-ed-x")) cerrar(); });
      window.addEventListener("keydown", e => { if (e.key === "Escape" && ed && ed.abierto) cerrar(); });
      const tam = () => { const w = innerWidth, h = innerHeight; r2.setSize(w, h); c2.aspect = w/h; c2.updateProjectionMatrix(); };
      window.addEventListener("resize", tam); tam(); ed.tam = tam;
    }
    ed.tam(); ed.abierto = true; ed.t0 = performance.now(); ed.lb.rotation.set(0, -.6, 0);
    ed.el.classList.add("on");
    let ult = performance.now();
    const paso = now => {
      if (!ed.abierto) return;
      ed.raf = requestAnimationFrame(paso);
      const dt = Math.min(.05, (now - ult)/1000); ult = now;
      const k = Math.min(1, (now - ed.t0)/900), e = 1 - Math.pow(1 - k, 3);
      ed.lb.scale.setScalar(.15 + .85*e);
      ed.lb.position.y = -.05 + Math.sin(now/900)*.04;
      ed.lb.rotation.y += dt*(1.1 + (1 - e)*4);                                  // entra girando rápido y sigue dando vueltas
      ed.lb.rotation.x = Math.sin(now/1300)*.08;
      ed.r2.render(ed.sc, ed.c2);
    };
    cancelAnimationFrame(ed.raf); ed.raf = requestAnimationFrame(paso);
  }
  function cerrarEditorial(){ if (!ed) return; ed.abierto = false; cancelAnimationFrame(ed.raf); ed.el.classList.remove("on"); }
  box.classList.add("listo");
})();
