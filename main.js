// ── 상태 ──────────────────────────────────────────────
let map;
let markers = {};        // mmsi → { marker, data }
let selectedMmsi = null;
let ws = null;
let currentShip = null;

// ── 목 데이터 (API 키 없을 때 시연용) ─────────────────
const MOCK_SHIPS = [
  { mmsi:'215501000', name:'WONDER OF THE SEAS', lat:25.08, lon:-77.35, speed:18.4, heading:312, cog:310, status:'항해 중', dest:'NASSAU',    origin:'MIAMI',       flag:'🇺🇸', country:'미국', imo:'9838985', callsign:'9HA5484', type:'크루즈여객선', length:362, width:64, gt:236857, draught:9.3, eta:'2026-04-29 07:00' },
  { mmsi:'311000058', name:'SYMPHONY OF THE SEAS', lat:18.48, lon:-66.11, speed:20.1, heading: 88, cog: 90, status:'항해 중', dest:'ST THOMAS', origin:'SAN JUAN',    flag:'🇧🇸', country:'바하마', imo:'9744001', callsign:'C6DQ7', type:'크루즈여객선', length:361, width:65, gt:228081, draught:9.1, eta:'2026-04-29 14:00' },
  { mmsi:'229349000', name:'MSC WORLD EUROPA',   lat:36.14, lon: 14.51, speed:16.8, heading:220, cog:222, status:'항해 중', dest:'VALLETTA',   origin:'GENOVA',      flag:'🇲🇹', country:'몰타', imo:'9840326', callsign:'9HA5812', type:'크루즈여객선', length:333, width:46, gt:215863, draught:8.5, eta:'2026-04-28 22:00' },
  { mmsi:'248220000', name:'COSTA SMERALDA',     lat:43.67, lon:  7.25, speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'MARSEILLE',  origin:'SAVONA',      flag:'🇮🇹', country:'이탈리아', imo:'9783730', callsign:'IBXN', type:'크루즈여객선', length:337, width:42, gt:185010, draught:8.3, eta:'2026-04-30 09:00' },
  { mmsi:'352001929', name:'NORWEGIAN ENCORE',   lat:20.97, lon:-156.71, speed:21.2, heading:178, cog:180, status:'항해 중', dest:'LAHAINA',    origin:'HONOLULU',   flag:'🇵🇦', country:'파나마', imo:'9744035', callsign:'3E2773', type:'크루즈여객선', length:333, width:41, gt:169145, draught:8.8, eta:'2026-04-29 08:00' },
  { mmsi:'477248900', name:'CELEBRITY ECLIPSE',  lat: 1.35, lon:103.82, speed:14.5, heading: 45, cog: 48, status:'항해 중', dest:'SINGAPORE',   origin:'HONG KONG',   flag:'🇧🇸', country:'바하마', imo:'9403154', callsign:'C6FL2', type:'크루즈여객선', length:317, width:37, gt:122000, draught:8.2, eta:'2026-04-28 20:00' },
  { mmsi:'538006770', name:'DIAMOND PRINCESS',   lat:35.44, lon:139.65, speed: 5.2, heading:270, cog:268, status:'입항 중', dest:'YOKOHAMA',    origin:'KOBE',        flag:'🇧🇸', country:'바하마', imo:'9228198', callsign:'V7WX9', type:'크루즈여객선', length:290, width:38, gt:115875, draught:8.5, eta:'2026-04-28 18:00' },
  { mmsi:'212248000', name:'MEIN SCHIFF 1',      lat:59.91, lon: 10.74, speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'OSLO',         origin:'KIEL',        flag:'🇲🇹', country:'몰타', imo:'9741665', callsign:'9HA4510', type:'크루즈여객선', length:315, width:42, gt:111500, draught:7.9, eta:'2026-04-30 12:00' },
];

// ── 유틸 ───────────────────────────────────────────────
function setStatus(state, text, count) {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('status-text');
  const cnt = document.getElementById('ship-count');
  dot.className = state;
  txt.textContent = text;
  if (count !== undefined) cnt.textContent = ` | 선박 ${count}척`;
}

function compassDir(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16] + ` (${deg}°)`;
}

