// ── 상태 ──────────────────────────────────────────────
let map;
let markers = {};
let selectedMmsi = null;
let currentShip = null;
let ws = null;

// ── 목 데이터 (35척 — 실제 운항 중인 크루즈선 기반) ──
const MOCK_SHIPS = [
  // ── 카리브해 ─────────────────────────────────────────
  { mmsi:'311056900', name:'ICON OF THE SEAS',       lat:24.55, lon:-79.85, speed:19.2, heading:145, cog:145, status:'항해 중', dest:'COCO CAY',    origin:'MIAMI',       flag:'🇧🇸', country:'바하마',   imo:'9841270', callsign:'C6RQ5', type:'크루즈여객선', length:365, width:65, gt:250800, draught:9.4, eta:'04-29 08:00' },
  { mmsi:'215501000', name:'WONDER OF THE SEAS',     lat:25.08, lon:-77.35, speed:18.4, heading:312, cog:310, status:'항해 중', dest:'NASSAU',       origin:'MIAMI',       flag:'🇺🇸', country:'미국',     imo:'9838985', callsign:'9HA5484', type:'크루즈여객선', length:362, width:64, gt:236857, draught:9.3, eta:'04-29 07:00' },
  { mmsi:'311040700', name:'HARMONY OF THE SEAS',    lat:22.10, lon:-72.40, speed:17.8, heading: 95, cog: 97, status:'항해 중', dest:'ST MAARTEN',   origin:'PORT CANAVERAL', flag:'🇧🇸', country:'바하마', imo:'9682875', callsign:'C6EQ4', type:'크루즈여객선', length:362, width:65, gt:227700, draught:9.3, eta:'04-29 12:00' },
  { mmsi:'311040600', name:'ALLURE OF THE SEAS',     lat:17.90, lon:-66.10, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'ST THOMAS',    origin:'FT LAUDERDALE', flag:'🇧🇸', country:'바하마', imo:'9383948', callsign:'C6DQ6', type:'크루즈여객선', length:361, width:65, gt:225282, draught:9.3, eta:'04-29 16:00' },
  { mmsi:'311000058', name:'SYMPHONY OF THE SEAS',   lat:18.48, lon:-66.11, speed:20.1, heading: 88, cog: 90, status:'항해 중', dest:'ST THOMAS',    origin:'SAN JUAN',    flag:'🇧🇸', country:'바하마',   imo:'9744001', callsign:'C6DQ7', type:'크루즈여객선', length:361, width:65, gt:228081, draught:9.1, eta:'04-29 14:00' },
  { mmsi:'352549000', name:'CARNIVAL JUBILEE',       lat:23.18, lon:-82.44, speed:16.5, heading:250, cog:252, status:'항해 중', dest:'COZUMEL',      origin:'GALVESTON',   flag:'🇵🇦', country:'파나마',   imo:'9862598', callsign:'3EBR8', type:'크루즈여객선', length:343, width:52, gt:183521, draught:8.8, eta:'04-30 07:00' },
  { mmsi:'352002164', name:'MARDI GRAS',             lat:26.65, lon:-79.38, speed:18.0, heading:180, cog:182, status:'항해 중', dest:'NASSAU',       origin:'PORT CANAVERAL', flag:'🇵🇦', country:'파나마', imo:'9837444', callsign:'3EBR5', type:'크루즈여객선', length:340, width:42, gt:181000, draught:8.6, eta:'04-29 10:00' },
  { mmsi:'311040800', name:'NORWEGIAN BLISS',        lat:20.52, lon:-86.95, speed:17.2, heading:270, cog:268, status:'항해 중', dest:'COSTA MAYA',   origin:'MIAMI',       flag:'🇧🇸', country:'바하마',   imo:'9751699', callsign:'C6FR2', type:'크루즈여객선', length:333, width:41, gt:168028, draught:8.8, eta:'04-29 09:00' },
  { mmsi:'352001929', name:'NORWEGIAN ENCORE',       lat:20.97, lon:-156.71,speed:21.2, heading:178, cog:180, status:'항해 중', dest:'LAHAINA',      origin:'HONOLULU',    flag:'🇵🇦', country:'파나마',   imo:'9744035', callsign:'3E2773', type:'크루즈여객선', length:333, width:41, gt:169145, draught:8.8, eta:'04-29 08:00' },

  // ── 지중해 ───────────────────────────────────────────
  { mmsi:'229349000', name:'MSC WORLD EUROPA',       lat:36.14, lon: 14.51, speed:16.8, heading:220, cog:222, status:'항해 중', dest:'VALLETTA',     origin:'GENOVA',      flag:'🇲🇹', country:'몰타',     imo:'9840326', callsign:'9HA5812', type:'크루즈여객선', length:333, width:46, gt:215863, draught:8.5, eta:'04-28 22:00' },
  { mmsi:'248220000', name:'COSTA SMERALDA',         lat:43.67, lon:  7.25, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'MARSEILLE',    origin:'SAVONA',      flag:'🇮🇹', country:'이탈리아', imo:'9783730', callsign:'IBXN',   type:'크루즈여객선', length:337, width:42, gt:185010, draught:8.3, eta:'04-30 09:00' },
  { mmsi:'229432000', name:'MSC GRANDIOSA',          lat:38.12, lon: 13.36, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'PALERMO',      origin:'GENOVA',      flag:'🇲🇹', country:'몰타',     imo:'9803613', callsign:'9HA5524', type:'크루즈여객선', length:331, width:43, gt:181000, draught:8.5, eta:'04-29 08:00' },
  { mmsi:'229255000', name:'MSC SEASHORE',           lat:40.85, lon:  2.15, speed:18.2, heading: 55, cog: 57, status:'항해 중', dest:'BARCELONA',    origin:'MARSEILLE',   flag:'🇲🇹', country:'몰타',     imo:'9826678', callsign:'9HA5673', type:'크루즈여객선', length:339, width:41, gt:169400, draught:8.5, eta:'04-29 06:00' },
  { mmsi:'229212000', name:'MSC BELLISSIMA',         lat:37.52, lon: 15.08, speed:14.5, heading:330, cog:332, status:'항해 중', dest:'CATANIA',      origin:'PIRAEUS',     flag:'🇲🇹', country:'몰타',     imo:'9781734', callsign:'9HA5458', type:'크루즈여객선', length:315, width:43, gt:167600, draught:8.5, eta:'04-28 20:00' },
  { mmsi:'229111000', name:'MSC VIRTUOSA',           lat:43.30, lon:  5.38, speed: 0.0, heading:180, cog:180, status:'정박 중', dest:'MARSEILLE',    origin:'GENOVA',      flag:'🇲🇹', country:'몰타',     imo:'9826630', callsign:'9HA5651', type:'크루즈여객선', length:331, width:43, gt:181541, draught:8.5, eta:'04-29 18:00' },
  { mmsi:'249635000', name:'CELEBRITY BEYOND',       lat:41.90, lon: 12.48, speed: 0.0, heading:270, cog:270, status:'정박 중', dest:'CIVITAVECCHIA', origin:'BARCELONA',  flag:'🇲🇹', country:'몰타',     imo:'9797484', callsign:'9HA5700', type:'크루즈여객선', length:326, width:40, gt:140600, draught:8.5, eta:'04-29 07:00' },
  { mmsi:'249620000', name:'CELEBRITY APEX',         lat:37.97, lon: 23.73, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'PIRAEUS',      origin:'SANTORINI',   flag:'🇲🇹', country:'몰타',     imo:'9797472', callsign:'9HA5698', type:'크루즈여객선', length:306, width:39, gt:130818, draught:8.3, eta:'04-28 19:00' },
  { mmsi:'229887000', name:'COSTA TOSCANA',          lat:41.38, lon:  2.17, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'BARCELONA',    origin:'SAVONA',      flag:'🇮🇹', country:'이탈리아', imo:'9828722', callsign:'IBXP',   type:'크루즈여객선', length:337, width:42, gt:183519, draught:8.5, eta:'04-29 08:00' },
  { mmsi:'248468000', name:'SKY PRINCESS',           lat:40.65, lon: 14.29, speed: 5.3, heading:180, cog:182, status:'입항 중', dest:'SALERNO',      origin:'CIVITAVECCHIA', flag:'🇧🇲', country:'버뮤다',  imo:'9753585', callsign:'ZCFE7',  type:'크루즈여객선', length:311, width:38, gt:141000, draught:8.5, eta:'04-28 17:00' },
  { mmsi:'310627000', name:'ENCHANTED PRINCESS',     lat:39.62, lon: 19.91, speed:14.8, heading:210, cog:212, status:'항해 중', dest:'CORFU',        origin:'PIRAEUS',     flag:'🇧🇲', country:'버뮤다',   imo:'9795752', callsign:'ZCFE9',  type:'크루즈여객선', length:330, width:38, gt:142714, draught:8.5, eta:'04-29 08:00' },

  // ── 대서양·북유럽 ─────────────────────────────────────
  { mmsi:'310631000', name:'QUEEN MARY 2',           lat:45.30, lon:-35.40, speed:25.5, heading: 92, cog: 91, status:'항해 중', dest:'SOUTHAMPTON',  origin:'NEW YORK',    flag:'🇧🇲', country:'버뮤다',   imo:'9241061', callsign:'ZCFG2',  type:'크루즈여객선', length:345, width:45, gt:148528, draught:10.3,eta:'04-30 06:00' },
  { mmsi:'212248000', name:'MEIN SCHIFF 1',          lat:59.91, lon: 10.74, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'OSLO',         origin:'KIEL',        flag:'🇲🇹', country:'몰타',     imo:'9741665', callsign:'9HA4510', type:'크루즈여객선', length:315, width:42, gt:111500, draught:7.9, eta:'04-30 12:00' },
  { mmsi:'218024000', name:'AIDANOVA',               lat:55.60, lon:  8.80, speed:16.2, heading: 5,  cog:  6, status:'항해 중', dest:'HAMBURG',      origin:'TENERIFE',    flag:'🇩🇪', country:'독일',     imo:'9751610', callsign:'DBBZ',   type:'크루즈여객선', length:337, width:42, gt:183858, draught:8.3, eta:'04-29 20:00' },
  { mmsi:'218025000', name:'AIDAPRIMA',              lat:53.55, lon: 10.00, speed: 0.0, heading:180, cog:180, status:'정박 중', dest:'HAMBURG',      origin:'DOVER',       flag:'🇩🇪', country:'독일',     imo:'9636923', callsign:'DBCA',   type:'크루즈여객선', length:300, width:38, gt:124500, draught:7.3, eta:'04-29 10:00' },

  // ── 아시아·태평양 ─────────────────────────────────────
  { mmsi:'477248900', name:'CELEBRITY ECLIPSE',      lat: 1.35, lon:103.82, speed:14.5, heading: 45, cog: 48, status:'항해 중', dest:'SINGAPORE',    origin:'HONG KONG',   flag:'🇧🇸', country:'바하마',   imo:'9403154', callsign:'C6FL2',  type:'크루즈여객선', length:317, width:37, gt:122000, draught:8.2, eta:'04-28 20:00' },
  { mmsi:'538006770', name:'DIAMOND PRINCESS',       lat:35.44, lon:139.65, speed: 5.2, heading:270, cog:268, status:'입항 중', dest:'YOKOHAMA',     origin:'KOBE',        flag:'🇧🇸', country:'바하마',   imo:'9228198', callsign:'V7WX9',  type:'크루즈여객선', length:290, width:38, gt:115875, draught:8.5, eta:'04-28 18:00' },
  { mmsi:'477354700', name:'QUANTUM OF THE SEAS',    lat:35.68, lon:129.75, speed:16.0, heading:200, cog:202, status:'항해 중', dest:'BUSAN',        origin:'TOKYO',       flag:'🇧🇸', country:'바하마',   imo:'9549463', callsign:'C6PG3',  type:'크루즈여객선', length:348, width:41, gt:168666, draught:8.9, eta:'04-29 07:00' },
  { mmsi:'538005885', name:'OVATION OF THE SEAS',    lat:-33.85,lon:151.22, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'SYDNEY',       origin:'AUCKLAND',    flag:'🇧🇸', country:'바하마',   imo:'9617095', callsign:'V7SQ2',  type:'크루즈여객선', length:348, width:41, gt:167800, draught:8.9, eta:'04-29 06:00' },
  { mmsi:'477356100', name:'SPECTRUM OF THE SEAS',   lat:22.30, lon:114.17, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'HONG KONG',    origin:'SHANGHAI',    flag:'🇧🇸', country:'바하마',   imo:'9726548', callsign:'C6PG6',  type:'크루즈여객선', length:347, width:41, gt:168666, draught:8.9, eta:'04-28 18:00' },

  // ── 알래스카 ──────────────────────────────────────────
  { mmsi:'311000888', name:'NORWEGIAN JOY',          lat:57.05, lon:-135.35,speed:17.8, heading:325, cog:324, status:'항해 중', dest:'JUNEAU',       origin:'SEATTLE',     flag:'🇧🇸', country:'바하마',   imo:'9677430', callsign:'C6RQ2',  type:'크루즈여객선', length:333, width:41, gt:167725, draught:8.7, eta:'04-29 10:00' },
  { mmsi:'311040900', name:'NORWEGIAN GETAWAY',      lat:59.55, lon:-150.80,speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'SEWARD',       origin:'VANCOUVER',   flag:'🇧🇸', country:'바하마',   imo:'9606912', callsign:'C6FQ9',  type:'크루즈여객선', length:326, width:40, gt:145655, draught:8.6, eta:'04-30 08:00' },

  // ── 남미·대서양 ───────────────────────────────────────
  { mmsi:'310627100', name:'CARNIVAL MAGIC',         lat:-34.92,lon:-56.17, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'MONTEVIDEO',   origin:'BUENOS AIRES',flag:'🇵🇦', country:'파나마',   imo:'9378473', callsign:'3EBQ8',  type:'크루즈여객선', length:272, width:35, gt:130000, draught:8.2, eta:'04-29 08:00' },
  { mmsi:'311041000', name:'NIEUW STATENDAM',        lat:12.10, lon:-61.65, speed:13.5, heading:315, cog:316, status:'항해 중', dest:'BRIDGETOWN',   origin:'WILLEMSTAD',  flag:'🇧🇸', country:'바하마',   imo:'9778861', callsign:'C6FR5',  type:'크루즈여객선', length:297, width:35, gt:99500,  draught:7.9, eta:'04-29 06:00' },
  { mmsi:'244877000', name:'ROTTERDAM',              lat:52.00, lon:  4.10, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'ROTTERDAM',    origin:'SOUTHAMPTON', flag:'🇳🇱', country:'네덜란드', imo:'9692569', callsign:'PDRR',   type:'크루즈여객선', length:297, width:35, gt:99800,  draught:8.0, eta:'04-28 16:00' },
];

