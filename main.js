// ── 상태 ──────────────────────────────────────────────
let map;
let markers = {};
let selectedMmsi = null;
let currentShip = null;
let ws = null;

// ── 목 데이터 (항상 초기 표시용) ──────────────────────
const MOCK_SHIPS = [
  { mmsi:'215501000', name:'WONDER OF THE SEAS',   lat:25.08,  lon:-77.35,  speed:18.4, heading:312, cog:310, status:'항해 중', dest:'NASSAU',     origin:'MIAMI',     flag:'🇺🇸', country:'미국',     imo:'9838985', callsign:'9HA5484', type:'크루즈여객선', length:362, width:64, gt:236857, draught:9.3, eta:'04-29 07:00' },
  { mmsi:'311000058', name:'SYMPHONY OF THE SEAS', lat:18.48,  lon:-66.11,  speed:20.1, heading: 88, cog: 90, status:'항해 중', dest:'ST THOMAS',   origin:'SAN JUAN',  flag:'🇧🇸', country:'바하마',   imo:'9744001', callsign:'C6DQ7',   type:'크루즈여객선', length:361, width:65, gt:228081, draught:9.1, eta:'04-29 14:00' },
  { mmsi:'229349000', name:'MSC WORLD EUROPA',     lat:36.14,  lon: 14.51,  speed:16.8, heading:220, cog:222, status:'항해 중', dest:'VALLETTA',    origin:'GENOVA',    flag:'🇲🇹', country:'몰타',     imo:'9840326', callsign:'9HA5812', type:'크루즈여객선', length:333, width:46, gt:215863, draught:8.5, eta:'04-28 22:00' },
  { mmsi:'248220000', name:'COSTA SMERALDA',       lat:43.67,  lon:  7.25,  speed: 0.0, heading:  0, cog:  0, status:'정박 중', dest:'MARSEILLE',   origin:'SAVONA',    flag:'🇮🇹', country:'이탈리아', imo:'9783730', callsign:'IBXN',    type:'크루즈여객선', length:337, width:42, gt:185010, draught:8.3, eta:'04-30 09:00' },
  { mmsi:'352001929', name:'NORWEGIAN ENCORE',     lat:20.97,  lon:-156.71, speed:21.2, heading:178, cog:180, status:'항해 중', dest:'LAHAINA',     origin:'HONOLULU',  flag:'🇵🇦', country:'파나마',   imo:'9744035', callsign:'3E2773',  type:'크루즈여객선', length:333, width:41, gt:169145, draught:8.8, eta:'04-29 08:00' },
  { mmsi:'477248900', name:'CELEBRITY ECLIPSE',    lat: 1.35,  lon:103.82,  speed:14.5, heading: 45, cog: 48, status:'항해 중', dest:'SINGAPORE',   origin:'HONG KONG', flag:'🇧🇸', country:'바하마',   imo:'9403154', callsign:'C6FL2',   type:'크루즈여객선', length:317, width:37, gt:122000, draught:8.2, eta:'04-28 20:00' },
  { mmsi:'538006770', name:'DIAMOND PRINCESS',     lat:35.44,  lon:139.65,  speed: 5.2, heading:270, cog:268, status:'입항 중', dest:'YOKOHAMA',    origin:'KOBE',      flag:'🇧🇸', country:'바하마',   imo:'9228198', callsign:'V7WX9',   type:'크루즈여객선', length:290, width:38, gt:115875, draught:8.5, eta:'04-28 18:00' },
  { mmsi:'212248000', name:'MEIN SCHIFF 1',        lat:59.91,  lon: 10.74,  speed: 0.0, heading: 90, cog: 90, status:'정박 중', dest:'OSLO',         origin:'KIEL',      flag:'🇲🇹', country:'몰타',     imo:'9741665', callsign:'9HA4510', type:'크루즈여객선', length:315, width:42, gt:111500, draught:7.9, eta:'04-30 12:00' },
];

// ── 유틸 ───────────────────────────────────────────────
function setStatus(state, text, count) {
  document.getElementById('status-dot').className = state;
  document.getElementById('status-text').textContent = text;
  if (count !== undefined)
    document.getElementById('ship-count').textContent = ` | 선박 ${count}척`;
}

function updateCount() {
  document.getElementById('ship-count').textContent = ` | 선박 ${Object.keys(markers).length}척`;
}

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
  setStatus('connected', 'AIS 연결 중...', MOCK_SHIPS.length);

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
    setStatus('connected', '실시간');
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