// ── Google Maps 초기화 ────────────────────────────────
window.initMap = function () {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 25, lng: 0 },
    zoom: 3,
    mapTypeId: 'hybrid',
    disableDefaultUI: true,
    gestureHandling: 'greedy',
    styles: [
      { featureType: 'water', stylers: [{ color: '#0d2137' }] },
      { featureType: 'landscape', stylers: [{ color: '#1a3a5c' }] },
    ]
  });

  // 지도 빈 곳 클릭 시 카드 닫기
  map.addListener('click', () => {
    closeCard();
    deselectAll();
  });

  loadShips();
};

// ── 마커 생성 ────────────────────────────────────────
function createMarker(ship) {
  const div = document.createElement('div');
  div.className = 'ship-marker';
  div.innerHTML = `<span class="emoji">🚢</span><span class="ship-label">${ship.name}</span>`;
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    onShipClick(ship.mmsi);
  });

  const marker = new google.maps.marker.AdvancedMarkerElement({
    map,
    position: { lat: ship.lat, lng: ship.lon },
    content: div,
    title: ship.name,
  });

  markers[ship.mmsi] = { marker, data: ship, el: div };
}

// ── 마커 업데이트 ────────────────────────────────────
function updateMarker(ship) {
  if (markers[ship.mmsi]) {
    markers[ship.mmsi].marker.position = { lat: ship.lat, lng: ship.lon };
    markers[ship.mmsi].data = ship;
  } else {
    createMarker(ship);
  }
}

// ── 선박 클릭 ────────────────────────────────────────
function onShipClick(mmsi) {
  const entry = markers[mmsi];
  if (!entry) return;

  deselectAll();
  entry.el.classList.add('selected');
  selectedMmsi = mmsi;
  currentShip = entry.data;

  showCard(entry.data);
}

function deselectAll() {
  Object.values(markers).forEach(e => e.el.classList.remove('selected'));
  selectedMmsi = null;
}

// ── 간단 카드 ────────────────────────────────────────
function showCard(ship) {
  document.getElementById('card-name').textContent = ship.name;
  document.getElementById('card-flag').textContent = ship.flag;
  document.getElementById('card-speed').textContent = ship.speed + ' knots';
  document.getElementById('card-heading').textContent = compassDir(ship.heading);
  document.getElementById('card-status').textContent = ship.status;
  document.getElementById('card-dest').textContent = ship.dest || '—';

  const card = document.getElementById('info-card');
  card.classList.add('visible');
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

  document.getElementById('detail-name').textContent = s.name;
  document.getElementById('detail-flag-name').textContent = `${s.flag} ${s.country}`;
  document.getElementById('detail-badge').textContent = s.status;

  document.getElementById('d-lat').textContent = s.lat.toFixed(5) + '°';
  document.getElementById('d-lon').textContent = s.lon.toFixed(5) + '°';
  document.getElementById('d-speed').textContent = s.speed + ' knots';
  document.getElementById('d-heading').textContent = compassDir(s.heading);
  document.getElementById('d-cog').textContent = compassDir(s.cog);

  document.getElementById('d-mmsi').textContent = s.mmsi;
  document.getElementById('d-imo').textContent = s.imo || '—';
  document.getElementById('d-callsign').textContent = s.callsign || '—';
  document.getElementById('d-country').textContent = s.country;
  document.getElementById('d-type').textContent = s.type;

  document.getElementById('d-origin').textContent = s.origin || '—';
  document.getElementById('d-dest').textContent = s.dest || '—';
  document.getElementById('d-eta').textContent = s.eta || '—';
  document.getElementById('d-draught').textContent = s.draught ? s.draught + ' m' : '—';
  document.getElementById('d-updated').textContent = new Date().toLocaleTimeString('ko-KR');

  document.getElementById('d-length').textContent = s.length ? s.length + ' m' : '—';
  document.getElementById('d-width').textContent = s.width ? s.width + ' m' : '—';
  document.getElementById('d-gt').textContent = s.gt ? s.gt.toLocaleString() + ' GT' : '—';

  document.getElementById('detail-page').classList.add('visible');
};

window.closeDetail = function () {
  document.getElementById('detail-page').classList.remove('visible');
};

// ── 데이터 로딩 ───────────────────────────────────────
function loadShips() {
  // API 키가 설정돼 있으면 실시간, 아니면 목 데이터 사용
  if (typeof AISSTREAM_API_KEY !== 'undefined' && AISSTREAM_API_KEY !== 'YOUR_AISSTREAM_API_KEY') {
    connectAIS();
  } else {
    loadMockData();
  }
}