// ── 유틸 ───────────────────────────────────────────────
function setStatus(state, text) {
  document.getElementById('status-dot').className = state;
  document.getElementById('status-text').textContent = text;
}

function updateCount() {
  document.getElementById('ship-count').textContent = Object.keys(markers).length;
}

// ── 전세계 크루즈 선박 수 조회 ────────────────────────
// AISStream의 /vessels REST API로 크루즈 타입(60~69) 선박 수를 조회.
// 실패 시 산업 통계 기준 고정값(323) 표시.
async function fetchWorldCruiseCount() {
  const el = document.getElementById('world-count');
  try {
    const res = await fetch(
      'https://api.aisstream.io/v0/vessels?shipType=60-69&limit=1',
      { headers: { 'Authorization': AISSTREAM_API_KEY } }
    );
    if (res.ok) {
      const json = await res.json();
      const total = json?.total ?? json?.count ?? null;
      if (total && total > 0) { el.textContent = total.toLocaleString(); return; }
    }
  } catch (_) {}
  // REST API 미지원 시 업계 통계 기준값 사용 (CLIA 2024 보고서)
  el.textContent = '약 323';
}

// ── 클릭 유도 힌트 ────────────────────────────────────
let hintTimer = null;

function initHint() {
  const hint = document.getElementById('click-hint');
  // 8초 후 자동 사라짐
  hintTimer = setTimeout(() => hint.classList.add('fade-out'), 8000);
}

