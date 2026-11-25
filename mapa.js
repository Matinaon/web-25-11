/* .log — mapa 3D de Buenos Aires
   Calles: OpenStreetMap (© colaboradores de OpenStreetMap, ODbL).
   Manzanas: derivadas de las calles. Alturas: ilustrativas, no reales. */
(function(){
  const D = window.MAPA_DATA;
  const box = document.getElementById("mapa-canvas");
  const AZUL = 0x085cf0, ROSA = 0xd0ffa4, LINEA = 0x9a9a9a;

  /* ---------- datos: calles ---------- */
  const [nombresTxt, viasTxt] = D.calles.split("\n");
  const NOMBRES = nombresTxt.split("|");
  const CALLES = viasTxt.split(";").map(v => {
    const a = v.split(",").map(Number);
    let x = a[2], y = a[3]; const pts = [[x*D.u, y*D.u]];
    for (let i = 4; i < a.length; i += 2){ x += a[i]; y += a[i+1]; pts.push([x*D.u, y*D.u]); }
    return {clase:a[0], nombre:NOMBRES[a[1]], pts};
  });

  /* ---------- lugares del catálogo (coordenadas en metros desde el Obelisco) ---------- */
  const LUG = [
    {id:"iglesia-san-nicolas-de-bari", nombre:"Iglesia San Nicolás de Bari", hoy:"Obelisco", x:0, y:0, modelo:true, rot:0, alto:70, cerca:250, terreno:0,
     hoyN:"Obelisco", hoyA:"1936", antesA:"1733–1931", per:[1733, 1931, 1936], tipoA:"iglesia", tipoH:"monumento", uso:"religioso", imgHoy:"img/i06-obelisco.jpg", imgAntes:"img/san-nicolas-trazo.png",
     txtHoy:"Levantado en la Plaza de la República, donde estaba la iglesia. Proyecto de Alberto Prebisch.",
     txtAntes:"En su torre se izó por primera vez la bandera en Buenos Aires (1812). Fue demolida en 1931 para las obras de la Diagonal Norte."},
    {id:"pabellon-argentino", nombre:"Pabellón Argentino", hoy:"Plaza San Martín", x:520, y:1010, modelo:true, rot:-0.529, alto:40, cerca:260, terreno:0,
     hoyN:"Plaza San Martín", hoyA:"hoy", antesA:"1889–1933", per:[1889, 1933, 1933], tipoA:"edificio", tipoH:"parque", uso:"exposiciones", imgHoy:"img/plaza-san-martin-hoy.png", imgAntes:"img/pabellon-trazo.png",
     txtHoy:"El terreno volvió a ser parte de la Plaza San Martín, en Retiro.",
     txtAntes:"Hierro y vidrio, de Albert Ballu, para la Exposición Universal de París de 1889. Trasladado a la Plaza San Martín, fue sede del Museo Nacional de Bellas Artes (1911–1933)."},
    {id:"palacio-miro", nombre:"Palacio Miró", hoy:"Plaza Lavalle", x:-406, y:291, modelo:true, rot:0.03, alto:26, cerca:220, terreno:40, hoyN:"Plaza Lavalle", hoyA:"hoy", antesA:"c. 1870–1937", per:[1870, 1937, 1937], tipoA:"edificio", tipoH:"parque", uso:"residencial"},
    {id:"palacio-unzue", nombre:"Palacio Unzué", hoy:"Biblioteca Nacional", x:-1140, y:2070, modelo:true, rot:-0.367, alto:40, cerca:300, terreno:110,
     hoyN:"Biblioteca Nacional", hoyA:"1992", antesA:"1887–1958", per:[1887, 1958, 1992], tipoA:"edificio", tipoH:"edificio", uso:"residencial", imgHoy:"img/biblioteca-hoy.png", imgAntes:"img/unzue-trazo.png",
     txtHoy:"Obra de Clorindo Testa, Francisco Bullrich y Alicia Cazzaniga, levantada en el mismo terreno del palacio.",
     txtAntes:"Residencia aristocrática en Recoleta y luego residencia presidencial: allí vivieron Perón y Evita. Fue demolido en 1958."},
    {id:"penitenciaria-nacional", nombre:"Penitenciaría Nacional", hoy:"Parque Las Heras", x:-2470, y:2190, modelo:true, rot:-0.379, alto:20, cerca:480, terreno:0,
     hoyN:"Parque Las Heras", hoyA:"hoy", antesA:"1877–1962", per:[1877, 1962, 1980], tipoA:"edificio", tipoH:"parque", uso:"institucional", imgHoy:"img/las-heras-hoy.png", imgAntes:"img/penitenciaria-trazo.png",
     txtHoy:"Tras el cierre y la demolición de la cárcel, el terreno se transformó en un parque público.",
     txtAntes:"Proyecto de Ernesto Bunge: pabellones en abanico alrededor de un centro de vigilancia. Funcionó hasta 1962."},
    {id:"primer-teatro-colon", nombre:"Primer Teatro Colón", hoy:"Banco Nación", x:925, y:-387, modelo:true, rot:0.11, alto:36, cerca:260, terreno:40,
     hoyN:"Banco Nación", hoyA:"hoy", antesA:"1857–1888", per:[1857, 1888, 1940], tipoA:"edificio", tipoH:"edificio", uso:"cultural"},
    {id:"parque-diversiones-retiro", nombre:"Parque de Diversiones de Retiro", hoy:"Hotel Sheraton", x:835, y:1150, modelo:true, rot:-1.2, alto:84, cerca:320, terreno:0,
     hoyN:"Hotel Sheraton", hoyA:"1972", antesA:"1939–1961", per:[1939, 1961, 1972], tipoA:"parque", tipoH:"edificio", uso:"recreativo"}
  ];


  /* ---------- escena ---------- */
  const W = () => box.clientWidth, H = () => box.clientHeight;
  const renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  renderer.setClearColor(0xffffff, 1);
  box.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const ciudad = new THREE.Group(); scene.add(ciudad);   // calles + manzanas: se aplastan en la vista 2D
  const cam = new THREE.PerspectiveCamera(38, W()/H(), 5, 20000);
  const P = (x, y, z) => new THREE.Vector3(x, z || 0, -y);   // x este, y norte, z altura

  // piso
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000), new THREE.MeshBasicMaterial({color:0xffffff}));
  piso.rotation.x = -Math.PI/2; piso.position.set(-1400, -0.5, -700); scene.add(piso);

  // calles: líneas finas (las avenidas un poco más marcadas)
  const capas = [[], [], []];
  CALLES.forEach(c => {
    const k = c.clase <= 1 ? 0 : (c.clase <= 3 ? 1 : 2);
    for (let i = 0; i < c.pts.length - 1; i++){
      capas[k].push(c.pts[i][0], 0.2, -c.pts[i][1], c.pts[i+1][0], 0.2, -c.pts[i+1][1]);
    }
  });
  [0x5a7cf0, 0xb4b4b4, 0xd9d9d9].forEach((col, k) => {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(capas[k], 3));
    ciudad.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({color:col, transparent:true, opacity:k ? 1 : .55})));
  });

  /* ---------- manzanas: volúmenes simples ---------- */
  function rnd(i){ const s = Math.sin(i*127.1 + 311.7)*43758.5453; return s - Math.floor(s); }
  function dentro(px, py, poly){ let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++){
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if (((yi > py) !== (yj > py)) && (px < (xj - xi)*(py - yi)/(yj - yi) + xi)) c = !c; }
    return c; }
  function alto(cx, cy, i){
    const dc = Math.hypot(cx - 250, cy - 150);                  // microcentro
    const base = dc < 900 ? 34 : dc < 1800 ? 24 : 15;
    return base + rnd(i)*base*0.9;
  }
  const MZ = D.manzanas.map((m, i) => {
    const poly = []; for (let k = 1; k < m.length; k += 2) poly.push([m[k], m[k+1]]);
    let cx = 0, cy = 0; poly.forEach(p => { cx += p[0]; cy += p[1]; }); cx /= poly.length; cy /= poly.length;
    // canteros y plazoletas de la 9 de Julio: franjas angostas sobre el eje, van planas (dejan ver el Obelisco)
    const xs = poly.map(p => p[0]), canter = Math.abs(cx) < 70 && Math.max(...xs) - Math.min(...xs) < 65;
    const terreno = LUG.some(l => l.terreno && Math.hypot(cx - l.x, cy - l.y) < l.terreno);
    return {plaza:(m[0] === 1 && !(Math.abs(cx - 560) < 200 && Math.abs(cy - 170) < 200)) || canter || terreno, poly, cx, cy, i};
  });
  // la manzana de cada lugar se pinta de azul
  LUG.forEach(l => { if (l.modelo) return; const m = MZ.find(z => dentro(l.x, l.y, z.poly)); if (m) { m.lugar = l; l.mz = m; } });

  const geoms = {blanco:[], azul:[], plaza:[]};
  MZ.forEach(m => {
    const sh = new THREE.Shape(m.poly.map(p => new THREE.Vector2(p[0], p[1])));
    const h = m.lugar ? 6 : (m.plaza ? 1.2 : alto(m.cx, m.cy, m.i));
    const g = new THREE.ExtrudeGeometry(sh, {depth:h, bevelEnabled:false});
    g.rotateX(-Math.PI/2);          // la forma (x,y) queda en el plano x,-z; la altura en +y
    (m.lugar ? geoms.azul : m.plaza ? geoms.plaza : geoms.blanco).push(g);
  });
  function capa(lista, colorCara, colorLinea, op){
    if (!lista.length) return;
    const g = THREE.BufferGeometryUtils.mergeBufferGeometries(lista, false);
    const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:colorCara, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1, transparent:op < 1, opacity:op}));
    ciudad.add(mesh);
    ciudad.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({color:colorLinea})));
    return mesh;
  }
  capa(geoms.blanco, 0xffffff, LINEA, 1);
  capa(geoms.plaza, 0xf0f0f0, 0xc8c8c8, 1);
  capa(geoms.azul, AZUL, AZUL, 0.9);

  // marcadores de los lugares: columna azul + etiqueta
  const etq = document.getElementById("mapa-etiquetas");
  LUG.forEach(l => {
    if (!l.modelo){
      const col = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 140, 6), new THREE.MeshBasicMaterial({color:AZUL}));
      col.position.copy(P(l.x, l.y, 70)); ciudad.add(col);
    }
    l.el = document.createElement("button");
    l.el.className = "mp-etq";
    l.el.innerHTML = `<b>${l.nombre}</b><span>hoy: ${l.hoy}</span>`;
    // clic/toque en el marcador: zoom suave y centrado en el lugar (el archivo se abre desde la ficha)
    l.el.addEventListener("click", e => { e.preventDefault(); window.__mapaEnfocar && window.__mapaEnfocar(l); });
    etq.appendChild(l.el);
    l.anc = P(l.x, l.y, l.modelo ? l.alto + 12 : 150); l.ancY = l.anc.y;
  });

  // marcador de búsqueda (rosa)
  const pin = new THREE.Group();
  pin.add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 110, 6), new THREE.MeshBasicMaterial({color:ROSA})));
  pin.children[0].position.y = 55;
  const anillo = new THREE.Mesh(new THREE.RingGeometry(14, 22, 32), new THREE.MeshBasicMaterial({color:ROSA, side:THREE.DoubleSide}));
  anillo.rotation.x = -Math.PI/2; anillo.position.y = 0.6; pin.add(anillo);
  pin.visible = false; scene.add(pin);
  const pinEl = document.createElement("div"); pinEl.className = "mp-etq mp-pin"; pinEl.hidden = true; etq.appendChild(pinEl);


  /* =====================================================================
     HOY / ANTES — modelos 3D en cada lugar
     Antes: volumen blanco con trazo azul, armado a partir de los dibujos.
     Hoy: volumen "real" (piedra, hormigón, árboles). Medidas ilustrativas.
     ===================================================================== */
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 0.8));
  const sol = new THREE.DirectionalLight(0xffffff, 0.55); sol.position.set(-1.2, 2, 1.6); scene.add(sol);

  const MODELOS = [];
  function nuevoModelo(l, cual){
    const m = {lugar:l, cual, raiz:new THREE.Group(), solido:new THREE.Group(), fantasma:new THREE.Group(), k:0, obj:0};
    m.raiz.position.copy(P(l.x, l.y, 0)); m.raiz.rotation.y = l.rot || 0;
    m.raiz.add(m.solido, m.fantasma); scene.add(m.raiz);
    m.matF = new THREE.LineBasicMaterial({color:AZUL, transparent:true, opacity:0, depthWrite:false});
    MODELOS.push(m); return m;
  }
  // coordenadas del mapa (x este, y norte) → coordenadas locales del modelo
  function local(l, X, Y){ const c = Math.cos(l.rot || 0), s = Math.sin(l.rot || 0), dx = X - l.x, dy = Y - l.y;
    return [dx*c + dy*s, -dx*s + dy*c]; }   // [a lo largo, hacia el norte]
  // líneas con "mano": se repite cada trazo un poco corrido y pasado de largo
  let semilla = 1;
  function temblor(arr, a){
    const out = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i += 6){
      const dx = arr[i+3]-arr[i], dy = arr[i+4]-arr[i+1], dz = arr[i+5]-arr[i+2];
      const L = Math.hypot(dx, dy, dz) || 1, ext = Math.min(0.6, L*0.08)*rnd(semilla++);
      const ux = dx/L*ext, uy = dy/L*ext, uz = dz/L*ext;
      out[i]   = arr[i]   - ux + (rnd(semilla++)-.5)*a; out[i+1] = arr[i+1] - uy + (rnd(semilla++)-.5)*a; out[i+2] = arr[i+2] - uz + (rnd(semilla++)-.5)*a;
      out[i+3] = arr[i+3] + ux + (rnd(semilla++)-.5)*a; out[i+4] = arr[i+4] + uy + (rnd(semilla++)-.5)*a; out[i+5] = arr[i+5] + uz + (rnd(semilla++)-.5)*a;
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(out, 3)); return g;
  }
  function segs(arr){ const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3)); return g; }
  function rayas(m, arr, mat, mano, sinFantasma){
    m.solido.add(new THREE.LineSegments(segs(arr), mat));
    if (mano) m.solido.add(new THREE.LineSegments(temblor(arr, mano), mat.userData.suelto));
    if (!sinFantasma) m.fantasma.add(new THREE.LineSegments(segs(arr), m.matF));
  }
  function polil(pts, cerrada){ const a = [];
    for (let i = 0; i < pts.length - (cerrada ? 0 : 1); i++){ const p = pts[i], q = pts[(i+1)%pts.length]; a.push(p[0],p[1],p[2], q[0],q[1],q[2]); }
    return a; }
  const bordes = (g, u) => Array.from(new THREE.EdgesGeometry(g, u || 20).attributes.position.array);
  const caja = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h/2, z);
  // techo mansarda / tronco de pirámide rectangular
  function tronco(w, h, d, ins, x, y, z){
    const g = new THREE.BoxGeometry(w, h, d), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0){ p.setX(i, p.getX(i)*(w/2 - ins)/(w/2)); p.setZ(i, p.getZ(i)*(d/2 - ins)/(d/2)); }
    g.computeVertexNormals(); return g.translate(x, y + h/2, z);
  }
  function prisma(w, h, d, x, y, z){   // techo a dos aguas, cumbrera a lo largo de x
    const sh = new THREE.Shape(); sh.moveTo(-d/2, 0); sh.lineTo(d/2, 0); sh.lineTo(0, h); sh.closePath();
    return new THREE.ExtrudeGeometry(sh, {depth:w, bevelEnabled:false}).rotateY(Math.PI/2).translate(x - w/2, y, z);
  }
  function arco(cx, y0, w, h, n){ const r = w/2, pts = [[cx - r, y0], [cx - r, y0 + h - r]];
    for (let i = 1; i < (n||8); i++){ const t = Math.PI - Math.PI*i/(n||8); pts.push([cx + r*Math.cos(t), y0 + h - r + r*Math.sin(t)]); }
    pts.push([cx + r, y0 + h - r], [cx + r, y0]); return pts; }
  function circ(cx, cy, r, n){ const p = []; for (let i = 0; i < n; i++){ const t = 2*Math.PI*i/n; p.push([cx + r*Math.cos(t), cy + r*Math.sin(t)]); } return p; }
  const rect = (x0, y0, x1, y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  const enX = (x0, pts) => pts.map(p => [x0, p[1], p[0]]);   // dibujo sobre la cara x = cte (u = z)
  const enZ = (z0, pts) => pts.map(p => [p[0], p[1], z0]);   // dibujo sobre la cara z = cte (u = x)
  const plana = g => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); return g; };

  // kit "trazo": caras blancas + línea azul a mano alzada
  function kitTrazo(m, mano){
    mano = mano || 0.28;
    const cara = new THREE.MeshBasicMaterial({color:0xffffff, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1});
    const tz = new THREE.LineBasicMaterial({color:AZUL}); tz.userData.suelto = new THREE.LineBasicMaterial({color:AZUL, transparent:true, opacity:.45});
    const P_ = (g, u) => { m.solido.add(new THREE.Mesh(g, cara)); rayas(m, bordes(g, u), tz, mano); };
    const R_ = (pts, cerrada) => rayas(m, polil(pts, cerrada !== false), tz, mano*0.6);
    const cruz = (x, y, z, s) => { P_(caja(.28*s, 2.6*s, .28*s, x, y, z)); P_(caja(1.5*s, .28*s, .28*s, x, y + 1.6*s, z)); };
    const cupula = (x, y, z, r, alto, seg) => P_(new THREE.SphereGeometry(r, seg || 12, 5, 0, Math.PI*2, 0, Math.PI/2).scale(1, alto || 1, 1).translate(x, y, z), 8);
    return {P_, R_, cruz, cupula};
  }
  // kit "sólido": material iluminado + borde fino
  function kitSolido(m, color, colorBorde){
    const mat = new THREE.MeshLambertMaterial({color, polygonOffset:true, polygonOffsetFactor:1, polygonOffsetUnits:1});
    const borde = new THREE.LineBasicMaterial({color:colorBorde});
    const S_ = (g, matX, u) => { g = plana(g); m.solido.add(new THREE.Mesh(g, matX || mat)); rayas(m, bordes(g, u || 25), borde); };
    return {S_, mat, borde};
  }
  // árboles: copas low-poly instanciadas dentro del polígono de la manzana
  function arboles(m, poly, n, evitar, suelo, tam){
    const l = m.lugar;
    const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const copa = new THREE.IcosahedronGeometry(1, 0), tronc = new THREE.CylinderGeometry(.25, .35, 1, 5).translate(0, .5, 0);
    const mc = new THREE.InstancedMesh(copa, new THREE.MeshLambertMaterial({color:0xffffff, flatShading:true}), n);
    const mt = new THREE.InstancedMesh(tronc, new THREE.MeshLambertMaterial({color:0x7a6650}), n);
    const verdes = [0x5c9a52, 0x6fae5f, 0x4f8a48, 0x82b86c, 0x8f6f7f].map(c => new THREE.Color(c));
    const o = new THREE.Object3D(); let k = 0, s = 7;
    for (let tries = 0; k < n && tries < n*40; tries++){
      const X = x0 + rnd(s++)*(x1 - x0), Y = y0 + rnd(s++)*(y1 - y0);
      if (!dentro(X, Y, poly)) continue;
      const [a, b] = local(l, X, Y);
      if (evitar && (typeof evitar === "function" ? evitar(a, b) : evitar.some(e => Math.abs(a - e[0]) < e[2] && Math.abs(b - e[1]) < e[3]))) continue;
      const r = (2.6 + rnd(s++)*2.6)*(tam || 1), h = (2.5 + rnd(s++)*2.5)*(tam ? Math.sqrt(tam) : 1), y0s = suelo ? suelo(a, b) : 0;
      o.position.set(a, y0s, -b); o.rotation.set(0, 0, 0); o.scale.set(1, h, 1); o.updateMatrix(); mt.setMatrixAt(k, o.matrix);
      o.position.set(a, y0s + h + r*0.7, -b); o.rotation.set(rnd(s++), rnd(s++)*3, 0); o.scale.set(r, r*0.85, r); o.updateMatrix(); mc.setMatrixAt(k, o.matrix);
      mc.setColorAt(k, verdes[Math.floor(rnd(s++)*(verdes.length - (rnd(s++) < .9 ? 1 : 0)))]);
      k++;
    }
    mc.count = mt.count = k; mc.instanceMatrix.needsUpdate = true; if (mc.instanceColor) mc.instanceColor.needsUpdate = true;
    m.solido.add(mc, mt);
  }
  // césped con la forma de la manzana
  function cesped(m, poly, color){
    const l = m.lugar;
    const sh = new THREE.Shape(poly.map(p => { const [a, b] = local(l, p[0], p[1]); return new THREE.Vector2(a, b); }));
    const g = new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2).translate(0, .15, 0);
    m.solido.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({color:color || 0xcfe2bf})));
  }
  const mzDe = l => { const z = MZ.find(q => dentro(l.x, l.y, q.poly)); return z ? z.poly : null; };

  /* ================= SAN NICOLÁS DE BARI → OBELISCO ================= */
  function igleSanNicolas(m){
    const {P_, R_, cruz, cupula} = kitTrazo(m);
    P_(caja(42, 14, 16, 1, 0, 0));
    P_(caja(42.8, .7, 16.8, 1, 13.3, 0));
    [-15, -7, 1, 9, 16].forEach(x => [8.1, -8.7].forEach(z => {
      const sh = new THREE.Shape(); sh.moveTo(-1.7, 0); sh.absarc(0, 0, 1.7, Math.PI, 0, true); sh.closePath();
      P_(new THREE.ExtrudeGeometry(sh, {depth:.6, bevelEnabled:false, curveSegments:5}).translate(x, 14, z), 30);
    }));
    [-15, -7, 1, 9].forEach(x => [8.05, -8.05].forEach(z => {
      R_(enZ(z, rect(x - .9, 7.6, x + .9, 10.4))); R_(enZ(z, rect(x - .55, 7.95, x + .55, 10.05)));
    }));
    R_(enZ(8.05, rect(14.5, 0, 18.5, 6.4))); R_(enZ(8.05, rect(15, 0, 18, 5.9)));
    P_(caja(6, 18, 18, 25, 0, 0));
    const fr = new THREE.Shape(); fr.moveTo(-9, 0); fr.lineTo(9, 0); fr.lineTo(0, 6.5); fr.closePath();
    P_(new THREE.ExtrudeGeometry(fr, {depth:6, bevelEnabled:false}).rotateY(-Math.PI/2).translate(28, 18, 0));
    [-8.6, 8.6].forEach(z => { P_(caja(1.3, 19, 1.3, 28.2, 0, z)); P_(caja(.9, 2.2, .9, 28.2, 19, z)); });
    R_(enX(28.06, arco(0, 0, 5.4, 9, 10))); R_(enX(28.06, arco(0, 0, 4.2, 8.2, 10)));
    R_(enX(28.06, [[0, 0], [0, 5.8]]), false);
    R_(enX(28.06, circ(0, 12.6, 2.1, 20))); R_(enX(28.06, circ(0, 12.6, 1.2, 16)));
    for (let i = 0; i < 8; i++){ const t = Math.PI*i/4; R_(enX(28.06, [[1.2*Math.cos(t), 12.6 + 1.2*Math.sin(t)], [2.1*Math.cos(t), 12.6 + 2.1*Math.sin(t)]]), false); }
    R_(enX(28.06, [[-7, 18.8], [7, 18.8], [0, 23.6]]));
    P_(caja(5.6, 14, 5.6, 25, 18, 0));
    P_(caja(6.6, .8, 6.6, 25, 31.6, 0));
    P_(caja(5, 7, 5, 25, 32.4, 0));
    P_(caja(6, .7, 6, 25, 39.4, 0));
    [27.56, 22.44].forEach(x => [-1.1, 1.1].forEach(c => R_(enX(x, arco(c, 33.2, 1.2, 5, 6)))));
    [2.56, -2.56].forEach(z => [23.9, 26.1].forEach(c => R_(enZ(z, arco(c, 33.2, 1.2, 5, 6)))));
    R_(enX(28.86, rect(-1.2, 24.5, 1.2, 28.5))); R_(enX(28.86, circ(0, 22, .9, 12)));
    P_(new THREE.CylinderGeometry(2.1, 2.1, 2.4, 8).translate(25, 41.3, 0), 30);
    cupula(25, 42.5, 0, 2.3, 1.35, 8);
    P_(new THREE.CylinderGeometry(.45, .45, 1.4, 6).translate(25, 46.3, 0), 40);
    cruz(25, 47, 0, 1);
    P_(caja(8, 12, 13, -24, 0, 0));
    P_(new THREE.CylinderGeometry(4.8, 4.8, 3, 12).translate(-23, 13.5, 0), 30);
    cupula(-23, 15, 0, 5, 1, 12);
    P_(new THREE.CylinderGeometry(.6, .6, 1.6, 6).translate(-23, 20.6, 0), 40);
    cruz(-23, 21.4, 0, 1.1);
    P_(caja(7, 9, 7, -27.5, 0, 6.5));
    cupula(-27.5, 9, 6.5, 2.4, 1, 8);
    cruz(-27.5, 11.2, 6.5, .75);
    R_(enZ(10.06, arco(-27.5, 0, 2.6, 5, 8))); R_(enZ(10.06, circ(-27.5, 7, .8, 12)));
  }
  function obelisco(m){
    const piedra = new THREE.MeshLambertMaterial({color:0xf1ece2});
    const borde = new THREE.LineBasicMaterial({color:0xb8ad9c});
    const junta = new THREE.LineBasicMaterial({color:0xd3cabb});
    const B = 6.8/2, T = 3.5/2, H = 63.5, Hp = 4.2;
    m.solido.add(new THREE.Mesh(new THREE.BoxGeometry(9, .35, 9).translate(0, .175, 0), new THREE.MeshLambertMaterial({color:0xdedad2})));
    const fuste = plana(new THREE.CylinderGeometry(T*Math.SQRT2, B*Math.SQRT2, H, 4, 1).rotateY(Math.PI/4).translate(0, H/2 + .35, 0));
    const punta = plana(new THREE.ConeGeometry(T*Math.SQRT2, Hp, 4).rotateY(Math.PI/4).translate(0, H + .35 + Hp/2, 0));
    [fuste, punta].forEach(g => { m.solido.add(new THREE.Mesh(g, piedra)); rayas(m, bordes(g), borde); });
    const j = [];
    for (let y = 4.2; y < H; y += 4.2){ const s = (B + (T - B)*y/H) + .02, yy = y + .35;
      j.push(...polil([[-s,yy,-s],[s,yy,-s],[s,yy,s],[-s,yy,s]], true)); }
    m.solido.add(new THREE.LineSegments(segs(j), junta));
    const vent = new THREE.Mesh(new THREE.PlaneGeometry(.7, .9), new THREE.MeshBasicMaterial({color:0x3a3530}));
    vent.position.set(0, H + 1.4, T*0.62 + .05); m.solido.add(vent);
    m.solido.add(new THREE.LineSegments(segs(polil([[-1.6,1.2,B+.03],[1.6,1.2,B+.03],[1.6,3.4,B+.03],[-1.6,3.4,B+.03]], true)), borde));
  }

  /* ================= PABELLÓN ARGENTINO → PLAZA SAN MARTÍN ================= */
  function pabellon(m){
    const {P_, R_, cupula} = kitTrazo(m, .32);
    const angel = (x, y, z) => {             // pedestal + figura alada
      P_(caja(1.6, 1, 1.6, x, y, z)); P_(caja(.7, 2.4, .7, x, y + 1, z));
      R_([[x, y + 3.2, z], [x - 2.2, y + 4.6, z + .4], [x - 1.4, y + 2.4, z + .2]]);
      R_([[x, y + 3.2, z], [x + 2.2, y + 4.6, z - .4], [x + 1.4, y + 2.4, z - .2]]);
      R_([[x, y + 3.4, z], [x + .6, y + 4.9, z], [x + 1.1, y + 5.4, z]], false);
    };
    // nave principal y nave alta (claraboya)
    P_(caja(60, 14, 32, 2, 0, 0));
    P_(caja(61, .8, 33, 2, 13.4, 0));
    P_(caja(52, 7, 16, 4, 14, 0));
    P_(prisma(52, 3.5, 16, 4, 21, 0));
    // fachada principal (oeste, -x) con frontón en arco
    P_(caja(8, 20, 36, -32, 0, 0));
    const ar = new THREE.Shape(); ar.moveTo(-12, 0); ar.absarc(0, 0, 12, Math.PI, 0, true); ar.closePath();
    P_(new THREE.ExtrudeGeometry(ar, {depth:8, bevelEnabled:false, curveSegments:10}).rotateY(-Math.PI/2).translate(-28, 20, 0), 25);
    const fx = -36.06;
    R_(enX(fx, arco(0, 4, 13, 27, 12))); R_(enX(fx, arco(0, 4.6, 11.6, 25.6, 12)));
    for (let u = -4.5; u <= 4.5; u += 3) R_(enX(fx, [[u, 4.6], [u, 24]]), false);
    for (let v = 9; v < 25; v += 4) R_(enX(fx, [[-5.8, v], [5.8, v]]), false);
    [-12.5, 12.5].forEach(c => { R_(enX(fx, arco(c, 4, 6, 13, 8))); R_(enX(fx, arco(c, 4.6, 4.8, 12, 8))); R_(enX(fx, [[c, 4.6], [c, 15]]), false); });
    P_(caja(1.4, .7, 36.6, -36.6, 9, 0));                          // balcón corrido
    for (let u = -16; u <= 16; u += 4) R_(enX(-37.3, [[u, 9.7], [u, 11]]), false);
    R_(enX(fx, rect(-15, 0, 15, 4))); for (let u = -12; u <= 12; u += 6) R_(enX(fx, rect(u - 2, 0.6, u + 2, 3.4)));
    // pilonos con ángeles en las esquinas
    [[-36, 18.5], [-36, -18.5]].forEach(([x, z]) => { P_(caja(4, 26, 4, x, 0, z)); P_(caja(4.8, 1, 4.8, x, 26, z)); angel(x, 27, z); });
    [[32, 16.5], [32, -16.5]].forEach(([x, z]) => { P_(caja(3.4, 20, 3.4, x, 0, z)); P_(caja(4, .9, 4, x, 20, z)); });
    [[-28, 18.4], [-28, -18.4]].forEach(([x, z]) => { P_(caja(2.4, 30, 2.4, x, 0, z)); P_(caja(3.2, 1.4, 3.2, x, 30, z)); cupula(x, 31.4, z, 1.6, 1.6, 8); });
    // galería lateral (sur, +z): arcos altos y ventanas
    for (let x = -24; x <= 26; x += 7){ R_(enZ(16.06, arco(x, 2.5, 4.4, 9.5, 8))); R_(enZ(16.06, arco(x, 3, 3.4, 8.5, 8))); R_(enZ(16.06, rect(x - 1.6, 10.6, x + 1.6, 12.6))); }
    for (let x = -27.5; x <= 30; x += 14) P_(caja(1.2, 14.6, 1, x, 0, 16.4));
    for (let x = -24; x <= 26; x += 7){ R_(enZ(-16.06, arco(x, 2.5, 4.4, 9.5, 8))); }
    // cúpulas
    P_(new THREE.CylinderGeometry(8.5, 8.5, 4, 12).translate(6, 23.5, 0), 25);
    cupula(6, 25.5, 0, 8.5, 1.35, 12);
    P_(new THREE.CylinderGeometry(1.2, 1.2, 2.4, 8).translate(6, 38, 0), 30);
    R_([[6, 39.2, 0], [6, 45, 0]], false);
    P_(new THREE.CylinderGeometry(5, 5, 3, 10).translate(20, 22.5, 0), 25);
    cupula(20, 24, 0, 5, 1.3, 10);
    R_([[20, 30.5, 0], [20, 34, 0]], false);
    P_(caja(4, 4, 4, 30, 20.9, 8)); cupula(30, 24.9, 8, 2.4, 1.6, 8); R_([[30, 28.7, 8], [30, 32, 8]], false);
  }
  function plazaSanMartin(m){
    // Plaza San Martín (Retiro): una barranca que baja hacia Av. del Libertador; arriba el monumento ecuestre,
    // abajo el cenotafio de Malvinas; senderos en diagonal, escalinata central y gomeros/tipas muy grandes
    const l = m.lugar, poly = mzDe(l);
    const {S_} = kitSolido(m, 0xe7e2d8, 0xb8ad9c);
    // dirección "barranca abajo" (hacia el río, al noreste) en coordenadas locales
    const o0 = local(l, l.x, l.y), o1 = local(l, l.x + Math.SQRT1_2, l.y + Math.SQRT1_2);
    const dx = o1[0] - o0[0], dy = o1[1] - o0[1];
    const pl = poly ? poly.map(p => local(l, p[0], p[1])) : [[-70,-70],[70,-70],[70,70],[-70,70]];
    const proy = (a, b) => a*dx + b*dy, ps = pl.map(p => proy(p[0], p[1])), p0 = Math.min(...ps), p1 = Math.max(...ps);
    const CAIDA = 9;                                                     // metros de desnivel de la barranca
    const suelo = (a, b) => CAIDA*(1 - (proy(a, b) - p0)/(p1 - p0));
    // césped en pendiente (plano inclinado con la forma de la manzana)
    const sh = new THREE.Shape(pl.map(([a, b]) => new THREE.Vector2(a, b)));
    const g = new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2), pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) pos.setY(k, suelo(pos.getX(k), -pos.getZ(k)) + .15);
    g.computeVertexNormals();
    m.solido.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({color:0xcfe2bf, side:THREE.DoubleSide})));
    // talud: el borde bajo cae vertical hasta la vereda
    const lados = [];
    pl.forEach((p, k) => { const q = pl[(k + 1) % pl.length]; lados.push(p[0], 0, -p[1], q[0], 0, -q[1], p[0], suelo(p[0], p[1]) + .15, -p[1], q[0], 0, -q[1], q[0], suelo(q[0], q[1]) + .15, -q[1], p[0], suelo(p[0], p[1]) + .15, -p[1]); });
    const gl = new THREE.BufferGeometry(); gl.setAttribute("position", new THREE.Float32BufferAttribute(lados, 3)); gl.computeVertexNormals();
    m.solido.add(new THREE.Mesh(gl, new THREE.MeshLambertMaterial({color:0xd9d2c4, side:THREE.DoubleSide})));
    // puntos clave: arriba (monumento) y abajo (cenotafio)
    const R = (p1 - p0)/2, cx = (Math.min(...pl.map(p => p[0])) + Math.max(...pl.map(p => p[0])))/2, cy = (Math.min(...pl.map(p => p[1])) + Math.max(...pl.map(p => p[1])))/2;
    const en = t => [cx + dx*R*t, cy + dy*R*t];                         // t: -1 arriba … +1 abajo, por el eje de la barranca
    const nx = -dy, ny = dx;                                             // perpendicular
    // senderos de tierra clara, apoyados en la pendiente
    const camino = (a0, b0, a1, b1, ancho) => {
      const L = Math.hypot(a1 - a0, b1 - b0), n = Math.max(2, Math.ceil(L/6)), ux = (b0 - b1)/L*ancho/2, uy = (a1 - a0)/L*ancho/2, v = [];
      for (let k = 0; k < n; k++){
        const t0 = k/n, t1 = (k + 1)/n, A = [a0 + (a1 - a0)*t0, b0 + (b1 - b0)*t0], B = [a0 + (a1 - a0)*t1, b0 + (b1 - b0)*t1];
        const P = [[A[0] + ux, A[1] + uy], [A[0] - ux, A[1] - uy], [B[0] - ux, B[1] - uy], [B[0] + ux, B[1] + uy]].map(([a, b]) => [a, suelo(a, b) + .3, -b]);
        v.push(...P[0], ...P[1], ...P[2], ...P[0], ...P[2], ...P[3]);
      }
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); gg.computeVertexNormals();
      m.solido.add(new THREE.Mesh(gg, new THREE.MeshLambertMaterial({color:0xe9e1d0, side:THREE.DoubleSide})));
    };
    const [ma, mb] = en(-.62), [ca, cb] = en(.78);
    camino(ma, mb, ca, cb, 9);                                          // eje central (escalinata)
    [[-1, -1], [1, -1]].forEach(([sx]) => { camino(ma, mb, ca + nx*R*.75*sx, cb + ny*R*.75*sx, 4); camino(ma + nx*R*.7*sx, mb + ny*R*.7*sx, ca, cb, 4); });
    camino(ma - nx*R*.85, mb - ny*R*.85, ma + nx*R*.85, mb + ny*R*.85, 4); // paseo alto, a lo ancho
    // escalinata: escalones a lo largo del eje central
    const esc = [];
    for (let t = -.35; t <= .6; t += .05){ const [a, b] = en(t), y = suelo(a, b) + .35;
      esc.push(a + nx*4.5, y, -(b + ny*4.5), a - nx*4.5, y, -(b - ny*4.5)); }
    m.solido.add(new THREE.LineSegments(segs(esc), new THREE.LineBasicMaterial({color:0xb8ad9c})));
    // MONUMENTO al General San Martín: basamento escalonado, pedestal alto con grupos de figuras y ecuestre de bronce
    const bronce = new THREE.MeshLambertMaterial({color:0x4f5446}), y0 = suelo(ma, mb), ang = Math.atan2(dy, dx);
    const grupo = new THREE.Group(); grupo.position.set(ma, y0, -mb); grupo.rotation.y = ang; m.solido.add(grupo);
    const G = (geo, mat) => { const gm = plana(geo); grupo.add(new THREE.Mesh(gm, mat || new THREE.MeshLambertMaterial({color:0xe7e2d8}))); grupo.add(new THREE.LineSegments(new THREE.EdgesGeometry(gm, 25), new THREE.LineBasicMaterial({color:0xb8ad9c}))); };
    G(caja(24, 1, 24, 0, 0, 0)); G(caja(19, 1, 19, 0, 1, 0)); G(caja(14, 1.2, 14, 0, 2, 0));
    G(caja(9, 3, 9, 0, 3.2, 0)); G(caja(6.5, 9, 6.5, 0, 6.2, 0)); G(caja(7.5, 1, 7.5, 0, 15.2, 0));
    [[5.6, 0], [-5.6, 0], [0, 5.6], [0, -5.6]].forEach(([x, z]) => { G(caja(2, 2.4, 2, x, 6.2, z), bronce); G(caja(1, 1.6, 1, x, 8.6, z), bronce); });   // grupos alegóricos
    G(caja(5.4, 2.4, 1.8, 0, 17.6, 0), bronce); [[-1.9, -.6], [-1.9, .6], [1.9, -.6], [1.9, .6]].forEach(([x, z]) => G(caja(.5, 1.4, .5, x, 16.2, z), bronce));  // caballo
    G(caja(1.6, 1.4, 1.5, 3, 19.2, 0), bronce); G(caja(1.2, 2.4, 1, -.2, 20, 0), bronce); G(caja(.6, .7, .6, -.2, 22.4, 0), bronce); G(caja(.25, .25, 3, .6, 21.2, 1.2), bronce);   // cabeza, jinete, brazo
    // CENOTAFIO de Malvinas: muro largo y bajo de placas oscuras, mástil y llama
    const yc = suelo(ca, cb), ceno = new THREE.Group(); ceno.position.set(ca, yc, -cb); ceno.rotation.y = ang; m.solido.add(ceno);
    const oscuro = new THREE.MeshLambertMaterial({color:0x3d3f45});
    const C = (geo, mat) => { const gm = plana(geo); ceno.add(new THREE.Mesh(gm, mat)); ceno.add(new THREE.LineSegments(new THREE.EdgesGeometry(gm, 25), new THREE.LineBasicMaterial({color:0x8a8a8a}))); };
    C(caja(6, .4, 34, 0, 0, 0), new THREE.MeshLambertMaterial({color:0xd8d2c6}));
    for (let z = -15; z <= 15; z += 3.75) C(caja(.8, 2.6, 3.5, 0, .4, z), oscuro);
    C(caja(.4, 9, .4, 2.2, .4, 0), new THREE.MeshLambertMaterial({color:0xcfcfcf}));
    C(new THREE.ConeGeometry(.5, 1.4, 6).translate(-1.6, 1.1, 0), new THREE.MeshLambertMaterial({color:0xf2a23a}));
    // árboles grandes (gomeros y tipas) siguiendo la pendiente, sin tapar el monumento, la escalinata ni el cenotafio
    const evit = [[ma, mb, 16, 16], [ca, cb, 10, 20]];
    for (let t = -.5; t <= .7; t += .12){ const [a, b] = en(t); evit.push([a, b, 7, 7]); }
    if (poly) arboles(m, poly, 70, evit, suelo, 1.7);
  }


  /* ================= PENITENCIARÍA NACIONAL → PARQUE LAS HERAS ================= */
  function penitenciaria(m){
    const {P_, R_} = kitTrazo(m, .5);
    const A = 112, B = 122;                                     // muro perimetral
    P_(caja(2 * A, 7, 2, 0, 0, B)); P_(caja(2 * A, 7, 2, 0, 0, -B));
    P_(caja(2, 7, 2 * B, A, 0, 0)); P_(caja(2, 7, 2 * B, -A, 0, 0));
    [[A, B], [A, -B], [-A, B], [-A, -B]].forEach(([x, z]) => P_(caja(5, 10, 5, x, 0, z)));
    // centro de vigilancia y pabellones en abanico
    const cx = 18, cz = -20;
    P_(new THREE.CylinderGeometry(9, 9, 15, 8).translate(cx, 7.5, cz), 30);
    P_(new THREE.ConeGeometry(9.5, 5, 8).translate(cx, 17.5, cz), 30);
    P_(new THREE.CylinderGeometry(2, 2, 3, 8).translate(cx, 21, cz), 30);
    for (let i = 0; i < 7; i++){
      const t = THREE.MathUtils.degToRad(-75 + i*32), L = 66;
      const g = (geo) => geo.translate(L/2 + 11, 0, 0).rotateY(t).translate(cx, 0, cz);
      P_(g(caja(L, 10, 9, 0, 0, 0)));
      P_(g(prisma(L, 3.2, 9, 0, 10, 0)));
      P_(g(caja(5, 13, 11, L/2 - 1, 0, 0)));
      const Y = new THREE.Vector3(0, 1, 0), C = new THREE.Vector3(cx, 0, cz);
      const tr = (u, v, w) => { const q = new THREE.Vector3(u + L/2 + 11, v, w).applyAxisAngle(Y, t).add(C); return [q.x, q.y, q.z]; };
      for (let x = -L/2 + 5; x < L/2 - 5; x += 6) [4.56, -4.56].forEach(w => R_(rect(x - 1, 5.5, x + 1, 7.8).map(([u, v]) => tr(u, v, w))));
    }
    // muro curvo de los patios
    const R = 100, a0 = -95, a1 = 135, n = 28;
    for (let i = 0; i < n; i++){
      const t0 = THREE.MathUtils.degToRad(a0 + (a1 - a0)*i/n), t1 = THREE.MathUtils.degToRad(a0 + (a1 - a0)*(i + 1)/n);
      const xa = cx + R*Math.cos(t0), za = cz - R*Math.sin(t0), xb = cx + R*Math.cos(t1), zb = cz - R*Math.sin(t1);
      const L = Math.hypot(xb - xa, zb - za);
      P_(caja(L + .4, 5, 1.4, 0, 0, 0).rotateY(-Math.atan2(zb - za, xb - xa)).translate((xa + xb)/2, 0, (za + zb)/2), 30);
    }
    // edificios de la entrada y administración
    P_(caja(44, 12, 14, -58, 0, 82)); P_(prisma(44, 4, 14, -58, 12, 82));
    P_(caja(16, 15, 16, -58, 0, 100)); P_(prisma(16, 4, 16, -58, 15, 100));
    P_(caja(12, 9, 10, -84, 0, 62)); P_(caja(10, 8, 12, -36, 0, 60)); P_(caja(14, 7, 9, -70, 0, 44)); P_(caja(9, 9, 9, -88, 0, 92));
    for (let x = -76; x <= -40; x += 6) R_(enZ(89.06, rect(x - 1.2, 4, x + 1.2, 8)));
    R_(enZ(108.06, arco(-58, 0, 5, 8, 8)));
    P_(caja(8, 8, 6, 60, 0, 104)); P_(caja(6, 6, 10, 92, 0, -100));
  }
  function parqueLasHeras(m){
    // Parque Las Heras hoy, calcado de la vista aérea (norte arriba): club arriba a la izquierda, canchas de fútbol
    // en el centro-abajo, juegos en círculos, cancha de fútbol-tenis, plaza para perros, fuente, playón gris,
    // la Escuela Normal en Lenguas Vivas y el jardín abajo, senderos de tierra rojiza y muchísimos árboles
    const l = m.lugar, poly = mzDe(l);
    if (poly) cesped(m, poly, 0xc5dcae);
    // foto (px) → metros respecto del lugar (este, norte) → coordenadas locales del modelo
    const F = (px, py) => local(l, l.x - 151 + (px - 140)/4, l.y + 164 - (py - 35)/4);
    const F4 = (x, y) => F(360 + (x - 710)/1.29, 705 + (y - 450)/1.29);       // las capturas más cercanas
    const L = pts => pts.map(p => F(p[0], p[1])), L4 = pts => pts.map(p => F4(p[0], p[1]));
    const mat = c => new THREE.MeshLambertMaterial({color:c, side:THREE.DoubleSide});
    const piso = (pl, y, c) => {
      const g = new THREE.ShapeGeometry(new THREE.Shape(pl.map(([a, b]) => new THREE.Vector2(a, b)))).rotateX(-Math.PI/2).translate(0, y, 0);
      m.solido.add(new THREE.Mesh(g, mat(c)));
    };
    const disco = ([a, b], r, y, c) => m.solido.add(new THREE.Mesh(new THREE.CircleGeometry(r, 28).rotateX(-Math.PI/2).translate(a, y, -b), mat(c)));
    const linea = (pts, y, c) => { const v = []; for (let k = 0; k < pts.length - 1; k++) v.push(pts[k][0], y, -pts[k][1], pts[k + 1][0], y, -pts[k + 1][1]);
      m.solido.add(new THREE.LineSegments(segs(v), new THREE.LineBasicMaterial({color:c}))); };
    const edif = (pl, h, cMuro, cTecho, borde) => {
      const sh = new THREE.Shape(pl.map(([a, b]) => new THREE.Vector2(a, b)));
      const g = plana(new THREE.ExtrudeGeometry(sh, {depth:h, bevelEnabled:false}).rotateX(-Math.PI/2));
      m.solido.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({color:cMuro})));
      m.solido.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 25), new THREE.LineBasicMaterial({color:borde || 0x8c8578})));
      piso(pl, h + .05, cTecho);
    };
    const mezcla = (P, u, v) => [P[0][0]*(1-u)*(1-v) + P[1][0]*u*(1-v) + P[2][0]*u*v + P[3][0]*(1-u)*v, P[0][1]*(1-u)*(1-v) + P[1][1]*u*(1-v) + P[2][1]*u*v + P[3][1]*(1-u)*v];
    // manchones de tierra pelada entre el pasto
    [[300, 560, 14, 9], [520, 620, 16, 10], [250, 820, 13, 9], [420, 380, 12, 7], [760, 560, 11, 8], [980, 760, 12, 8], [700, 640, 9, 6], [1180, 640, 10, 7], [880, 1000, 10, 7]]
      .forEach(([x, y, rx, ry], k) => { const c = F(x, y), pts = [];
        for (let t = 0; t < 14; t++){ const a = t/14*Math.PI*2, q = .8 + rnd(k*20 + t)*.35; pts.push([c[0] + Math.cos(a)*rx*q, c[1] + Math.sin(a)*ry*q]); }
        piso(pts, .2, 0xd8c6a2); });

    // CANCHAS DE FÚTBOL (sintético, 6 canchitas) y vestuarios
    const cancha = L([[650, 770], [850, 820], [730, 1162], [525, 1090]]);
    piso(cancha, .3, 0x3f7a4a);
    linea([...cancha, cancha[0]], .4, 0xe9efe6);
    linea([mezcla(cancha, .5, 0), mezcla(cancha, .5, 1)], .4, 0xe9efe6);
    [1/3, 2/3].forEach(v => linea([mezcla(cancha, 0, v), mezcla(cancha, 1, v)], .4, 0xe9efe6));
    [[.25, 1/6], [.75, 1/6], [.25, .5], [.75, .5], [.25, 5/6], [.75, 5/6]].forEach(([u, v]) => {
      const c = mezcla(cancha, u, v), pts = []; for (let t = 0; t <= 16; t++){ const a = t/16*Math.PI*2; pts.push([c[0] + Math.cos(a)*3.2, c[1] + Math.sin(a)*3.2]); }
      linea(pts, .4, 0xe9efe6); });
    // alambrado alrededor de las canchas
    const al = []; cancha.forEach((p, k) => { const q = cancha[(k + 1) % 4]; for (let t = 0; t < 1; t += .04){ const a = p[0] + (q[0] - p[0])*t, b = p[1] + (q[1] - p[1])*t; al.push(a, 0, -b, a, 4, -b); }
      al.push(p[0], 4, -p[1], q[0], 4, -q[1]); });
    m.solido.add(new THREE.LineSegments(segs(al), new THREE.LineBasicMaterial({color:0x9aa7a0, transparent:true, opacity:.7})));
    edif(L([[490, 1098], [735, 1172], [728, 1200], [483, 1126]]), 4, 0xe4e0d6, 0x6fb9c4);

    // CLUB (techo de chapa marrón) con canchas de polvo de ladrillo, una verde y la pileta
    const club = L([[205, 272], [450, 332], [430, 432], [185, 372]]);
    edif(club, 8, 0xe4dccd, 0x8a5b4c, 0x7a6650);
    edif(L([[250, 300], [420, 342], [415, 360], [245, 318]]), 10, 0xe4dccd, 0x9aa3a8, 0x7a6650);   // lucarna del galpón
    piso(L([[300, 195], [425, 228], [412, 290], [288, 258]]), .35, 0xc0704f);                       // polvo de ladrillo
    linea(L([[362, 211], [350, 274]]), .45, 0xf1e6dc);
    piso(L([[240, 200], [296, 214], [286, 262], [232, 248]]), .35, 0x3e8a5a);                       // cancha verde
    piso(L([[415, 296], [455, 306], [448, 330], [409, 320]]), .4, 0x4fa6d8);                        // pileta
    // explanada blanca con bancos curvos sobre la calle del oeste
    piso(L([[150, 140], [245, 165], [215, 372], [118, 345]]), .3, 0xeeebe4);
    [[190, 230], [175, 300], [200, 175]].forEach(([x, y]) => { const c = F(x, y), pts = [];
      for (let t = 0; t <= 8; t++){ const a = Math.PI*.2 + t/8*Math.PI*.9; pts.push([c[0] + Math.cos(a)*4, c[1] + Math.sin(a)*4]); }
      linea(pts, 1, 0xa39d92); });

    // CANCHA DE VÓLEY / FÚTBOL-TENIS (playón de cemento)
    const vol = L([[393, 592], [478, 607], [462, 668], [378, 652]]);
    piso(vol, .32, 0xd7d2c6); linea([...vol, vol[0]], .42, 0xffffff); linea([mezcla(vol, .5, 0), mezcla(vol, .5, 1)], .42, 0xffffff);
    // JUEGOS: tres círculos de piso de goma con juegos
    const hbP = F4(1850, 195);                                             // habitáculo: sobre el sendero de la derecha, en la esquina de arriba, cerca de las entradas de Las Heras
    const juegos = [[F(362, 706), 11.5], [F(918, 1108), 11.5], [F(1065, 690), 12]];
    juegos.forEach(([c, r], k) => {
      disco(c, r + 1.2, .3, 0xe6dfd2); disco(c, r, .34, 0x4c524f);
      const {S_} = kitSolido(m, [0xf2c14e, 0xe05a47, 0x4d8fd6][k], 0x555555);
      S_(caja(2.2, 2.8, 2.2, c[0] - 3, 0, -c[1] + 1)); S_(prisma(2.6, 1.2, 2.6, c[0] - 3, 2.8, -c[1] + 1));
      S_(caja(5, .25, 1, c[0] + 2, 1.4, -c[1] - 2)); S_(caja(.3, 2.6, .3, c[0] + 4, 0, -c[1] + 3)); S_(caja(.3, 2.6, .3, c[0] + 1, 0, -c[1] + 3)); S_(caja(3.3, .3, .3, c[0] + 2.5, 2.6, -c[1] + 3));
    });
    // FUENTE / juegos de agua sobre Las Heras
    const fu = F(1290, 800); disco(fu, 11, .3, 0xe8e3d8); disco(fu, 6.5, .38, 0x5aa9e0); disco(fu, 1.4, .45, 0xcfe8f7);
    // PLAYÓN gris (patinaje) cerca de CEMIC
    const pl = L([[1045, 885], [1170, 915], [1140, 1035], [1015, 1000]]);
    piso(pl, .3, 0xb9bab6); linea([...pl, pl[0]], .4, 0x8f918c);
    // PLAZA PARA PERROS: cerco bajo
    const pe = L4([[730, 650], [1010, 520], [940, 900], [870, 880], [780, 780]]);
    const ce = []; pe.forEach((p, k) => { const q = pe[(k + 1) % pe.length]; ce.push(p[0], 1.2, -p[1], q[0], 1.2, -q[1]);
      for (let t = 0; t < 1; t += .08){ const a = p[0] + (q[0] - p[0])*t, b = p[1] + (q[1] - p[1])*t; ce.push(a, 0, -b, a, 1.2, -b); } });
    m.solido.add(new THREE.LineSegments(segs(ce), new THREE.LineBasicMaterial({color:0x6b6458})));

    // ESCUELA NORMAL EN LENGUAS VIVAS, anexos y JARDÍN DE INFANTES (borde sur)
    const esc = L([[80, 1095], [300, 1160], [272, 1292], [45, 1222]]);
    edif(esc, 15, 0xe9e6df, 0x7f8f9e);
    edif(L([[292, 1186], [402, 1212], [382, 1322], [272, 1294]]), 11, 0xe9e6df, 0xc9c6bd);
    piso(L([[406, 1215], [548, 1250], [530, 1390], [388, 1352]]), .3, 0xd6c3a0);                     // patio de tierra
    edif(L([[565, 1288], [700, 1322], [690, 1380], [555, 1348]]), 7, 0xe9e6df, 0xb8ab98);
    edif(L([[545, 1225], [640, 1250], [630, 1290], [537, 1266]]), 5, 0xe9e6df, 0x6fb9c4);

    // SENDEROS de tierra rojiza (curvos, como en la foto)
    const sendas = [
      L4([[440, 300], [470, 170], [560, 150], [610, 240], [700, 330], [760, 400]]),
      L4([[760, 410], [870, 420], [980, 460], [1060, 510]]),
      [...L4([[1060, 510], [1060, 420], [1040, 320], [1000, 220], [970, 120], [960, 0]]), F(560, 175)],
      L4([[470, 720], [600, 680], [760, 620], [900, 560], [1060, 510]]),
      L4([[330, 560], [420, 650], [470, 720]]),
      L4([[720, 650], [780, 780], [870, 880], [925, 950]]),
      L4([[1370, 600], [1440, 620], [1520, 690], [1560, 740]]),
      [...L4([[1270, 540], [1330, 470], [1380, 380], [1400, 250], [1390, 120], [1410, 0]]), F(905, 290)],
      L4([[1380, 380], [1500, 330], [1620, 280], [1760, 230], [1900, 180]]),
      L4([[1640, 280], [1700, 160], [1760, 60]]),
      L4([[1820, 620], [1760, 560], [1700, 480], [1620, 420], [1560, 340]]),
      L4([[1560, 740], [1620, 860], [1660, 960], [1600, 1060]]),
      L4([[1430, 975], [1490, 920], [1560, 840], [1560, 740]]),
      L([[330, 470], [430, 470], [520, 500], [610, 560]]),
      L([[150, 620], [180, 520], [250, 470], [330, 470]]),
      L([[250, 940], [330, 880], [400, 840], [470, 820]]),
      L([[600, 175], [700, 190], [800, 240], [905, 290]])
    ];
    const tierra = mat(0xc89678), suaves = [];
    sendas.forEach(pts => {
      const cur = new THREE.CatmullRomCurve3(pts.map(([a, b]) => new THREE.Vector3(a, 0, b))), n = Math.max(8, Math.ceil(cur.getLength()/3));
      const q = cur.getSpacedPoints(n).map(v => [v.x, v.z]); suaves.push(q);
      const v = [];
      for (let k = 0; k < q.length - 1; k++){
        const [a0, b0] = q[k], [a1, b1] = q[k + 1], Lk = Math.hypot(a1 - a0, b1 - b0) || 1, ux = (b0 - b1)/Lk*1.7, uy = (a1 - a0)/Lk*1.7;
        const P = [[a0 + ux, b0 + uy], [a0 - ux, b0 - uy], [a1 - ux, b1 - uy], [a1 + ux, b1 + uy]].map(([a, b]) => [a, .26, -b]);
        v.push(...P[0], ...P[1], ...P[2], ...P[0], ...P[2], ...P[3]);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
      m.solido.add(new THREE.Mesh(g, tierra));
    });

    // ÁRBOLES: muchísimos, de copa ancha, salvo sobre canchas, edificios, juegos, playones y senderos
    const dentroL = (a, b, pts) => dentro(a, b, pts);
    const cercaSeg = (a, b, q, d) => { for (let k = 0; k < q.length - 1; k++){ const [x0, y0] = q[k], [x1, y1] = q[k + 1], dx = x1 - x0, dy = y1 - y0;
      const t = Math.max(0, Math.min(1, ((a - x0)*dx + (b - y0)*dy)/(dx*dx + dy*dy || 1))); if (Math.hypot(a - x0 - dx*t, b - y0 - dy*t) < d) return true; } return false; };
    const libres = [cancha, club, vol, pl, esc, L([[150, 140], [245, 165], [215, 372], [118, 345]]), L([[230, 190], [460, 245], [450, 335], [220, 280]]),
      L([[480, 1090], [745, 1165], [720, 1210], [470, 1130]]), L([[270, 1180], [710, 1240], [700, 1400], [260, 1400]])];
    const evitar = (a, b) => libres.some(p => dentroL(a, b, p)) || juegos.some(([c, r]) => Math.hypot(a - c[0], b - c[1]) < r + 3)
      || Math.hypot(a - fu[0], b - fu[1]) < 13 || suaves.some(q => cercaSeg(a, b, q, 3.2))
      || cercaSeg(a, b, [...cancha, cancha[0]], 4) || Math.hypot(a - hbP[0], b - hbP[1]) < 11;
    if (poly) arboles(m, poly, 300, evitar, null, 1.25);
    habitaculo(m, hbP);
  }
  // HABITÁCULO de .log (módulo itinerante, noviembre en el Parque Las Heras), en azul pleno para distinguirlo.
  // Medidas de las fichas: planta hexagonal (triángulo truncado) 8,35 × 9,67 m, 3 lados largos con puertas
  // abatibles hacia arriba (trapecio 5,98 / 3,02 × 2,96 m, abiertas 73° como alero), altura 3,10–3,49 m, piso a 0,20 m.
  function habitaculo(m, [ha, hb]){
    const g = new THREE.Group(); g.position.set(ha, 0, -hb); g.rotation.y = .35; m.solido.add(g);
    const azul = new THREE.MeshLambertMaterial({color:0x085cf0, side:THREE.DoubleSide});
    const claro = new THREE.MeshLambertMaterial({color:0x5591ff, side:THREE.DoubleSide});
    const oscuro = new THREE.LineBasicMaterial({color:0x011b7f});
    const kx = 8.35/290, ky = 9.67/333, cx = 595, cy = 293.5;                // planta de techos (px) → metros: 8,35 × 9,67
    const V = [[450,235],[640,127],[740,185],[740,400],[640,460],[450,350]].map(([x, y]) => [(x - cx)*kx, (cy - y)*ky]);
    const PISO = .2, H = PISO + 2.98;                                       // piso a 0,20 · altura libre 2,98
    const malla = (geo, mat) => { const gm = plana(geo); g.add(new THREE.Mesh(gm, mat)); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(gm, 20), oscuro)); };
    const losa = (pts, y0, alto, mat) => malla(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))), {depth:alto, bevelEnabled:false}).rotateX(-Math.PI/2).translate(0, y0, 0), mat);
    const cara = (P, mat) => { const v = []; for (let i = 1; i < P.length - 1; i++) v.push(...P[0], ...P[i], ...P[i + 1]);
      const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); malla(gg, mat); };
    const p3 = ([a, b], y) => [a, y, -b];
    // piso (un poco mayor que el techo: 8,71 × 10,09) y techo con su faja
    losa(V.map(([a, b]) => [a*1.043, b*1.043]), 0, PISO, azul);
    losa(V, H, .14, azul); losa(V.map(([a, b]) => [a*.97, b*.97]), H + .14, 3.49 - H - .14, azul);   // altura máx. 3,49
    // lados: los cortos son paños llenos; los largos tienen la abertura en trapecio y la puerta abierta como alero
    for (let i = 0; i < 6; i++){
      const A = V[i], B = V[(i + 1) % 6], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy), t = [dx/L, dy/L], n = [-t[1], t[0]];   // n: hacia afuera (planta en sentido horario)
      const en = (u, y) => p3([A[0] + t[0]*u, A[1] + t[1]*u], y);
      if (L < 4){ cara([en(0, PISO), en(L, PISO), en(L, H), en(0, H)], azul); continue; }
      const ab = (L - 3.02)/2, ar = (L - 5.98)/2;                          // ancho de abertura abajo (3,02) y arriba (5,98)
      cara([en(0, PISO), en(ab, PISO), en(ar, H), en(0, H)], azul);
      cara([en(L - ab, PISO), en(L, PISO), en(L, H), en(L - ar, H)], azul);
      // parantes inclinados de la abertura
      [[ab, ar], [L - ab, L - ar]].forEach(([u0, u1]) => { const a0 = en(u0, PISO), a1 = en(u1, H), d = Math.hypot(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]);
        const post = new THREE.BoxGeometry(.12, d, .12), mesh = new THREE.Mesh(post, azul);
        mesh.position.set((a0[0] + a1[0])/2, (a0[1] + a1[1])/2, (a0[2] + a1[2])/2);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(a1[0] - a0[0], a1[1] - a0[1], a1[2] - a0[2]).normalize()); g.add(mesh); });
      // puerta abierta 73°: bisagra arriba (5,98), borde libre 2,82 m afuera y 0,86 m más abajo (3,02)
      const sale = 2.95*Math.sin(THREE.MathUtils.degToRad(73)), baja = 2.95*Math.cos(THREE.MathUtils.degToRad(73)), c0 = L/2;
      const fuera = (u, d, y) => p3([A[0] + t[0]*u + n[0]*d, A[1] + t[1]*u + n[1]*d], y);
      cara([fuera(c0 - 2.99, 0, H), fuera(c0 + 2.99, 0, H), fuera(c0 + 1.51, sale, H - baja), fuera(c0 - 1.51, sale, H - baja)], azul);
      // pistones
      [c0 - 1.4, c0 + 1.4].forEach(u => g.add(new THREE.LineSegments(segs([...fuera(u, 0, 1.3), ...fuera(u, sale*.55, H - baja*.55)]), oscuro)));
    }
    // estantes con las editoriales contra el paño corto del fondo
    const F0 = V[0], F1 = V[5], fm = [(F0[0] + F1[0])/2, (F0[1] + F1[1])/2];
    const est = new THREE.Group(); est.position.set(fm[0] + .45, PISO, -fm[1]); g.add(est);
    const eb = (w, h, d, x, y, z, mat) => { const gm = plana(caja(w, h, d, x, y, z)); est.add(new THREE.Mesh(gm, mat)); est.add(new THREE.LineSegments(new THREE.EdgesGeometry(gm, 20), oscuro)); };
    for (let y = .3; y < 2.4; y += .45){ eb(.35, .05, 3, 0, y, 0, claro); for (let z = -1.35; z <= 1.35; z += .3) eb(.05, .3, .22, .05, y + .05, z, azul); }
    // zona de hover (invisible, más grande que el módulo para que sea fácil de encontrar en el mapa)
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 7, 12).translate(0, 3.5, 0), new THREE.MeshBasicMaterial({colorWrite:false, depthWrite:false, transparent:true, opacity:0}));
    g.add(hit); m.hab = g; m.habHit = hit;
  }

  /* ================= PALACIO UNZUÉ → BIBLIOTECA NACIONAL ================= */
  function unzue(m){
    const {P_, R_} = kitTrazo(m, .3);
    // cuerpo principal con mansarda
    P_(caja(50, 15, 26, 0, 0, 0));
    P_(caja(51, .8, 27, 0, 15, 0));
    P_(tronco(50, 7, 26, 3.2, 0, 15.8, 0));
    // pabellón central más alto
    P_(caja(18, 18, 30, 0, 0, 1));
    P_(caja(19, .8, 31, 0, 18, 1));
    P_(tronco(18, 9, 30, 2.6, 0, 18.8, 1));
    P_(caja(10, 2, 8, 0, 27.8, 1));
    R_(enZ(16.06, arco(0, 19, 3, 5, 8))); R_(enZ(16.06, circ(-5, 23, .9, 10))); R_(enZ(16.06, circ(5, 23, .9, 10)));
    // chimeneas
    [[-17, 4], [17, 4], [-17, -6], [17, -6]].forEach(([x, z]) => P_(caja(2.2, 6, 1.6, x, 20, z)));
    // ventanas: planta baja y planta alta con frontis
    for (let x = -21; x <= 21; x += 6){ if (Math.abs(x) < 8) continue;
      R_(enZ(13.06, rect(x - 1.3, 2, x + 1.3, 6.5))); R_(enZ(13.06, rect(x - 1.3, 9, x + 1.3, 13)));
      R_(enZ(13.06, [[x - 1.8, 13.5], [x + 1.8, 13.5], [x, 14.6]]));
      R_(enZ(-13.06, rect(x - 1.3, 9, x + 1.3, 13)));
    }
    [-4.5, 0, 4.5].forEach(x => { R_(enZ(16.06, arco(x, 9, 2.8, 5.4, 8))); R_(enZ(16.06, arco(x, 1.5, 2.8, 6, 8))); });
    R_(enZ(16.06, [[-6, 15], [6, 15], [0, 17]]));
    for (let y = 2; y < 15; y += 1.6) R_(enZ(16.07, [[8.6, y], [9, y + .5]]), false);
    // galería con terraza al frente
    P_(caja(54, 1.2, 12, 0, 8.2, 20));
    [-26, -16, -6, 6, 16, 26].forEach(x => P_(caja(1.8, 8.2, 1.8, x, 0, 25)));
    for (let x = -26; x <= 26; x += 2) R_([[x, 9.4, 26.06], [x, 10.6, 26.06]], false);
    R_([[-27, 10.6, 26.06], [27, 10.6, 26.06]], false);
    P_(caja(56, 1, 22, 0, 0, 22));
    [-28, -20, -12, -4, 4, 12, 20, 28].forEach(x => { P_(caja(.9, 2.6, .9, x, 1, 33)); P_(new THREE.SphereGeometry(.7, 6, 4).translate(x, 4.2, 33), 30); });
    // ala baja a la izquierda con entrada
    P_(caja(34, 9, 16, -42, 0, 4));
    P_(caja(35, .7, 17, -42, 9, 4));
    for (let x = -58; x <= -26; x += 2.4) R_([[x, 9.7, 12.56], [x, 10.9, 12.56]], false);
    R_([[-59, 10.9, 12.56], [-25, 10.9, 12.56]], false);
    P_(caja(8, 7.5, 3, -42, 0, 13.5)); P_(prisma(8, 2, 3, -42, 7.5, 13.5).rotateY(0));
    R_(enZ(15.06, arco(-42, 0, 4, 6, 8)));
    [-54, -48, -36, -30].forEach(x => { R_(enZ(12.06, rect(x - 1.3, 2, x + 1.3, 6.5))); R_(enZ(12.06, rect(x - 1, 2.4, x + 1, 6.1))); });
    P_(caja(3, 1.2, 4, -42, 0, 17));
  }
  function biblioteca(m){
    const horm = 0xbcb5a8;
    const {S_} = kitSolido(m, horm, 0x8c8578);
    const vid = new THREE.MeshLambertMaterial({color:0x3e5c94});
    const losa = new THREE.MeshLambertMaterial({color:0xd8d3c8});
    S_(caja(80, .6, 64, 0, 0, 6), losa);
    // cuatro pilares y núcleo
    [[-12, -12], [12, -12], [-12, 12], [12, 12]].forEach(([x, z]) => S_(caja(6, 26, 6, x, 0, z)));
    S_(caja(9, 26, 9, 0, 0, 0));
    S_(caja(24, 3, 20, 0, 9, 0)); S_(caja(22.5, 3.2, 18.5, 0, 12, 0), vid); S_(caja(24, 1.4, 20, 0, 15.2, 0));
    S_(caja(22, 2.6, 18, 0, 17.6, 0), vid); S_(caja(24, 1.2, 20, 0, 20.2, 0));
    // gran volumen superior en voladizo
    S_(caja(52, 3, 46, 0, 24, 0));
    S_(caja(54, 1.2, 48, 0, 27, 0));
    S_(caja(50.5, 3.4, 44.5, 0, 28.2, 0), vid);
    S_(caja(53, 2.2, 47, 0, 31.6, 0));
    S_(caja(50.5, 3.6, 44.5, 0, 33.8, 0), vid);
    S_(caja(52, 2.4, 46, 0, 37.4, 0));
    // balcones/aleros de la fachada
    [[0, 23.4, 24.6, 30, 2.4], [0, 23.4, -24.6, 30, 2.4]].forEach(([x, y, z, w, d]) => S_(caja(w, 1.4, d, x, y, z)));
    S_(caja(20, 1.6, 3, -8, 31.6, 24.8)); S_(caja(20, 1.6, 3, 8, 31.6, -24.8));
    // azotea
    S_(caja(10, 4, 8, -10, 39.8, -6)); S_(new THREE.CylinderGeometry(2.6, 2.6, 5, 12).translate(12, 42.3, 6));
    // montantes de las ventanas
    const mo = [];
    for (let x = -24; x <= 24; x += 3) [[28.2, 31.6], [33.8, 37.4]].forEach(([a, b]) => { mo.push(x, a, 22.3, x, b, 22.3, x, a, -22.3, x, b, -22.3); });
    for (let z = -21; z <= 21; z += 3) [[28.2, 31.6], [33.8, 37.4]].forEach(([a, b]) => { mo.push(25.3, a, z, 25.3, b, z, -25.3, a, z, -25.3, b, z); });
    m.solido.add(new THREE.LineSegments(segs(mo), new THREE.LineBasicMaterial({color:0x2a3a5c})));
  }


  /* ================= PRIMER TEATRO COLÓN → BANCO NACIÓN ================= */
  // manzana de Rivadavia, Reconquista, Bartolomé Mitre y 25 de Mayo. Local: +x ≈ este, +z ≈ sur (Plaza de Mayo)
  function teatroColon(m){
    const {P_, R_} = kitTrazo(m, .3);
    // cuerpo del teatro en la esquina de Rivadavia y Reconquista, fachada hacia la plaza
    const X = -22, Z = 26, fz = 54;                               // centro y frente (z) del edificio
    P_(caja(66, 17, 56, X, 0, Z)); P_(caja(67, .8, 57, X, 16.6, Z));
    P_(caja(28, 21, 4, X, 0, fz + 2)); P_(caja(29, .9, 5, X, 20.4, fz + 2));        // cuerpo central adelantado
    const tri = new THREE.Shape(); tri.moveTo(-14.5, 0); tri.lineTo(14.5, 0); tri.lineTo(0, 5.5); tri.closePath();
    P_(new THREE.ExtrudeGeometry(tri, {depth:1.4, bevelEnabled:false}).translate(X, 21.3, fz + 2.6));   // frontón
    // sala: techo en tronco y caja escénica más alta atrás
    P_(tronco(42, 7, 36, 6, X, 17.4, Z + 4));
    P_(caja(34, 28, 14, X, 0, Z - 20)); P_(prisma(34, 5, 14, X, 28, Z - 20));
    // fachada a la plaza: arcos abajo, ventanas con balcón arriba, pilastras
    const fc = fz + 4.06, fl = fz + .06;
    for (let x = X - 11; x <= X + 11; x += 5.5){ R_(enZ(fc, arco(x, 0, 3.6, 7.5, 8))); R_(enZ(fc, arco(x, 10.5, 2.4, 6, 8))); R_(enZ(fc, [[x - 2, 10], [x + 2, 10]]), false); }
    [[X - 31, X - 16], [X + 16, X + 31]].forEach(([a, b]) => { for (let x = a + 2.5; x <= b; x += 5){ R_(enZ(fl, arco(x, .5, 2.6, 6.5, 8))); R_(enZ(fl, arco(x, 9.5, 2.2, 5.5, 8))); } });
    for (let x = X - 14; x <= X + 14; x += 5.5) R_(enZ(fc, [[x - 2.75, 8.8], [x - 2.75, 20]]), false);
    for (let x = X - 31; x <= X + 31; x += 3) R_(enZ(fl, [[x, 17.4], [x, 18.6]]), false);                  // balaustrada
    R_(enZ(fl, [[X - 33, 18.6], [X + 33, 18.6]]), false);
    // lateral sobre Reconquista
    const lx = X - 33.06;
    for (let u = Z - 24; u <= Z + 24; u += 6){ R_(enX(lx, arco(u, 1, 2.4, 6, 8))); R_(enX(lx, arco(u, 9.5, 2.2, 5.5, 8))); }
    // el resto de la manzana: casas bajas con patio
    [[30, -30, 32, 9, 28], [33, 10, 26, 8, 26], [34, 42, 24, 10, 22], [-20, -46, 56, 7, 18]].forEach(([x, z, w, h, d]) => { P_(caja(w, h, d, x, 0, z)); P_(caja(w + .6, .5, d + .6, x, h - .3, z)); });
  }
  function bancoNacion(m){
    const l = m.lugar, poly = mzDe(l);
    const {S_} = kitSolido(m, 0xe6e0d4, 0xa99f8d);
    const pl = (poly || rect(-57, -58, 57, 58).map(([a, b]) => [l.x + a, l.y + b])).map(p => local(l, p[0], p[1]));
    // inset de 2 m para que se vea la vereda
    const cx = pl.reduce((s, p) => s + p[0], 0)/pl.length, cy = pl.reduce((s, p) => s + p[1], 0)/pl.length;
    const pin = pl.map(([a, b]) => { const d = Math.hypot(a - cx, b - cy) || 1; return [a - (a - cx)/d*2, b - (b - cy)/d*2]; });
    const losa = (pts, h, y) => S_(new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b))), {depth:h, bevelEnabled:false}).rotateX(-Math.PI/2).translate(0, y, 0));
    losa(pin, 30, 0);
    const pin2 = pin.map(([a, b]) => [cx + (a - cx)*.93, cy + (b - cy)*.93]);
    losa(pin2, 3.5, 30);                                            // ático retirado
    // gran cúpula del hall central
    S_(new THREE.CylinderGeometry(19, 19, 3, 24).translate(cx, 33.5 + 1.5, -cy));
    S_(new THREE.SphereGeometry(19, 24, 6, 0, Math.PI*2, 0, Math.PI/2).scale(1, .32, 1).translate(cx, 36.5, -cy), new THREE.MeshLambertMaterial({color:0xcfd3cf}), 10);
    // columnata monumental sobre la plaza (lado sur de la manzana)
    let sur = 0; pl.forEach((p, k) => { if (p[1] + pl[(k + 1) % pl.length][1] < pl[sur][1] + pl[(sur + 1) % pl.length][1]) sur = k; });
    const A = pin[sur], B = pin[(sur + 1) % pin.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0])/L, uy = (B[1] - A[1])/L;
    const nx = -uy, ny = ux, sg = ((cx - A[0])*nx + (cy - A[1])*ny) > 0 ? -1 : 1;   // normal hacia afuera
    const piedra = new THREE.MeshLambertMaterial({color:0xefeadf}), sombra = new THREE.MeshLambertMaterial({color:0x8d8676});
    const ang = Math.atan2(uy, ux);
    const en = (t, o) => [A[0] + ux*t + nx*sg*o, A[1] + uy*t + ny*sg*o];
    { const [a, b] = en(L/2, -2.2); S_(caja(L*.62, 22, 1.5, 0, 2, 0).rotateY(ang).translate(a, 0, -b), sombra); }   // fondo en sombra del pórtico
    for (let i = 0; i < 8; i++){ const t = L*.2 + L*.6*i/7, [a, b] = en(t, 1.2); S_(new THREE.CylinderGeometry(1.2, 1.35, 22, 12).translate(a, 13, -b), piedra, 30); }
    { const [a, b] = en(L/2, 1.2); S_(caja(L*.66, 4, 3.6, 0, 24, 0).rotateY(ang).translate(a, 0, -b), piedra); S_(caja(L*.68, 2, 4.6, 0, 0, 0).rotateY(ang).translate(a, 0, -b), piedra); }
  }

  /* ================= PARQUE DE DIVERSIONES DE RETIRO → HOTEL SHERATON ================= */
  // frente a la Torre Monumental. Local: +x hacia Catalinas (sur), entrada del lado de la torre (-x)
  function parqueRetiro(m){
    const {P_, R_} = kitTrazo(m, .3);
    // portada con el arco "PARQUE RETIRO"
    [-9, 9].forEach(z => { P_(caja(2.4, 7, 2.4, -62, 0, z)); P_(caja(3, .8, 3, -62, 7, z)); });
    P_(new THREE.TorusGeometry(9, .45, 4, 18, Math.PI).rotateY(Math.PI/2).translate(-62, 7, 0), 40);
    P_(new THREE.TorusGeometry(7.6, .3, 4, 18, Math.PI).rotateY(Math.PI/2).translate(-62, 7, 0), 40);
    for (let i = 1; i < 8; i++){ const t = Math.PI*i/8; R_([[-62, 7 + 7.6*Math.sin(t), 7.6*Math.cos(t)], [-62, 7 + 9*Math.sin(t), 9*Math.cos(t)]], false); }
    // calle central con pabellones y kioscos a los dos lados
    for (let x = -52; x <= 30; x += 11){
      [-1, 1].forEach(sz => {
        const h = 5 + ((x*7 + sz*3) & 3), z = sz*15;
        P_(caja(9, h, 10, x, 0, z));
        P_(caja(9.6, .5, 11, x, h, z));
        P_(caja(8, 1.8, .4, x, h - 2.6, z - sz*5.3));                 // cartel sobre el frente
        R_(enZ(z - sz*5.06, rect(x - 3, 0, x + 3, h - 3.2)));
      });
    }
    // vuelta al mundo
    // vuelta al mundo (de frente hacia la torre y hacia el sur)
    const wx = 18, wz = -40, wr = 17, wh = 20;
    [-1.4, 1.4].forEach(dx => {
      P_(new THREE.TorusGeometry(wr, .35, 4, 36).rotateY(Math.PI/2).translate(wx + dx, wh, wz), 60);
      for (let i = 0; i < 16; i++){ const t = 2*Math.PI*i/16; R_([[wx + dx, wh, wz], [wx + dx, wh + wr*Math.sin(t), wz + wr*Math.cos(t)]], false); }
    });
    for (let i = 0; i < 16; i++){ const t = 2*Math.PI*i/16, z = wz + wr*Math.cos(t), y = wh + wr*Math.sin(t); P_(caja(2.2, 1.6, 1.6, wx, y - 2.4, z)); R_([[wx - 1.4, y, z], [wx + 1.4, y, z]], false); }
    [-1, 1].forEach(sx => { R_([[wx + sx*2, wh, wz], [wx + sx*4, 0, wz - 9]], false); R_([[wx + sx*2, wh, wz], [wx + sx*4, 0, wz + 9]], false); });
    P_(caja(10, .6, 22, wx, 0, wz));
    // montaña rusa: rieles sobre caballetes de madera
    const rx = 50, rz = 22, ra = 20, rb = 14, n = 64, r1 = [], r2 = [], postes = [];
    for (let i = 0; i <= n; i++){
      const t = 2*Math.PI*i/n, y = 7 + 5*Math.sin(3*t) + 3*Math.cos(t);
      const x = rx + ra*Math.cos(t), z = rz + rb*Math.sin(t), dx = -Math.sin(t), dz = Math.cos(t)*rb/ra, d = Math.hypot(dx, dz);
      r1.push([x - dz/d*.8, y, z + dx/d*.8]); r2.push([x + dz/d*.8, y, z - dx/d*.8]);
      if (i % 2 === 0 && i < n) postes.push([[x, 0, z], [x, y, z]], [[r1[i][0], y, r1[i][2]], [r2[i][0], y, r2[i][2]]]);
    }
    R_(r1, false); R_(r2, false); postes.forEach(p => R_(p, false));
    // calesita
    const cx = -26, cz = -34;
    P_(new THREE.CylinderGeometry(7, 7, 1, 16).translate(cx, .5, cz), 40);
    P_(new THREE.ConeGeometry(8, 3.5, 16).translate(cx, 6.8, cz), 40);
    for (let i = 0; i < 12; i++){ const t = 2*Math.PI*i/12; R_([[cx + 6*Math.cos(t), 1, cz + 6*Math.sin(t)], [cx + 6*Math.cos(t), 5, cz + 6*Math.sin(t)]], false); }
    P_(new THREE.CylinderGeometry(.6, .6, 5, 6).translate(cx, 3.5, cz), 40);
    // pabellón grande (tren fantasma / teatro) y cerco perimetral
    P_(caja(20, 9, 13, -46, 0, -36)); P_(prisma(20, 4, 13, -46, 9, -36));
    R_(rect(-64, -56, 76, 46).map(([x, z]) => [x, 2, z]));
  }
  function sheraton(m){
    const l = m.lugar, poly = mzDe(l);
    const {S_, mat} = kitSolido(m, 0xe2ded6, 0x9d978c);
    const vidrio = new THREE.MeshLambertMaterial({color:0x6f7f90});
    S_(caja(92, 9, 46, -6, 0, 4));                                  // basamento y centro de convenciones
    S_(caja(64, 74, 17, -8, 9, 0));                                 // torre del hotel
    S_(caja(42, 4, 12, -8, 83, 0));                                 // remate de máquinas
    const pisos = [];
    for (let y = 12; y < 83; y += 3.1) [8.56, -8.56].forEach(z => pisos.push(-40, y, z, 24, y, z));
    for (let x = -36; x <= 20; x += 4) [8.56, -8.56].forEach(z => pisos.push(x, 9, z, x, 83, z));
    m.solido.add(new THREE.LineSegments(segs(pisos), new THREE.LineBasicMaterial({color:0xa9a398})));
    // torres de Catalinas Norte, hacia el sur
    [[100, -22, 24, 68, 24], [104, 34, 22, 58, 20], [138, 6, 20, 52, 20]].forEach(([x, z, w, h, d]) => {
      S_(caja(w, h, d, x, 0, z), vidrio);
      const b = [];
      for (let y = 4; y < h; y += 4) b.push(x - w/2, y, z + d/2 + .06, x + w/2, y, z + d/2 + .06, x - w/2, y, z - d/2 - .06, x + w/2, y, z - d/2 - .06);
      m.solido.add(new THREE.LineSegments(segs(b), new THREE.LineBasicMaterial({color:0x4b5866})));
    });
    if (poly) arboles(m, poly, 50, (a, b) => (Math.abs(a + 6) < 52 && Math.abs(b + 4) < 28) || (a > 84 && a < 152 && b > -50 && b < 38) || Math.hypot(a, b) > 160);
  }

  /* ================= PALACIO MIRÓ → PLAZA LAVALLE ================= */
  // manzana de Viamonte, Talcahuano, Tucumán y Uruguay. Local: +x ≈ este, +z ≈ sur
  const redondo = (w, d, r) => { const s = new THREE.Shape(), a = w/2, b = d/2;
    s.moveTo(-a + r, -b); s.lineTo(a - r, -b); s.absarc(a - r, -b + r, r, -Math.PI/2, 0); s.lineTo(a, b - r); s.absarc(a - r, b - r, r, 0, Math.PI/2);
    s.lineTo(-a + r, b); s.absarc(-a + r, b - r, r, Math.PI/2, Math.PI); s.lineTo(-a, -b + r); s.absarc(-a + r, -b + r, r, Math.PI, Math.PI*1.5); return s; };
  const losaR = (w, d, r, h, y) => new THREE.ExtrudeGeometry(redondo(w, d, r), {depth:h, bevelEnabled:false, curveSegments:6}).rotateX(-Math.PI/2).translate(0, y, 0);
  const contorno = (w, d, r, n) => redondo(w, d, r).getSpacedPoints(n).map(p => [p.x, -p.y]);   // puntos [x, z] repartidos parejo
  function palacioMiro(m){
    const {P_, R_, cupula} = kitTrazo(m, .25);
    const W = 34, D = 26;
    // planta baja: cuerpo retirado y galería de columnas corintias alrededor
    P_(losaR(W - 6, D - 6, 3, 6.4, 0), 30);
    contorno(W - 1.2, D - 1.2, 4.4, 36).forEach(([x, z]) => { P_(new THREE.CylinderGeometry(.35, .38, 5.6, 8).translate(x, 2.8, z), 40); P_(caja(.9, .5, .9, x, 5.6, z)); });
    P_(losaR(W, D, 5, .8, 6.1), 30);                                         // balcón corrido
    contorno(W - .4, D - .4, 4.8, 90).forEach(([x, z]) => R_([[x, 6.9, z], [x, 7.9, z]], false));
    R_(contorno(W - .4, D - .4, 4.8, 90).map(([x, z]) => [x, 7.9, z]));
    // planta alta con ventanas en arco, óculos y nichos con estatuas
    P_(losaR(W - 4, D - 4, 4, 6.2, 6.9), 30);
    P_(losaR(W - 3, D - 3, 4.5, .7, 13.1), 30);
    R_(contorno(W - 3.2, D - 3.2, 4.4, 80).map(([x, z]) => [x, 14.6, z]));
    contorno(W - 3.2, D - 3.2, 4.4, 80).forEach(([x, z], i) => { if (i % 2 === 0) R_([[x, 13.8, z], [x, 14.6, z]], false); });
    const fz = D/2 - 2 + .06, fx = W/2 - 2 + .06;
    for (let x = -10; x <= 10; x += 5){ R_(enZ(fz, arco(x, 7.6, 2.2, 3.8, 8))); R_(enZ(-fz, arco(x, 7.6, 2.2, 3.8, 8))); R_(enZ(fz, circ(x + 2.5, 12, .55, 8).map(([a, b]) => [a, b]))); }
    for (let x = -7.5; x <= 7.5; x += 5){ P_(caja(.9, 2.2, .7, x, 8, fz + .2)); P_(caja(.5, .5, .5, x, 10.2, fz + .2)); }
    for (let u = -6; u <= 6; u += 4){ R_(enX(fx, arco(u, 7.6, 2, 3.8, 8))); R_(enX(-fx, arco(u, 7.6, 2, 3.8, 8))); }
    // tambor con balaustrada y mirador con cupulín
    P_(new THREE.CylinderGeometry(5.4, 5.4, 4, 16).translate(0, 15.8, 0), 30);
    P_(new THREE.CylinderGeometry(6, 6, .5, 16).translate(0, 18, 0), 30);
    R_(circ(0, 0, 5.8, 32).map(([a, b]) => [a, 19.2, b]));
    for (let i = 0; i < 16; i++){ const t = 2*Math.PI*i/16; R_([[5.8*Math.cos(t), 18.2, 5.8*Math.sin(t)], [5.8*Math.cos(t), 19.2, 5.8*Math.sin(t)]], false); }
    for (let i = 0; i < 8; i++){ const t = 2*Math.PI*i/8; R_([[2.6*Math.cos(t), 18.2, 2.6*Math.sin(t)], [2.6*Math.cos(t), 22.6, 2.6*Math.sin(t)]], false); }
    P_(new THREE.CylinderGeometry(2.9, 2.9, .5, 12).translate(0, 22.8, 0), 30);
    cupula(0, 23, 0, 2.6, 1.3, 10);
    R_([[0, 26.4, 0], [0, 28.4, 0]], false);
    // reja perimetral con pilares y jarrones en la entrada
    const l = m.lugar, poly = mzDe(l);
    if (poly){
      const pl = poly.map(p => local(l, p[0], p[1])), cx = pl.reduce((s, p) => s + p[0], 0)/pl.length, cy = pl.reduce((s, p) => s + p[1], 0)/pl.length;
      const rj = pl.map(([a, b]) => { const d = Math.hypot(a - cx, b - cy) || 1; return [a - (a - cx)/d*3, -(b - (b - cy)/d*3)]; });
      R_(rj.map(([x, z]) => [x, 2.2, z])); R_(rj.map(([x, z]) => [x, .3, z]));
      rj.forEach(([x, z], k) => { const [x2, z2] = rj[(k + 1) % rj.length], L = Math.hypot(x2 - x, z2 - z);
        for (let t = 0; t < L; t += 2.5) R_([[x + (x2 - x)*t/L, .3, z + (z2 - z)*t/L], [x + (x2 - x)*t/L, 2.2, z + (z2 - z)*t/L]], false); });
      const zf = Math.max(...rj.map(p => p[1]));
      [-6, 6].forEach(x => { P_(caja(1.6, 3.2, 1.6, x, 0, zf)); P_(new THREE.CylinderGeometry(.6, .35, 1.1, 8).translate(x, 3.75, zf), 30); });
      R_([[0, 0, zf], [0, 0, D/2 + 1]], false);
    }
  }
  function plazaLavalle(m){
    const l = m.lugar, poly = mzDe(l);
    if (poly) cesped(m, poly);
    const {S_} = kitSolido(m, 0xe7e2d8, 0xb8ad9c);
    const tierra = new THREE.MeshLambertMaterial({color:0xe9e1d0});
    const pl = poly ? poly.map(p => local(l, p[0], p[1])) : [[-55, -50], [55, -50], [55, 50], [-55, 50]];
    const xs = pl.map(p => p[0]), ys = pl.map(p => p[1]), x0 = Math.min(...xs) + 4, x1 = Math.max(...xs) - 4, y0 = Math.min(...ys) + 4, y1 = Math.max(...ys) - 4;
    const senda = (a0, b0, a1, b1, w) => { const L = Math.hypot(a1 - a0, b1 - b0);
      m.solido.add(new THREE.Mesh(new THREE.BoxGeometry(L, .2, w).rotateY(Math.atan2(b1 - b0, a1 - a0)).translate((a0 + a1)/2, .3, -(b0 + b1)/2), tierra)); };
    senda(x0, y0, x1, y1, 4); senda(x0, y1, x1, y0, 4); senda(x0, 0, x1, 0, 3); senda(0, y0, 0, y1, 3);
    // Monumento a Lavalle: basamento, pedestal y columna con la estatua
    const mx = 0, mz = 0;
    S_(caja(12, .8, 12, mx, 0, mz)); S_(caja(8, 1, 8, mx, .8, mz)); S_(caja(5, 4.5, 5, mx, 1.8, mz)); S_(caja(5.8, .8, 5.8, mx, 6.3, mz));
    S_(new THREE.CylinderGeometry(1, 1.15, 16, 16).translate(mx, 15.1, mz), null, 40);
    S_(caja(2.8, 1.4, 2.8, mx, 23.1, mz));
    const bronce = new THREE.MeshLambertMaterial({color:0x4f5446});
    S_(new THREE.CylinderGeometry(.5, .7, 2.6, 8).translate(mx, 25.8, mz), bronce, 40); S_(new THREE.SphereGeometry(.45, 8, 6).translate(mx, 27.5, mz), bronce, 40);
    // fuente baja en un costado
    S_(new THREE.CylinderGeometry(6, 6, .7, 20).translate(-30, .35, 22), null, 40);
    m.solido.add(new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, .1, 20).translate(-30, .72, 22), new THREE.MeshLambertMaterial({color:0x9cc3e0})));
    if (poly) arboles(m, poly, 60, (a, b) => Math.hypot(a, b) < 10 || Math.hypot(a + 30, b + 22) < 9 || Math.abs(a - b*(x1 - x0)/(y1 - y0)) < 4 || Math.abs(a + b*(x1 - x0)/(y1 - y0)) < 4 || Math.abs(a) < 3 || Math.abs(b) < 3, null, 1.2);
  }

  /* ================= CEMENTERIO SUD → PARQUE AMEGHINO (solo miniatura: queda fuera de la zona del mapa) ================= */
  function parqueAmeghino(m){
    const {S_} = kitSolido(m, 0xe7e2d8, 0xb8ad9c);
    const A = 62, B = 58, poly = [[-A, -B], [A, -B], [A, B], [-A, B]];
    m.solido.add(new THREE.Mesh(new THREE.BoxGeometry(2*A, .3, 2*B).translate(0, .15, 0), new THREE.MeshLambertMaterial({color:0xcfe2bf})));
    const tierra = new THREE.MeshLambertMaterial({color:0xe9e1d0});
    const senda = (a0, b0, a1, b1, w) => { const L = Math.hypot(a1 - a0, b1 - b0);
      m.solido.add(new THREE.Mesh(new THREE.BoxGeometry(L, .2, w).rotateY(Math.atan2(b1 - b0, a1 - a0)).translate((a0 + a1)/2, .4, -(b0 + b1)/2), tierra)); };
    senda(-A + 3, -B + 3, A - 3, B - 3, 4); senda(-A + 3, B - 3, A - 3, -B + 3, 4); senda(-A, 0, A, 0, 3.5); senda(0, -B, 0, B, 3.5);
    m.solido.add(new THREE.Mesh(new THREE.RingGeometry(13, 17, 40).rotateX(-Math.PI/2).translate(0, .45, 0), tierra));
    // monumento a las víctimas de la fiebre amarilla: basamento escalonado, pedestal y grupo escultórico
    S_(caja(14, .8, 14, 0, 0, 0)); S_(caja(10, 1, 10, 0, .8, 0)); S_(caja(6, 6, 6, 0, 1.8, 0)); S_(caja(7, .9, 7, 0, 7.8, 0));
    const bronce = new THREE.MeshLambertMaterial({color:0x4f5446});
    S_(caja(4.4, 1.2, 3, 0, 8.7, 0), bronce); S_(new THREE.CylinderGeometry(.8, 1.1, 3.4, 8).translate(-.6, 11.6, 0), bronce, 40);
    S_(new THREE.SphereGeometry(.6, 8, 6).translate(-.6, 13.7, 0), bronce, 40); S_(caja(1.4, 2.2, 1, 1.4, 9.9, .4), bronce);
    // reja perimetral baja
    const rj = []; poly.forEach((p, k) => { const q = poly[(k + 1) % 4]; rj.push(p[0], 1.4, -p[1], q[0], 1.4, -q[1]);
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]); for (let t = 0; t < L; t += 3) rj.push(p[0] + (q[0] - p[0])*t/L, .3, -(p[1] + (q[1] - p[1])*t/L), p[0] + (q[0] - p[0])*t/L, 1.4, -(p[1] + (q[1] - p[1])*t/L)); });
    m.solido.add(new THREE.LineSegments(segs(rj), new THREE.LineBasicMaterial({color:0x8a8a8a})));
    const l = m.lugar, mundo = poly.map(([a, b]) => [l.x + a, l.y + b]);
    arboles(m, mundo, 70, (a, b) => Math.hypot(a, b) < 19 || Math.abs(a - b*A/B) < 4 || Math.abs(a + b*A/B) < 4 || Math.abs(a) < 3 || Math.abs(b) < 3 || Math.abs(a) > A - 3 || Math.abs(b) > B - 3, null, 1.2);
  }
  // modelos que no van en la escena del mapa: solo para la miniatura del buscador
  const MINIS = [];
  [{id:"cementerio-sud", x:-1200, y:-3900, rot:0, hoy:parqueAmeghino}].forEach(l => {
    const m = {lugar:l, cual:"hoy", raiz:new THREE.Group(), solido:new THREE.Group(), fantasma:new THREE.Group(), matF:new THREE.LineBasicMaterial({transparent:true, opacity:0})};
    m.raiz.add(m.solido, m.fantasma); l.hoy(m); MINIS.push(m);
  });

  // armado de cada lugar
  const ARMAR = {
    "iglesia-san-nicolas-de-bari": [igleSanNicolas, obelisco],
    "pabellon-argentino": [pabellon, plazaSanMartin],
    "penitenciaria-nacional": [penitenciaria, parqueLasHeras],
    "palacio-unzue": [unzue, biblioteca],
    "primer-teatro-colon": [teatroColon, bancoNacion],
    "parque-diversiones-retiro": [parqueRetiro, sheraton],
    "palacio-miro": [palacioMiro, plazaLavalle]
  };
  LUG.filter(l => l.modelo).forEach(l => {
    const [fa, fh] = ARMAR[l.id];
    l.antesM = nuevoModelo(l, "antes"); fa(l.antesM);
    l.hoyM = nuevoModelo(l, "hoy"); fh(l.hoyM);
    if (fh === plazaSanMartin || fh === parqueLasHeras || fh === plazaLavalle){ l.hoyM.solido.position.y = l.hoyM.fantasma.position.y = 1.3; }
  });

  /* ---------- estado: un año de la línea de tiempo, o "antes" (cada lugar en su época) ---------- */
  // l.per = [desde, hasta, hoy desde]: años del edificio anterior y desde cuándo existe lo de hoy
  const ANIO_MIN = 1700, ANIO_MAX = 2026;
  let modo = "anio", anio = ANIO_MAX, epoca = "hoy";
  function cualBase(l){
    if (modo === "antes") return "antes";
    if (!l.per) return "hoy";
    const [a0, a1, h0] = l.per;
    return anio >= h0 ? "hoy" : anio >= a0 && anio <= a1 ? "antes" : null;   // null: todavía no existía, o terreno vacío
  }
  // filtros del panel: tipo (de lo que se ve en ese momento) y uso original del lugar
  const FILTROS = {tipo:new Set(["edificio", "parque", "monumento", "iglesia"]), uso:new Set(["residencial", "institucional", "religioso", "exposiciones", "cultural", "recreativo"])};
  function cualDe(l){
    const c = cualBase(l);
    if (!c || !l.tipoA) return c;
    return FILTROS.tipo.has(c === "hoy" ? l.tipoH : l.tipoA) && FILTROS.uso.has(l.uso) ? c : null;
  }
  // si en ese año no había nada en el lugar, se oculta: etiqueta, modelos y trazo fantasma
  function rotular(){
    LUG.filter(l => l.per).forEach(l => {
      const c = cualDe(l);
      l.el.hidden = !c;
      if (c) l.el.innerHTML = c === "hoy" ? `<b>${l.hoyN}</b><span>${l.hoyA} · antes: ${l.nombre}</span>`
                                          : `<b>${l.nombre}</b><span>${l.antesA} · hoy: ${l.hoyN}</span>`;
    });
  }
  const ficha = document.getElementById("mapa-ficha");
  let fichaDe = null;
  function llenarFicha(l){
    fichaDe = l; if (!ficha) return;
    if (!l){ ficha.hidden = true; return; }
    ficha.hidden = false;
    const [ih, ia] = ficha.querySelectorAll(".mf-img img"), [th, ta] = ficha.querySelectorAll(".mf-txt p");
    ih.src = l.imgHoy; ih.alt = l.hoyN + " hoy"; ih.classList.toggle("cubrir", /\.jpe?g$/.test(l.imgHoy));
    ia.src = l.imgAntes; ia.alt = "Dibujo a trazo: " + l.nombre;
    th.innerHTML = `<b>${l.hoyN}</b> · ${l.hoyA}<br>${l.txtHoy}`;
    ta.innerHTML = `<b>${l.nombre}</b> · ${l.antesA}<br>${l.txtAntes}`;
  }
  function aplicarTiempo(sinAnim){
    epoca = modo === "antes" ? "antes" : "hoy";
    MODELOS.forEach(m => { const c = cualDe(m.lugar); m.obj = c === m.cual ? 1 : 0; m.fOn = !!c; if (sinAnim){ m.k = m.obj; m.fv = +m.fOn; } });
    rotular();
    document.querySelectorAll("#mapa-epoca button").forEach(b =>
      b.classList.toggle("on", b.dataset.e === "antes" ? modo === "antes" : modo === "anio" && anio === ANIO_MAX));
    if (ficha) ficha.dataset.e = epoca;
    pintarLinea();
  }
  // botones: "hoy" lleva la línea a 2026; "antes" muestra cada lugar en su época anterior
  function setEpoca(e, sinAnim){
    if (e === "antes") modo = "antes"; else { modo = "anio"; anio = ANIO_MAX; }
    aplicarTiempo(sinAnim);
  }
  function setAnio(a){
    a = Math.round(Math.max(ANIO_MIN, Math.min(ANIO_MAX, a)));
    if (modo === "anio" && a === anio) return;
    modo = "anio"; anio = a; aplicarTiempo();
  }

  /* ---------- línea de tiempo ---------- */
  const linea = document.getElementById("mapa-linea");
  const lnPista = linea && linea.querySelector(".ml-pista"), lnMango = linea && linea.querySelector(".ml-mango");
  const xDe = a => (a - ANIO_MIN)/(ANIO_MAX - ANIO_MIN)*100;
  if (linea){
    // marcas cada 25 años; los siglos con número
    const mk = linea.querySelector(".ml-marcas");
    for (let a = 1725; a < ANIO_MAX; a += 25)
      mk.insertAdjacentHTML("beforeend", a % 100 ? `<i style="left:${xDe(a)}%"></i>` : `<i class="s" style="left:${xDe(a)}%"><span>${a}</span></i>`);
    let arrastre = false;
    const anioDeX = x => { const r = lnPista.getBoundingClientRect(); return ANIO_MIN + (x - r.left)/r.width*(ANIO_MAX - ANIO_MIN); };
    lnPista.addEventListener("pointerdown", e => {
      arrastre = true; lnPista.setPointerCapture(e.pointerId); lnMango.style.cursor = "grabbing";
      setAnio(anioDeX(e.clientX)); lnMango.focus({preventScroll:true});
    });
    lnPista.addEventListener("pointermove", e => { if (arrastre) setAnio(anioDeX(e.clientX)); });
    ["pointerup", "pointercancel"].forEach(ev => lnPista.addEventListener(ev, () => { arrastre = false; lnMango.style.cursor = ""; }));
    lnMango.addEventListener("keydown", e => {
      const p = e.shiftKey ? 10 : 1, a = modo === "anio" ? anio : ANIO_MAX;
      const n = {ArrowLeft:a - p, ArrowDown:a - p, ArrowRight:a + p, ArrowUp:a + p, Home:ANIO_MIN, End:ANIO_MAX}[e.key];
      if (n != null){ e.preventDefault(); e.stopPropagation(); setAnio(n); }
    });
  }
  function pintarLinea(){
    if (!linea) return;
    const enAntes = modo === "antes";
    linea.classList.toggle("en-antes", enAntes);
    lnMango.style.left = xDe(enAntes ? ANIO_MAX : anio) + "%";
    lnMango.querySelector("span").textContent = enAntes ? "antes" : anio;
    lnMango.setAttribute("aria-valuenow", enAntes ? ANIO_MAX : anio);
    lnMango.setAttribute("aria-valuetext", enAntes ? "cada lugar en su época anterior" : String(anio));
    pintarFiltros();
  }
  /* ---------- filtros ---------- */
  const mf = document.getElementById("mapa-filtros");
  function pintarFiltros(){
    if (!mf) return;
    const con = LUG.filter(l => l.per), hay = con.filter(l => cualBase(l)), ven = con.filter(l => cualDe(l));
    const cuando = modo === "antes" ? "antes" : "en " + anio;
    mf.querySelector(".mf-cuenta").textContent = `${ven.length} de ${hay.length} lugares ${cuando}`;
    mf.querySelectorAll("[data-f]").forEach(b => { const [g, v] = b.dataset.f.split(":"); b.setAttribute("aria-pressed", FILTROS[g].has(v)); });
    document.querySelectorAll("#mapa-lugares button[data-id]").forEach(b => {
      const l = LUG.find(q => q.id === b.dataset.id); b.classList.toggle("fuera", !!l && !cualDe(l));
    });
  }
  if (mf) mf.addEventListener("click", e => {
    const b = e.target.closest("[data-f]");
    if (b){ const [g, v] = b.dataset.f.split(":"), set = FILTROS[g]; set.has(v) ? set.delete(v) : set.add(v); aplicarTiempo(); return; }
    if (e.target.closest(".mf-todos")){
      FILTROS.tipo = new Set(["edificio", "parque", "monumento", "iglesia"]);
      FILTROS.uso = new Set(["residencial", "institucional", "religioso", "exposiciones", "cultural", "recreativo"]);
      aplicarTiempo(); return;
    }
    const pl = e.target.closest(".mf-plegar");
    if (pl){ const cerrado = mf.classList.toggle("cerrado"); pl.setAttribute("aria-expanded", !cerrado); }
  });
  if (mf && matchMedia("(max-width:800px)").matches){ mf.classList.add("cerrado"); mf.querySelector(".mf-plegar").setAttribute("aria-expanded", "false"); }
  setEpoca("hoy", true);
  document.querySelectorAll("#mapa-epoca button").forEach(b => b.addEventListener("click", () => setEpoca(b.dataset.e)));
  window.addEventListener("keydown", e => {
    if (!document.body.classList.contains("r-mapa") || e.target.closest("input,textarea")) return;
    if (e.key === "a" || e.key === "A") setEpoca(epoca === "hoy" ? "antes" : "hoy");
    if (e.key === "+" || e.key === "=") zoom(0.6);
    if (e.key === "-") zoom(1.6);
  });
  if (ficha){
    ficha.querySelector(".mf-ver").addEventListener("click", () => { if (!fichaDe) return; const id = fichaDe.id; location.hash = "catalogo"; setTimeout(() => window.__selLugar && window.__selLugar(id), 50); });
    ficha.querySelector(".mf-ir").addEventListener("click", () => { if (fichaDe) volarA(fichaDe.x, fichaDe.y, fichaDe.cerca*0.6); });
  }
  // los modelos se levantan desde el piso; el que no está queda como trazo fantasma
  function animarModelos(dt){
    MODELOS.forEach(m => {
      const v = dt/900; m.k = m.obj > m.k ? Math.min(m.obj, m.k + v) : Math.max(m.obj, m.k - v*1.6);
      const e = m.k < .5 ? 4*m.k*m.k*m.k : 1 - Math.pow(-2*m.k + 2, 3)/2;
      m.solido.scale.y = Math.max(.001, e); m.solido.visible = m.k > .002;
      if (m.fv == null) m.fv = 1;
      m.fv += ((m.fOn ? 1 : 0) - m.fv)*Math.min(1, dt/300);           // el trazo fantasma se apaga si el lugar no existía
      m.matF.opacity = 0.22*(1 - e)*m.fv;
      m.fantasma.visible = m.matF.opacity > .01;
    });
  }

  /* =====================================================================
     NAVEGACIÓN (tipo mapa digital): vuelos, zoom, brújula, 2D/3D, restablecer, escala
     ===================================================================== */
  const ctl = new THREE.MapControls(cam, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08;
  ctl.screenSpacePanning = false;
  ctl.minDistance = 60; ctl.maxDistance = 9000;
  const MAX_TILT = Math.PI*0.47;
  ctl.maxPolarAngle = MAX_TILT;
  cam.position.copy(P(-500, -2400, 2300)); ctl.target.copy(P(-700, 900, 0)); ctl.update();

  const sph = new THREE.Spherical();
  function estado(){ sph.setFromVector3(cam.position.clone().sub(ctl.target)); return {t:ctl.target.clone(), r:sph.radius, phi:sph.phi, th:sph.theta}; }
  const INICIO = estado();
  let vuelo = null;
  function irA(b, dur, fin){
    const a = estado();
    let dth = b.th - a.th; dth = ((dth + Math.PI) % (2*Math.PI) + 2*Math.PI) % (2*Math.PI) - Math.PI;
    const salto = a.t.distanceTo(b.t);
    vuelo = {a, b:{t:b.t.clone(), r:b.r, phi:b.phi, th:a.th + dth}, s:performance.now(), d:dur || 1100, arco:salto > 400 ? Math.min(2500, salto*0.45) : 0, fin};
  }
  let plano = false, phi3D = 0.95;
  function volarA(x, y, dist, dur){
    dist = dist || 700;
    const l = LUG.find(q => q.x === x && q.y === y && q.modelo);
    const cerca = dist < 500;
    if (cerca) dist *= Math.max(1, Math.min(2.1, 1.05/(W()/H())));   // pantallas angostas: más lejos
    const a = estado();
    let phi = plano ? 0.0001 : (cerca ? 1.12 : Math.min(Math.max(a.phi, .5), 1.15));
    const th = cerca && !plano ? (l ? l.rot || 0 : 0) - 0.31 : a.th;    // de 3/4, como los dibujos
    irA({t:P(x, y, cerca && !plano && l ? l.alto*0.35 : 0), r:dist, phi, th}, dur);
  }
  function zoom(f){
    const a = estado();
    irA({t:a.t, r:Math.min(ctl.maxDistance, Math.max(ctl.minDistance, a.r*f)), phi:a.phi, th:a.th}, 380);
  }
  // 2D: cámara cenital y ciudad aplastada (se conservan lugar, zoom y giro)
  let aplan = 0, aplanObj = 0;
  const btnDim = document.getElementById("mc-dim");
  function setPlano(v){
    if (v === plano) return;
    plano = v; aplanObj = v ? 1 : 0;
    const a = estado();
    if (v){
      phi3D = Math.max(.35, a.phi);
      irA({t:a.t.clone().setY(0), r:a.r, phi:0.0001, th:a.th}, 900, () => { ctl.maxPolarAngle = 0.0001; });
    } else {
      ctl.maxPolarAngle = MAX_TILT;
      irA({t:a.t, r:a.r, phi:phi3D, th:a.th}, 900);
    }
    if (btnDim){ btnDim.textContent = v ? "3D" : "2D"; btnDim.title = v ? "Ver en 3D" : "Ver en 2D (plano)"; btnDim.setAttribute("aria-pressed", v); }
  }
  function brujulaNorte(){ const a = estado(); irA({t:a.t, r:a.r, phi:a.phi, th:0}, 600); }
  function restablecer(){
    if (plano){ plano = false; aplanObj = 0; ctl.maxPolarAngle = MAX_TILT; if (btnDim){ btnDim.textContent = "2D"; btnDim.title = "Ver en 2D (plano)"; btnDim.setAttribute("aria-pressed", false); } }
    irA(INICIO, 1400);
  }
  // bajar / subir los edificios de la ciudad (sigue en 3D; los modelos de los lugares quedan en pie)
  let bajar = 0, bajarObj = 0;
  const btnEdif = document.getElementById("mc-edif");
  function setBajar(v){
    bajarObj = v ? 1 : 0;
    if (btnEdif){ btnEdif.setAttribute("aria-pressed", v); btnEdif.title = v ? "Subir edificios" : "Bajar edificios"; btnEdif.setAttribute("aria-label", btnEdif.title); }
  }
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.addEventListener("click", f); };
  on("mc-mas", () => zoom(0.6)); on("mc-menos", () => zoom(1.6));
  on("mc-dim", () => setPlano(!plano)); on("mc-edif", () => setBajar(!bajarObj)); on("mc-norte", brujulaNorte); on("mc-reset", restablecer);
  // cualquier gesto del usuario corta el vuelo en curso
  renderer.domElement.addEventListener("pointerdown", () => { if (vuelo && !vuelo.fin) vuelo = null; });
  renderer.domElement.addEventListener("wheel", () => { if (vuelo && !vuelo.fin) vuelo = null; }, {passive:true});

  /* =====================================================================
     RECORRIDO AUTOMÁTICO (cinematográfico, en bucle)
     viaje (zoom progresivo) → foco 4,5 s con el nombre → se aleja → siguiente.
     Cualquier interacción lo frena; vuelve solo a los 15 s, salvo pausa manual.
     ===================================================================== */
  const RECORRIDO = ["iglesia-san-nicolas-de-bari", "primer-teatro-colon", "palacio-miro", "pabellon-argentino", "parque-diversiones-retiro", "palacio-unzue", "penitenciaria-nacional"]
    .map(id => LUG.find(l => l.id === id)).filter(Boolean);
  const ESPERA = 15000, FOCO = 4500;
  const tour = {activo:false, pausaManual:false, i:0, fase:null, t0:0, vuelta:0, ultima:performance.now()};
  const cartel = document.getElementById("mapa-cartel"), secMapa = document.getElementById("mapa");
  const btnTour = document.getElementById("mc-tour"), txtTour = document.getElementById("mc-tour-txt");
  function mostrarCartel(l){
    if (!cartel) return;
    const hoy = cualDe(l) !== "antes";
    const titulo = l.modelo ? (hoy ? l.hoyN : l.nombre) : l.nombre;
    const sub = l.modelo ? (hoy ? `${l.hoyA} · antes: ${l.nombre}` : `${l.antesA} · hoy: ${l.hoyN}`) : `hoy: ${l.hoy}`;
    cartel.innerHTML = `<small>${String(tour.i + 1).padStart(2, "0")} / ${String(RECORRIDO.length).padStart(2, "0")}</small><b>${titulo}</b><span>${sub}</span>`;
    cartel.classList.add("on"); secMapa.classList.add("con-cartel");
  }
  const ocultarCartel = () => { if (cartel) cartel.classList.remove("on"); secMapa.classList.remove("con-cartel"); };
  function encuadre(l){
    const lado = (tour.i + tour.vuelta) % 2 ? 1 : -1;                // alterna el lado y la inclinación
    const r = (l.modelo ? l.cerca : 520)*Math.max(1, Math.min(2.1, 1.05/(W()/H())));
    return {t:P(l.x, l.y, !plano && l.modelo ? l.alto*0.35 : 0), r,
            phi:plano ? 0.0001 : (lado > 0 ? 0.98 : 1.16), th:(l.rot || 0) - 0.31 + lado*0.3};
  }
  function paso(){
    if (!tour.activo) return;
    const l = RECORRIDO[tour.i], b = encuadre(l), d = estado().t.distanceTo(b.t);
    tour.fase = "viaje";
    irA(b, Math.min(7500, 3000 + d*1.4), () => {
      if (!tour.activo) return;
      tour.fase = "foco"; tour.t0 = performance.now(); mostrarCartel(l);
    });
    vuelo.tour = true;
  }
  function alejarYSeguir(){
    ocultarCartel();
    const a = estado();
    tour.fase = "alejar";
    irA({t:a.t, r:a.r*1.5, phi:plano ? a.phi : Math.max(.6, a.phi - .22), th:a.th + (plano ? 0 : .12)}, 1800, () => {
      if (!tour.activo) return;
      tour.i = (tour.i + 1) % RECORRIDO.length; if (!tour.i) tour.vuelta++;
      paso();
    });
    vuelo.tour = true;
  }
  function iniciarTour(desdeInicio){
    tour.activo = true; tour.fase = null;
    if (desdeInicio){ tour.i = 0; paso(); estadoBoton(); return; }
    // sigue desde donde está la cámara: el punto más cercano (o el siguiente, si ya está encima)
    const a = estado(); let bi = 0, bd = Infinity;
    RECORRIDO.forEach((l, i) => { const d = Math.hypot(l.x - a.t.x, l.y + a.t.z); if (d < bd){ bd = d; bi = i; } });
    tour.i = bd < 250 ? (bi + 1) % RECORRIDO.length : bi;
    if (bd < 250) alejarYSeguir(); else paso();
    estadoBoton();
  }
  function detenerTour(){
    if (tour.activo){ tour.activo = false; tour.fase = null; if (vuelo && vuelo.tour) vuelo = null; ocultarCartel(); }
    tour.ultima = performance.now(); estadoBoton();
  }
  let txtPrev = "";
  function estadoBoton(t){
    if (btnTour){
      btnTour.classList.toggle("pausado", tour.pausaManual);
      btnTour.title = tour.pausaManual ? "Reanudar recorrido" : "Pausar recorrido";
      btnTour.setAttribute("aria-label", btnTour.title);
    }
    if (!txtTour) return;
    let txt = tour.pausaManual ? "recorrido en pausa" : tour.activo ? "recorrido" :
      "recorrido en " + Math.max(1, Math.ceil((ESPERA - ((t || performance.now()) - tour.ultima))/1000)) + " s";
    if (txt !== txtPrev){ txtTour.textContent = txt; txtPrev = txt; }
  }
  if (btnTour) btnTour.addEventListener("click", () => {
    if (tour.pausaManual){ tour.pausaManual = false; if (window.__sbCerrar) window.__sbCerrar(); iniciarTour(); }
    else { tour.pausaManual = true; detenerTour(); }
  });
  // interacción del usuario: frena el recorrido al instante
  function interaccion(e){
    if (e && e.target && e.target.closest && e.target.closest("#mc-tour")) return;
    detenerTour();
  }
  ["pointerdown", "wheel", "touchstart"].forEach(ev => secMapa.addEventListener(ev, interaccion, {capture:true, passive:true}));
  renderer.domElement.addEventListener("pointermove", e => { if (e.buttons) interaccion(e); });
  window.addEventListener("keydown", e => { if (document.body.classList.contains("r-mapa")) interaccion(e); }, true);
  function animarTour(t, dt){
    if (tour.activo && tour.fase === "foco" && !vuelo){
      const k = (t - tour.t0)/FOCO;
      if (k >= 1){ alejarYSeguir(); return; }
      // durante el foco: órbita lenta + zoom progresivo, con velocidad que arranca y termina en cero
      const sp = Math.sin(Math.PI*Math.min(1, k))*dt, a = estado();
      sph.set(a.r*(1 - 0.000035*sp), plano ? a.phi : Math.max(.5, a.phi - 0.000022*sp), a.th + (plano ? 0.00004 : 0.00009)*sp);
      cam.position.setFromSpherical(sph).add(ctl.target);
    }
    if (window.__sbAbierto && !tour.activo) tour.ultima = t;          // con el panel abierto no se reactiva solo
    if (!tour.activo && !tour.pausaManual && t - tour.ultima > ESPERA) iniciarTour();
    if (!tour.activo) estadoBoton(t);
  }
  setTimeout(() => { if (!tour.pausaManual && !tour.activo) iniciarTour(true); }, 600);   // al cargar: arranca el recorrido


  /* ---------- búsqueda de direcciones ---------- */
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\b(avenida|av\.?|avda\.?|calle|pasaje|pje\.?)\b/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const porNombre = {};
  const DISP = {};
  CALLES.forEach(c => { if (!c.nombre) return; const k = norm(c.nombre); (porNombre[k] ||= []).push(c);
    if (!DISP[k] || c.nombre.length > DISP[k].length) DISP[k] = c.nombre; });
  const LISTA = Object.keys(porNombre);
  function buscarCalle(q){
    const n = norm(q); if (!n) return null;
    let mejor = null, pts = 0;
    LISTA.forEach(nm => {
      const m = nm; let s = 0;
      if (m === n) s = 100; else if (m.endsWith(" " + n) || m.startsWith(n + " ")) s = 80 - m.length/10;
      else if (m.includes(n)) s = 60 - m.length/10;
      else { const ws = n.split(" "); if (ws.every(w => m.includes(w))) s = 40 - m.length/10; }
      if (s > pts){ pts = s; mejor = nm; }
    });
    return mejor;
  }
  function cruce(a, b){
    const r = [];
    porNombre[a].forEach(A => porNombre[b].forEach(B => {
      for (let i = 0; i < A.pts.length - 1; i++) for (let j = 0; j < B.pts.length - 1; j++){
        const p1 = A.pts[i], p2 = A.pts[i+1], p3 = B.pts[j], p4 = B.pts[j+1];
        const d = (p2[0]-p1[0])*(p4[1]-p3[1]) - (p2[1]-p1[1])*(p4[0]-p3[0]); if (!d) continue;
        const t = ((p3[0]-p1[0])*(p4[1]-p3[1]) - (p3[1]-p1[1])*(p4[0]-p3[0]))/d;
        const u = ((p3[0]-p1[0])*(p2[1]-p1[1]) - (p3[1]-p1[1])*(p2[0]-p1[0]))/d;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) r.push([p1[0] + t*(p2[0]-p1[0]), p1[1] + t*(p2[1]-p1[1])]);
      }
    }));
    if (!r.length) return null;
    return [r.reduce((s, p) => s + p[0], 0)/r.length, r.reduce((s, p) => s + p[1], 0)/r.length];
  }
  // numeración aproximada: se calibra con cruces de referencia conocidos y se camina sobre la calle
  const REF_NS = {"Avenida Rivadavia":0, "Rivadavia":0, "Avenida Corrientes":400, "Avenida Santa Fe":1100};
  const REF_EO = {"Avenida Eduardo Madero":50, "Avenida Leandro N. Alem":150, "Avenida Paseo Colón":150,
                  "Avenida 9 de Julio":1050, "Avenida Callao":1800, "Avenida Pueyrredón":2850};
  function cerca(calle, x, y){
    let best = null, bd = Infinity;
    porNombre[calle].forEach(t => { for (let i = 0; i < t.pts.length - 1; i++){
      const [ax, ay] = t.pts[i], [bx, by] = t.pts[i+1], vx = bx-ax, vy = by-ay, l2 = vx*vx + vy*vy || 1;
      const k = Math.max(0, Math.min(1, ((x-ax)*vx + (y-ay)*vy)/l2)), px = ax + k*vx, py = ay + k*vy;
      const d = Math.hypot(px - x, py - y); if (d < bd){ bd = d; best = [px, py]; } } });
    return [best, bd];
  }
  function caminar(calle, desde, dir, dist){
    let p = desde, [dx, dy] = dir, rest = Math.abs(dist);
    if (dist < 0){ dx = -dx; dy = -dy; }
    while (rest > 0){
      const st = Math.min(25, rest), [q, d] = cerca(calle, p[0] + dx*st, p[1] + dy*st);
      const L = Math.hypot(q[0]-p[0], q[1]-p[1]);
      if (d > 20 || L < st*0.5) return rest < 60 ? p : null;      // se terminó la calle
      dx = (q[0]-p[0])/L; dy = (q[1]-p[1])/L; p = q; rest -= st;
    }
    return p;
  }
  function porAltura(calle, num){
    let refs = [];
    for (const R of [REF_NS, REF_EO]){
      refs = [];
      for (const nm0 in R){ const nm = norm(nm0); if (!porNombre[nm] || nm === calle) continue; const c = cruce(calle, nm); if (c) refs.push({h:R[nm0], p:c}); }
      if (refs.length) { refs.ns = R === REF_NS; break; }
    }
    if (!refs.length) return null;
    refs.sort((a, b) => a.h - b.h);
    // referencias dobles (calle y avenida con el mismo número) se unen
    refs = refs.filter((r, i) => !i || r.h !== refs[i-1].h);
    let a = refs[0];
    refs.forEach(r => { if (r.h <= num) a = r; });
    const b = refs.find(r => r.h > a.h) || refs.slice().reverse().find(r => r.h < a.h);
    let dir, m = 1.3;
    if (b){
      const L = Math.hypot(b.p[0]-a.p[0], b.p[1]-a.p[1]);
      dir = [(b.p[0]-a.p[0])/L*Math.sign(b.h - a.h), (b.p[1]-a.p[1])/L*Math.sign(b.h - a.h)];
      m = Math.min(1.7, Math.max(1, L/Math.abs(b.h - a.h)));
    } else {
      // sin segunda referencia: los números crecen hacia el norte (calles N-S) o lejos del río (E-O)
      const pts = [].concat(...porNombre[calle].map(t => t.pts));
      const f = refs.ns ? (p => p[1]) : (p => -Math.hypot(p[0] - 1800, p[1] - 1200));
      const lejos = pts.reduce((q, p) => f(p) > f(q) ? p : q, pts[0]);
      const L = Math.hypot(lejos[0]-a.p[0], lejos[1]-a.p[1]) || 1;
      dir = [(lejos[0]-a.p[0])/L, (lejos[1]-a.p[1])/L];
    }
    return caminar(calle, a.p, dir, (num - a.h)*m);
  }
  const form = document.getElementById("mapa-buscar"), msg = document.getElementById("mapa-msg");
  form.addEventListener("submit", e => {
    e.preventDefault();
    const q = form.q.value.trim(); if (!q) return;
    let res = null, txt = "";
    const y = q.split(/\s+(?:y|e|esq\.?|esquina|&)\s+/i);
    if (y.length === 2){
      const a = buscarCalle(y[0]), b = buscarCalle(y[1]);
      if (a && b && a !== b){ res = cruce(a, b); txt = `${DISP[a]} y ${DISP[b]}`; }
    } else {
      const m = q.match(/^(.*?)[\s,]+(\d{1,5})$/);
      if (m){ const c = buscarCalle(m[1]); if (c){ res = porAltura(c, +m[2]); txt = `${DISP[c]} ${m[2]} <i>(aprox.)</i>`; } }
      else { const c = buscarCalle(q); if (c){ const t = porNombre[c][0].pts; res = t[Math.floor(t.length/2)]; txt = DISP[c]; } }
    }
    if (!res){ msg.innerHTML = "No encontré esa dirección en esta zona del mapa."; pin.visible = false; pinEl.hidden = true; return; }
    msg.innerHTML = txt;
    pin.position.copy(P(res[0], res[1], 0)); pin.visible = true;
    pinEl.innerHTML = `<b>${txt}</b>`; pinEl.hidden = false; pin.anc = P(res[0], res[1], 120);
    volarA(res[0], res[1], 650);
  });
  document.querySelectorAll("#mapa-lugares button").forEach(b => b.addEventListener("click", () => {
    const l = LUG.find(z => z.id === b.dataset.id); window.__mapaEnfocar(l);
  }));

  /* ---------- nombre de la calle al pasar el mouse ---------- */
  const tip = document.getElementById("mapa-tip"), ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  const pisoPlano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  renderer.domElement.addEventListener("pointermove", e => {
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1);
    ray.setFromCamera(mouse, cam);
    if (!ray.ray.intersectPlane(pisoPlano, hit)){ tip.hidden = true; return; }
    const x = hit.x, y = -hit.z, lim = Math.max(10, cam.position.distanceTo(hit)/90);
    let nm = "", bd = lim;
    CALLES.forEach(c => { if (!c.nombre) return; for (let i = 0; i < c.pts.length - 1; i++){
      const [ax, ay] = c.pts[i], [bx, by] = c.pts[i+1], vx = bx-ax, vy = by-ay, l2 = vx*vx + vy*vy || 1;
      const k = Math.max(0, Math.min(1, ((x-ax)*vx + (y-ay)*vy)/l2)), d = Math.hypot(ax + k*vx - x, ay + k*vy - y);
      if (d < bd){ bd = d; nm = c.nombre; } } });
    if (!nm){ tip.hidden = true; return; }
    tip.hidden = false; tip.textContent = nm;
    tip.style.left = (e.clientX - r.left + 14) + "px"; tip.style.top = (e.clientY - r.top + 14) + "px";
  });
  renderer.domElement.addEventListener("pointerleave", () => tip.hidden = true);

  /* =====================================================================
     MEDIDAS — alturas y m² de cada edificio, antes y hoy.
     Cargar los datos acá (null = sin dato todavía). Las cotas se dibujan
     sobre el volumen 3D, que es ilustrativo; los números son los reales.
     ===================================================================== */
  const MEDIDAS = {
    "palacio-unzue": {
      antes: {altura:14, pisos:2, terreno:21154, cubierta:null},                  // Palacio Unzué
      hoy:   {altura:35, pisos:"6 + PB + 3 subsuelos", terreno:"≈ 30.000", cubierta:"44.000 – 45.000"}   // Biblioteca Nacional
    },
    "iglesia-san-nicolas-de-bari": {
      antes: {torre:"25 – 30", largo:39, ancho:8, planta:"≈ 312"},                                  // Iglesia San Nicolás de Bari
      hoy:   {altura:67.5, base:"≈ 46,24", escalones:206, mirador:"≈ 62"}                            // Obelisco
    },
    "penitenciaria-nacional": {
      antes: {murallas:"7 – 8", pisos:"2 (pabellones)", terreno:122000, cubierta:"≈ 20.000", pabellones:14287},   // Penitenciaría Nacional
      hoy:   {terreno:120000, arbustos:"≈ 1.000"}                                                                                   // Parque Las Heras
    }
  };
  // filas de la ficha, en orden; solo se muestran las que el edificio tiene cargadas (null = "sin dato")
  const FILAS = [["altura", "Altura", "m"], ["murallas", "Altura de las murallas", "m"], ["pisos", "Pisos", ""],
                 ["terreno", "Superficie del terreno", "m²"], ["cubierta", "Superficie cubierta", "m²"],
                 ["pabellones", "Cubierta de pabellones y galerías", "m²"], ["arbustos", "Arbustos y herbáceas incorporados", "m²"],
                 ["base", "Superficie de base", "m²"], ["escalones", "Escalera original", "escalones"], ["mirador", "Altura del mirador", "m"],
                 ["torre", "Altura de la torre", "m"], ["largo", "Largo", "m"], ["ancho", "Ancho", "m"], ["planta", "Superficie de planta", "m²"]];
  // números con formato argentino; un texto (p. ej. un rango) se muestra tal cual
  const fmt = n => typeof n === "number" ? n.toLocaleString("es-AR", {maximumFractionDigits:1}) : String(n);
  const conMedidas = MODELOS.filter(m => MEDIDAS[m.lugar.id] && MEDIDAS[m.lugar.id][m.cual]);
  conMedidas.forEach(m => m.medMallas = m.solido.children.filter(c => c.isMesh && !c.isInstancedMesh));
  const medBtn = document.createElement("button"), medCard = document.createElement("div");
  const medAlto = document.createElement("div"), medArea = document.createElement("div");
  medBtn.type = "button"; medBtn.className = "mp-med-btn"; medBtn.innerHTML = "<i>▲</i> ver alturas y m²";
  medCard.className = "mp-med-card"; medAlto.className = medArea.className = "mp-cota";
  medBtn.hidden = medCard.hidden = medAlto.hidden = medArea.hidden = true;
  etq.append(medBtn, medCard, medAlto, medArea);
  let medHov = null, medAbierto = null, medT = 0, sobreBtn = false;

  // caja del modelo en sus coordenadas locales (sin giro ni animación)
  function cajaLocal(m){
    if (m.medBox) return m.medBox;
    const ry = m.raiz.rotation.y, sy = m.raiz.scale.y, ss = m.solido.scale.y;
    m.raiz.rotation.y = 0; m.raiz.scale.y = 1; m.solido.scale.y = 1; m.raiz.updateMatrixWorld(true);
    const b = new THREE.Box3();
    m.medMallas.forEach(c => b.expandByObject(c));
    m.raiz.rotation.y = ry; m.raiz.scale.y = sy; m.solido.scale.y = ss; m.raiz.updateMatrixWorld(true);
    b.min.sub(m.raiz.position); b.max.sub(m.raiz.position);
    m.medTope = new THREE.Vector3((b.min.x + b.max.x)/2, b.max.y + 4, (b.min.z + b.max.z)/2);
    return m.medBox = b;
  }
  // cotas rosas: contorno de la planta + línea de altura con topes
  function armarCotas(m, conAlto){
    const b = cajaLocal(m), y0 = b.min.y + .3, top = b.max.y;
    const x0 = b.min.x - 2, x1 = b.max.x + 2, z0 = b.min.z - 2, z1 = b.max.z + 2, cx = x1 + 6, cz = z1 + 6;
    const a = polil([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], true);
    if (conAlto) a.push(cx, y0, cz, cx, top, cz,  cx - 2.5, y0, cz, cx + 2.5, y0, cz,  cx - 2.5, top, cz, cx + 2.5, top, cz,  b.max.x, top, b.max.z, cx, top, cz);
    const ls = new THREE.LineSegments(segs(a), new THREE.LineBasicMaterial({color:ROSA, depthTest:false, transparent:true}));
    ls.renderOrder = 10;
    const g = new THREE.Group(); g.add(ls);
    g.userData = {alto:new THREE.Vector3(cx, (y0 + top)/2, cz), area:new THREE.Vector3((x0 + x1)/2, y0, z1)};
    return g;
  }
  // ¿qué modelo (de la época visible) está bajo el puntero?
  // habitáculo: al pasar el mouse aparece el cartel "habitáculo"
  const HAB = MODELOS.find(q => q.hab);
  function sobreHab(px, py){
    if (!HAB || !HAB.solido.visible || HAB.k < .9 || HAB.cual !== cualDe(HAB.lugar)) return false;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((px - r.left)/r.width*2 - 1, -(py - r.top)/r.height*2 + 1);
    ray.setFromCamera(mouse, cam);
    return ray.intersectObject(HAB.habHit, false).length > 0;
  }
  // cartel fijo sobre el habitáculo: aparece al pasar el mouse, queda quieto un rato y al tocarlo lleva a la sección
  const habEl = document.createElement("button"); habEl.type = "button"; habEl.className = "mp-hab";
  habEl.innerHTML = "<b>habitáculo</b><span>noviembre · ver sección →</span>"; habEl.style.display = "none";
  document.getElementById("mapa-etiquetas").appendChild(habEl);
  let habSobre = false, habSobreCartel = false, habHasta = 0;
  const irHab = () => { location.hash = "habitaculo"; };
  habEl.addEventListener("click", e => { e.stopPropagation(); irHab(); });
  habEl.addEventListener("pointerenter", () => habSobreCartel = true);
  habEl.addEventListener("pointerleave", () => { habSobreCartel = false; habHasta = performance.now() + 2500; });
  renderer.domElement.addEventListener("pointermove", e => {
    const h = !e.buttons && sobreHab(e.clientX, e.clientY);
    if (h){ tip.hidden = true; renderer.domElement.style.cursor = "pointer"; }
    if (habSobre && !h) habHasta = performance.now() + 2500;
    habSobre = h;
  });
  let habPd = null;
  renderer.domElement.addEventListener("pointerdown", e => habPd = [e.clientX, e.clientY]);
  renderer.domElement.addEventListener("pointerup", e => {
    if (habPd && Math.hypot(e.clientX - habPd[0], e.clientY - habPd[1]) < 6 && sobreHab(e.clientX, e.clientY)) irHab();
    habPd = null; });
  const habAnc = new THREE.Vector3();
  function actualizarHab(){
    const ver = HAB && HAB.solido.visible && HAB.k > .9 && HAB.cual === cualDe(HAB.lugar) && (habSobre || habSobreCartel || performance.now() < habHasta);
    if (!ver){ habEl.style.display = "none"; return; }
    HAB.hab.localToWorld(habAnc.set(0, 4.2, 0));
    etiqueta(habEl, habAnc);
  }
  function modeloBajo(px, py){
    if (plano || aplan > .05 || estado().r > 1400) return null;
    const r = renderer.domElement.getBoundingClientRect();
    mouse.set((px - r.left)/r.width*2 - 1, -(py - r.top)/r.height*2 + 1);
    ray.setFromCamera(mouse, cam);
    let mejor = null, bd = Infinity;
    conMedidas.forEach(m => {
      if (m.cual !== cualDe(m.lugar) || m.k < .9) return;
      const h = ray.intersectObjects(m.medMallas, false);
      if (h.length && h[0].distance < bd){ bd = h[0].distance; mejor = m; }
    });
    return mejor;
  }
  function mostrarBoton(m){ cajaLocal(m); medHov = m; medT = 0; medBtn.hidden = false; }
  function abrirMedidas(m){
    cerrarMedidas();
    medAbierto = m; medHov = null; medBtn.hidden = true; renderer.domElement.style.cursor = "";
    const d = MEDIDAS[m.lugar.id][m.cual], l = m.lugar, hoy = m.cual === "hoy";
    const conAlto = "altura" in d || "murallas" in d || "torre" in d;                  // un parque no lleva línea de altura
    if (!m.cotas){ m.cotas = armarCotas(m, conAlto); m.raiz.add(m.cotas); }
    m.cotas.visible = true;
    medCard.innerHTML = `<header><span>${hoy ? l.hoyN : l.nombre} · ${hoy ? l.hoyA : l.antesA}</span><button type="button" aria-label="Cerrar medidas">✕</button></header>
      <dl>${FILAS.filter(([k]) => k in d).map(([k, t, u]) => `<div><dt>${t}</dt>${d[k] == null ? '<dd class="falta">sin dato</dd>' : `<dd>${fmt(d[k])}${u ? " " + u : ""}</dd>`}</div>`).join("")}</dl>
      <p>Las cotas se dibujan sobre el volumen 3D, que es ilustrativo.</p>`;
    medCard.querySelector("button").addEventListener("click", cerrarMedidas);
    medAlto.textContent = d.altura != null ? fmt(d.altura) + " m" : d.murallas != null ? "murallas " + fmt(d.murallas) + " m" : d.torre != null ? "torre " + fmt(d.torre) + " m" : "altura: sin dato";
    medArea.textContent = d.terreno != null ? fmt(d.terreno) + " m²" : d.cubierta != null ? fmt(d.cubierta) + " m² cubiertos" : d.base != null ? fmt(d.base) + " m² de base" : d.planta != null ? fmt(d.planta) + " m² de planta" : "m²: sin dato";
    medCard.hidden = medArea.hidden = false; medAlto.hidden = !conAlto;
  }
  function cerrarMedidas(){
    if (medAbierto && medAbierto.cotas) medAbierto.cotas.visible = false;
    medAbierto = null; medCard.hidden = medAlto.hidden = medArea.hidden = true;
  }
  // mouse: al pasar por encima aparece el botón; se va 1,2 s después de salir
  renderer.domElement.addEventListener("pointermove", e => {
    if (e.buttons || medAbierto) return;
    if (sobreHab(e.clientX, e.clientY)) return;
    const m = modeloBajo(e.clientX, e.clientY);
    if (m){ mostrarBoton(m); tip.hidden = true; renderer.domElement.style.cursor = "pointer"; }
    else { renderer.domElement.style.cursor = ""; if (medHov && !medT) medT = performance.now(); }
  });
  // toque / clic sin arrastrar sobre el edificio: muestra el botón (o cambia de edificio si ya hay medidas abiertas)
  let pd = null;
  renderer.domElement.addEventListener("pointerdown", e => pd = [e.clientX, e.clientY]);
  renderer.domElement.addEventListener("pointerup", e => {
    if (!pd || Math.hypot(e.clientX - pd[0], e.clientY - pd[1]) > 6){ pd = null; return; }
    pd = null;
    if (sobreHab(e.clientX, e.clientY)) return;
    const m = modeloBajo(e.clientX, e.clientY);
    if (m){ if (medAbierto) abrirMedidas(m); else mostrarBoton(m); }
    else if (!medAbierto){ medHov = null; medBtn.hidden = true; }
  });
  medBtn.addEventListener("pointerenter", () => sobreBtn = true);
  medBtn.addEventListener("pointerleave", () => { sobreBtn = false; medT = performance.now(); });
  medBtn.addEventListener("click", () => { if (medHov) abrirMedidas(medHov); });
  window.addEventListener("keydown", e => { if (e.key === "Escape" && medAbierto) cerrarMedidas(); });
  const vLoc = new THREE.Vector3();
  const enModelo = (el, m, p) => etiqueta(el, m.raiz.localToWorld(vLoc.copy(p)));
  function actualizarMedidas(t){
    if (medAbierto){
      // al pasar de hoy a antes (o al revés) se muestran las medidas del otro edificio
      const ahora = cualDe(medAbierto.lugar);
      if (medAbierto.cual !== ahora){ const otro = conMedidas.find(m => m.lugar === medAbierto.lugar && m.cual === ahora); otro ? abrirMedidas(otro) : cerrarMedidas(); }
      if (medAbierto && (tour.activo || plano || estado().r > 1800)) cerrarMedidas();
    }
    if (medAbierto){
      if (!tour.pausaManual) tour.ultima = t;                         // leyendo medidas: el recorrido no vuelve solo
      const u = medAbierto.cotas.userData;
      enModelo(medCard, medAbierto, medAbierto.medTope); enModelo(medAlto, medAbierto, u.alto); enModelo(medArea, medAbierto, u.area);
    }
    if (medHov){
      if ((medT && !sobreBtn && t - medT > 1200) || medHov.cual !== cualDe(medHov.lugar) || plano){ medHov = null; medBtn.hidden = true; }
      else enModelo(medBtn, medHov, medHov.medTope);
    }
  }

  /* ---------- bucle ---------- */
  const v = new THREE.Vector3();
  function etiqueta(el, anc){
    v.copy(anc).project(cam);
    const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    el.style.display = vis ? "" : "none";
    if (vis){ el.style.transform = `translate(${(v.x*0.5 + 0.5)*W()}px, ${(-v.y*0.5 + 0.5)*H()}px) translate(-50%, -100%)`; }
  }
  // APORTES DEL BLOG: cada post ubicado es un punto rojo en el mapa; tocarlo abre ese post en el blog
  let APORTES = [];
  function construirAportes(){
    APORTES.forEach(a => a.el.remove());
    APORTES = (window.__aportes || []).map((p, i) => ({p, i})).filter(({p}) => typeof p.x === "number" && typeof p.y === "number"
        && p.x > -4400 && p.x < 1550 && p.y > -2100 && p.y < 3500).map(({p, i}) => {
      const el = document.createElement("button");
      el.type = "button"; el.className = "mp-aporte";
      el.setAttribute("aria-label", `Aporte de ${p.autor}: ${p.lugar || ""}${p.anio ? ", " + p.anio : ""}`);
      el.innerHTML = `<i></i><span><b>${p.autor}</b>${p.lugar || ""}${p.anio ? " · " + p.anio : ""}</span>`;
      el.addEventListener("click", e => { e.stopPropagation(); window.__verPost && window.__verPost(i); });
      etq.appendChild(el);
      return {p, i, el, anc:P(p.x, p.y, 6)};
    });
  }
  window.__aportesCambio = construirAportes;
  construirAportes();
  function actualizarAportes(){
    APORTES.forEach(a => {
      // solo se ve el aporte que se abrió desde el blog ("ver en el mapa"); entrando directo al mapa no aparece ninguno
      // con la línea de tiempo: el aporte aparece desde el año de su foto
      const ok = window.__mapaAporte === a.i && (modo !== "anio" || !a.p.anio || anio >= a.p.anio);
      v.copy(a.anc).project(cam);
      const vis = ok && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      a.el.style.display = vis ? "" : "none";
      if (vis) a.el.style.transform = `translate(${(v.x*0.5 + 0.5)*W()}px, ${(-v.y*0.5 + 0.5)*H()}px) translate(-50%, -50%)`;
    });
  }
  // desde el blog: "ver en el mapa"
  window.__mapaVolarXY = (x, y) => { detenerTour(); volarA(x, y, 600, 1500); };
  if (window.__mapaPendXY){ const q = window.__mapaPendXY; window.__mapaPendXY = null; setTimeout(() => window.__mapaVolarXY(q.x, q.y), 400); }

  // carteles de los lugares: si dos se pisan en pantalla, el de más arriba sube hasta que no se toquen
  function acomodarEtiquetas(dt){
    const vis = [], gap = 4;
    LUG.forEach(l => {
      v.copy(l.anc).project(cam);
      const ok = !l.el.hidden && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      l.el.style.display = ok ? "" : "none";
      if (ok) vis.push({l, x:(v.x*0.5 + 0.5)*W(), y:(-v.y*0.5 + 0.5)*H(), w:l.el.offsetWidth, h:l.el.offsetHeight});
    });
    vis.sort((a, b) => b.y - a.y);                                     // de abajo hacia arriba en pantalla
    const puestos = [];
    vis.forEach(e => {
      let top = e.y - e.h, choca = true, vueltas = 0;
      while (choca && vueltas++ < 20){
        choca = false;
        for (const p of puestos){
          if (e.x - e.w/2 < p.x + p.w/2 + gap && e.x + e.w/2 > p.x - p.w/2 - gap && top < p.top + p.h + gap && top + e.h > p.top - gap){
            top = p.top - e.h - gap; choca = true;
          }
        }
      }
      e.top = top; puestos.push(e);
      const l = e.l, obj = e.y - e.h - top;
      l.dy = l.dy == null ? obj : l.dy + (obj - l.dy)*Math.min(1, dt/90);   // se acomoda suave, sin saltos
      l.el.style.transform = `translate(${e.x}px, ${e.y - l.dy}px) translate(-50%, -100%)`;
      l.el.style.setProperty("--dy", Math.max(0, l.dy).toFixed(1) + "px");
    });
  }
  const aguja = document.getElementById("mc-aguja");
  const escala = document.getElementById("mapa-escala");
  let escalaTxt = "";
  function actualizarEscala(r){
    if (!escala) return;
    const mpp = 2*r*Math.tan(THREE.MathUtils.degToRad(cam.fov/2))/H();   // metros por píxel en el centro
    const max = 110*mpp, pasos = [5,10,20,50,100,200,500,1000,2000,5000];
    const m = pasos.filter(p => p <= max).pop() || 5;
    const txt = m >= 1000 ? (m/1000) + " km" : m + " m";
    escala.querySelector("i").style.width = Math.round(m/mpp) + "px";
    if (txt !== escalaTxt){ escala.querySelector("span").textContent = txt; escalaTxt = txt; }
  }
  let tPrev = 0, ultFicha;
  function frame(t){
    const dt = Math.min(64, t - (tPrev || t)); tPrev = t;
    animarModelos(dt);
    // 2D ↔ 3D: la ciudad y los modelos se aplastan/levantan
    if (aplan !== aplanObj || bajar !== bajarObj){
      const paso = (v, o) => o > v ? Math.min(1, v + dt/700) : Math.max(0, v - dt/700);
      const suave = v => v < .5 ? 2*v*v : 1 - Math.pow(-2*v + 2, 2)/2;
      aplan = paso(aplan, aplanObj); bajar = paso(bajar, bajarObj);
      const e = suave(aplan), eb = suave(bajar);
      ciudad.scale.y = 1 - 0.97*Math.max(e, eb);                 // edificios: bajan en 2D o con el botón
      MODELOS.forEach(m => m.raiz.scale.y = 1 - 0.97*e);           // los modelos hoy/antes solo se aplastan en 2D
      LUG.forEach(l => l.anc.y = l.ancY*(1 - 0.8*e));
    }
    if (vuelo){
      const k = Math.min(1, (t - vuelo.s)/vuelo.d), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3)/2;
      const {a, b} = vuelo;
      ctl.target.lerpVectors(a.t, b.t, e);
      sph.set(a.r + (b.r - a.r)*e + Math.sin(Math.PI*e)*vuelo.arco, a.phi + (b.phi - a.phi)*e, a.th + (b.th - a.th)*e);
      cam.position.setFromSpherical(sph).add(ctl.target);
      if (k >= 1){ const f = vuelo.fin; vuelo = null; if (f) f(); }
    }
    animarTour(t, dt);
    aplicarOffset(dt);
    ctl.update();
    renderer.render(scene, cam);
    acomodarEtiquetas(dt);
    actualizarAportes();
    if (pin.visible) etiqueta(pinEl, pin.anc);
    actualizarHab();
    actualizarMedidas(t);
    // brújula, escala y ficha del lugar más cercano al centro
    const st = estado();
    if (aguja) aguja.style.transform = `rotate(${st.th}rad)`;
    actualizarEscala(st.r);
    const tx = st.t.x, ty = -st.t.z;
    let cerca = null, bd = Infinity;
    LUG.forEach(l => { if (!l.modelo) return; const d = Math.hypot(l.x - tx, l.y - ty); if (d < bd){ bd = d; cerca = l; } });
    if (!(cerca && bd < Math.max(220, st.r*0.7) && st.r < 1600)) cerca = null;
    if (cerca !== ultFicha){ ultFicha = cerca; llenarFicha(cerca); }
    if (document.body.classList.contains("r-mapa")) requestAnimationFrame(frame); else { corriendo = false; tPrev = 0; }
  }
  let corriendo = false;
  window.__mapaActivar = () => {
    renderer.setSize(W(), H()); cam.aspect = W()/H(); cam.updateProjectionMatrix(); offSucio = true;
    if (tour.activo){ vuelo = null; paso(); } else tour.ultima = performance.now();
    if (!corriendo){ corriendo = true; requestAnimationFrame(frame); }
  };
  window.addEventListener("resize", () => { if (document.body.classList.contains("r-mapa")) window.__mapaActivar(); });
  // marcador o lista: zoom suave + panel lateral con la ficha de ESE lugar
  window.__mapaEnfocar = l => { detenerTour(); volarA(l.x, l.y, l.modelo ? l.cerca : 600, 1500); if (window.__sbAbrir) window.__sbAbrir(l.id); };
  // con el panel abierto, el centro de la vista se corre hacia la parte visible del mapa
  let offX = 0, offY = 0, offXo = 0, offYo = 0, offSucio = false;
  window.__mapaPanel = (abierto, w, h) => { offXo = abierto ? w/2 : 0; offYo = abierto ? h/2 : 0; offSucio = true; };
  function aplicarOffset(dt){
    if (!offSucio && offX === offXo && offY === offYo) return;
    const k = Math.min(1, dt/140);
    offX += (offXo - offX)*k; offY += (offYo - offY)*k;
    if (Math.abs(offXo - offX) < .5) offX = offXo;
    if (Math.abs(offYo - offY) < .5) offY = offYo;
    if (offX || offY) cam.setViewOffset(W(), H(), offX, offY, W(), H()); else cam.clearViewOffset();
    offSucio = false;
  }
  window.__mapaIr = id => { const l = LUG.find(z => z.id === id); window.__mapaPend = null; detenerTour(); if (l) volarA(l.x, l.y, l.modelo ? l.cerca : 600); };
  window.__mapaActivar();
  if (window.__mapaPend) window.__mapaIr(window.__mapaPend);

  /* ---------- MINIATURAS: foto de un modelo 3D suelto (para el buscador) ----------
     window.__mapaMiniatura(id, "hoy" | "antes", ancho, alto) → dataURL png con fondo blanco */
  let miniR = null; const miniCache = {};
  window.__mapaMiniatura = (id, cual, w, h) => {
    const clave = id + "|" + cual + "|" + w + "x" + h;
    if (miniCache[clave]) return miniCache[clave];
    const m = MODELOS.find(q => q.lugar.id === id && q.cual === cual) || MINIS.find(q => q.lugar.id === id && q.cual === cual); if (!m) return null;
    if (!miniR){ miniR = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true}); miniR.setClearColor(0xffffff, 1); }
    miniR.setPixelRatio(2); miniR.setSize(w, h);
    const esc = new THREE.Scene();
    esc.add(new THREE.HemisphereLight(0xffffff, 0xd8d4cc, 0.8));
    const luz = new THREE.DirectionalLight(0xffffff, 0.55); luz.position.set(-1.2, 2, 1.6); esc.add(luz);
    const copia = m.solido.clone(true);
    copia.scale.set(1, 1, 1); copia.visible = true; copia.traverse(o => { o.visible = true; });
    const g = new THREE.Group(); g.add(copia); g.rotation.y = m.raiz.rotation.y; esc.add(g);
    g.updateMatrixWorld(true);
    const caja = new THREE.Box3().setFromObject(g), centro = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
    const parque = cual === "hoy" && (id === "penitenciaria-nacional" || id === "pabellon-argentino" || id === "palacio-miro" || id === "cementerio-sud");   // los parques se ven más cerca
    const r = Math.max(tam.x, tam.z, tam.y*1.4)*(parque ? 0.4 : 0.62) + 4;
    const c = new THREE.PerspectiveCamera(30, w/h, 1, 5000);
    const dir = new THREE.Vector3(1, 0.85, 1.25).normalize();
    c.position.copy(centro).addScaledVector(dir, r/Math.sin(THREE.MathUtils.degToRad(15)));
    c.lookAt(centro);
    miniR.render(esc, c);
    return (miniCache[clave] = miniR.domElement.toDataURL("image/png"));
  };
})();