function loadMockData() {
  setStatus('', '데모 모드 (목 데이터)', MOCK_SHIPS.length);
  MOCK_SHIPS.forEach(createMarker);
  setStatus('connected', '데모 모드', MOCK_SHIPS.length);

  // 위치 소폭 업데이트로 실시간 느낌
  setInterval(() => {
    MOCK_SHIPS.forEach(ship => {
      if (ship.speed > 0) {
        const rad = (ship.heading * Math.PI) / 180;
        ship.lat += Math.cos(rad) * ship.speed * 0.00001;
        ship.lon += Math.sin(rad) * ship.speed * 0.000015;
        if (markers[ship.mmsi]) {
          markers[ship.mmsi].marker.position = { lat: ship.lat, lng: ship.lon };
          markers[ship.mmsi].data = ship;
        }
      }
    });
  }, 3000);
}

// ── AISStream.io 실시간 연결 ──────────────────────────
function connectAIS() {
  setStatus('', '실시간 연결 중...');

  ws = new WebSocket('wss://stream.aisstream.io/v0/stream');

  ws.onopen = () => {
    setStatus('connected', '실시간 연결됨');
    ws.send(JSON.stringify({
      APIKey: AISSTREAM_API_KEY,
      BoundingBoxes: [
        [[-90, -180], [90, 180]]  // 전 세계
      ],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      // 크루즈선(타입 60~69) 필터
      FilterShipTypes: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
    }));
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleAISMessage(msg);
    } catch (_) {}
  };

  ws.onerror = () => setStatus('error', '연결 오류 — 재연결 중...');
  ws.onclose = () => {
    setStatus('error', '연결 끊김');
    setTimeout(connectAIS, 5000);
  };
}

function handleAISMessage(msg) {
  const meta = msg.MetaData || {};
  const mmsi = String(meta.MMSI || '');
  if (!mmsi) return;

  let entry = markers[mmsi] ? markers[mmsi].data : { mmsi };

  if (msg.MessageType === 'PositionReport') {
    const p = msg.Message?.PositionReport || {};
    entry.lat = p.Latitude ?? entry.lat;
    entry.lon = p.Longitude ?? entry.lon;
    entry.speed = p.Sog ?? entry.speed ?? 0;
    entry.heading = p.TrueHeading ?? p.Cog ?? entry.heading ?? 0;
    entry.cog = p.Cog ?? entry.cog ?? 0;
    entry.status = navStatus(p.NavigationalStatus);
  }

  if (msg.MessageType === 'ShipStaticData') {
    const s = msg.Message?.ShipStaticData || {};
    entry.name = s.Name?.trim() || entry.name || '(이름없음)';
    entry.dest = s.Destination?.trim() || entry.dest || '—';
    entry.callsign = s.CallSign?.trim() || entry.callsign || '—';
    entry.imo = s.ImoNumber ? String(s.ImoNumber) : entry.imo || '—';
    entry.type = shipType(s.Type);
    entry.draught = s.MaximumStaticDraught ?? entry.draught;
    entry.eta = s.Eta ? formatEta(s.Eta) : entry.eta;
    entry.length = s.Dimension?.A + s.Dimension?.B || entry.length;
    entry.width = s.Dimension?.C + s.Dimension?.D || entry.width;
    entry.flag = '🚢';
    entry.country = meta.ShipName || '—';
  }

  if (entry.lat && entry.lon) {
    updateMarker(entry);
    const count = Object.keys(markers).length;
    document.getElementById('ship-count').textContent = ` | 선박 ${count}척`;
  }
}

function navStatus(code) {
  const s = { 0:'항해 중', 1:'닻 투하', 2:'운항 불능', 3:'기동 제한', 5:'정박 중', 8:'순항 중' };
  return s[code] || '항해 중';
}

function shipType(code) {
  if (code >= 60 && code <= 69) return '크루즈여객선';
  return '크루즈선';
}

function formatEta(eta) {
  if (!eta) return '—';
  try {
    return `${String(eta.Month).padStart(2,'0')}-${String(eta.Day).padStart(2,'0')} ${String(eta.Hour).padStart(2,'0')}:${String(eta.Minute).padStart(2,'0')}`;
  } catch (_) { return '—'; }
}

// AdvancedMarkerElement 폴리필 (구버전 Maps API 대응)
window.google?.maps?.importLibrary?.('marker');