window.dismissHint = function () {
  clearTimeout(hintTimer);
  document.getElementById('click-hint').classList.add('fade-out');
};

function compassDir(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round((deg ?? 0) / 22.5) % 16] + ` (${deg ?? 0}°)`;
}

// ── Leaflet 초기화 ────────────────────────────────────
function initMap() {
  map = L.map('map', {
    center: [25, 10],
    zoom: 3,
    zoomControl: false,
    attributionControl: true,
  });

  // 밝은 지도 타일 (CartoDB Positron)
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  map.on('click', () => { closeCard(); deselectAll(); });

  initHint();
  fetchWorldCruiseCount();

  // ① 목 데이터를 항상 즉시 표시
  loadMockData();

  // ② AIS 키가 있으면 실시간 데이터로 보완
  const hasKey = typeof AISSTREAM_API_KEY !== 'undefined'
               && AISSTREAM_API_KEY !== 'YOUR_AISSTREAM_API_KEY'
               && AISSTREAM_API_KEY.trim() !== '';
  if (hasKey) {
    connectAIS();
  }
}

// ── 아이콘 선택 로직 ──────────────────────────────────
// GT 기준 이모지: 대형(🚢) / 중형(🛳️) / 소형·페리(⛴️)
function shipEmoji(ship) {
  const gt = ship.gt || 0;
  if (gt >= 180000) return '🚢';
  if (gt >= 100000) return '🛳️';
  return '⛴️';
}

// 항해 상태별 컬러 점
function statusColor(status) {
  if (!status || status.includes('항해') || status.includes('순항')) return '#22c55e'; // 녹색
  if (status.includes('입항'))  return '#f59e0b'; // 주황
  return '#94a3b8'; // 회색 (정박·기타)
}

// ── 마커 아이콘 ───────────────────────────────────────
function makeIcon(ship, selected) {
  const emoji = shipEmoji(ship);
  const dot   = statusColor(ship.status);
  return L.divIcon({
    className: 'leaflet-ship-icon',
    html: `<div class="ship-pin${selected ? ' selected' : ''}">
             <span class="ship-pin-emoji">${emoji}</span>
             <span class="ship-pin-dot" style="background:${dot}"></span>
           </div>`,
    iconSize: [38, 44],
    iconAnchor: [19, 40],
  });
}

// ── 마커 생성 ─────────────────────────────────────────
function createMarker(ship) {
  const m = L.marker([ship.lat, ship.lon], { icon: makeIcon(ship, false) })
    .addTo(map)
    .on('click', (e) => { L.DomEvent.stopPropagation(e); onShipClick(ship.mmsi); });

  m.bindTooltip(ship.name, {
    permanent: false,
    direction: 'top',
    className: 'ship-tooltip',
    offset: [0, -6],
  });

  markers[ship.mmsi] = { marker: m, data: { ...ship } };
}

// ── 마커 업데이트 ─────────────────────────────────────
function updateMarker(ship) {
  if (markers[ship.mmsi]) {
    markers[ship.mmsi].marker.setLatLng([ship.lat, ship.lon]);
    Object.assign(markers[ship.mmsi].data, ship);
  } else {
    createMarker(ship);
  }
}

// ── 선박 클릭 ─────────────────────────────────────────
function onShipClick(mmsi) {
  dismissHint();
  deselectAll();
  selectedMmsi = mmsi;
  currentShip = markers[mmsi].data;
  markers[mmsi].marker.setIcon(makeIcon(currentShip, true));
  map.panTo(markers[mmsi].marker.getLatLng(), { animate: true, duration: 0.5 });
  showCard(currentShip);
}

function deselectAll() {
  if (selectedMmsi && markers[selectedMmsi]) {
    markers[selectedMmsi].marker.setIcon(makeIcon(markers[selectedMmsi].data, false));
  }
  selectedMmsi = null;
}

// ── 간단 카드 ─────────────────────────────────────────
function showCard(ship) {
  document.getElementById('card-name').textContent    = ship.name;
  document.getElementById('card-flag').textContent    = ship.flag || '';
  document.getElementById('card-speed').textContent   = (ship.speed ?? 0) + ' knots';
  document.getElementById('card-heading').textContent = compassDir(ship.heading);
  document.getElementById('card-status').textContent  = ship.status || '—';
  document.getElementById('card-dest').textContent    = ship.dest   || '—';
  document.getElementById('info-card').classList.add('visible');
}

window.closeCard = function () {
  document.getElementById('info-card').classList.remove('visible');
  deselectAll();
  currentShip = null;
};

// ── 상세 페이지 ───────────────────────────────────────
window.openDetail = function () {
  const s = currentShip;
  if (!s) return;

  const set = (id, val) => { document.getElementById(id).textContent = val; };

  set('detail-name',      s.name);
  set('detail-flag-name', `${s.flag || '🚢'} ${s.country || '—'}`);
  set('detail-badge',     s.status || '—');
  set('d-lat',     s.lat.toFixed(5) + '°');
  set('d-lon',     s.lon.toFixed(5) + '°');
  set('d-speed',   (s.speed ?? 0) + ' knots');
  set('d-heading', compassDir(s.heading));
  set('d-cog',     compassDir(s.cog));
  set('d-mmsi',     s.mmsi);
  set('d-imo',      s.imo      || '—');
  set('d-callsign', s.callsign || '—');
  set('d-country',  s.country  || '—');
  set('d-type',     s.type     || '—');
  set('d-origin',   s.origin   || '—');
  set('d-dest',     s.dest     || '—');
  set('d-eta',      s.eta      || '—');
  set('d-draught',  s.draught  ? s.draught + ' m' : '—');
  set('d-updated',  new Date().toLocaleTimeString('ko-KR'));
  set('d-length',   s.length   ? s.length + ' m' : '—');
  set('d-width',    s.width    ? s.width  + ' m' : '—');
  set('d-gt',       s.gt       ? s.gt.toLocaleString() + ' GT' : '—');

  document.getElementById('detail-page').classList.add('visible');
};

window.closeDetail = function () {
  document.getElementById('detail-page').classList.remove('visible');
};

// ── 목 데이터 로드 + 위치 애니메이션 ─────────────────
function loadMockData() {
  MOCK_SHIPS.forEach(ship => createMarker(ship));
  updateCount();
  setStatus('connected', 'AIS 연결 중...');

  setInterval(() => {
    MOCK_SHIPS.forEach(ship => {
      if (ship.speed > 0) {
        const rad = (ship.heading * Math.PI) / 180;
        ship.lat += Math.cos(rad) * ship.speed * 0.00001;
        ship.lon += Math.sin(rad) * ship.speed * 0.000015;
        if (markers[ship.mmsi]) {
          markers[ship.mmsi].marker.setLatLng([ship.lat, ship.lon]);
          markers[ship.mmsi].data.lat = ship.lat;
          markers[ship.mmsi].data.lon = ship.lon;
        }
      }
    });
  }, 3000);
}

// ── AISStream.io 실시간 WebSocket ─────────────────────
function connectAIS() {
  ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.onopen = () => {
    setStatus('connected', '실시간 연결됨');
    ws.send(JSON.stringify({
      APIKey: AISSTREAM_API_KEY,
      BoundingBoxes: [[[-90, -180], [90, 180]]],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    }));
  };

  ws.onmessage = (e) => {
    try { handleAISMessage(JSON.parse(e.data)); } catch (_) {}
  };

  ws.onerror = () => setStatus('connected', '데모 + AIS 오류');
  ws.onclose = () => { setTimeout(connectAIS, 5000); };
}

// 크루즈 선종 코드 60~69
function isCruise(type) { return type >= 60 && type <= 69; }

function handleAISMessage(msg) {
  const meta = msg.MetaData || {};
  const mmsi = String(meta.MMSI || '');
  if (!mmsi) return;

  const prev = markers[mmsi]?.data || { mmsi };

  if (msg.MessageType === 'PositionReport') {
    const p = msg.Message?.PositionReport || {};
    Object.assign(prev, {
      lat:     p.Latitude    ?? prev.lat,
      lon:     p.Longitude   ?? prev.lon,
      speed:   p.Sog         ?? prev.speed   ?? 0,
      heading: p.TrueHeading ?? p.Cog        ?? prev.heading ?? 0,
      cog:     p.Cog         ?? prev.cog     ?? 0,
      status:  navStatus(p.NavigationalStatus),
    });
  }

  if (msg.MessageType === 'ShipStaticData') {
    const s = msg.Message?.ShipStaticData || {};
    // 크루즈선 타입(60~69)만 처리
    if (s.Type && !isCruise(s.Type) && !markers[mmsi]) return;

    Object.assign(prev, {
      name:     s.Name?.trim()        || prev.name     || '(이름없음)',
      dest:     s.Destination?.trim() || prev.dest     || '—',
      callsign: s.CallSign?.trim()    || prev.callsign || '—',
      imo:      s.ImoNumber ? String(s.ImoNumber) : (prev.imo || '—'),
      type:     shipType(s.Type),
      draught:  s.MaximumStaticDraught ?? prev.draught,
      eta:      s.Eta ? formatEta(s.Eta) : prev.eta,
      length:   ((s.Dimension?.A ?? 0) + (s.Dimension?.B ?? 0)) || prev.length,
      width:    ((s.Dimension?.C ?? 0) + (s.Dimension?.D ?? 0)) || prev.width,
      flag:     '🚢',
      country:  meta.ShipName || prev.country || '—',
    });
  }

  if (prev.lat && prev.lon) {
    updateMarker(prev);
    updateCount();
  }
}

function navStatus(code) {
  return ({0:'항해 중', 1:'닻 투하', 2:'운항 불능', 3:'기동 제한', 5:'정박 중', 8:'순항 중'})[code] || '항해 중';
}

function shipType(code) {
  return (code >= 60 && code <= 69) ? '크루즈여객선' : '크루즈선';
}

function formatEta(eta) {
  if (!eta) return '—';
  try {
    return `${String(eta.Month).padStart(2,'0')}-${String(eta.Day).padStart(2,'0')} `
         + `${String(eta.Hour).padStart(2,'0')}:${String(eta.Minute).padStart(2,'0')}`;
  } catch (_) { return '—'; }
}

// ── 시작 ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initMap);
