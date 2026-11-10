'use strict';

// Static directory: records are manually reviewed against their cited sources.
const $ = (id) => document.getElementById(id);
const mobile = window.matchMedia('(max-width: 820px)');
const penangBounds = [[5.12, 100.14], [5.59, 100.56]];
// Allow some surrounding geography for context while keeping Penang nearby.
const navigationBounds = [[4.75, 99.65], [5.95, 101.05]];
const markers = new Map();
let map;
let points = [];
let visiblePoints = [];
let selectedId = null;
let invalidRecords = 0;
let dataState = 'loading';
let sheetTrigger;
let currentTab = 'map';
let viewChanged = false;
let locationRequest = 0;

// Exact aliases only: do not guess the material for ambiguous items.
const aliases = new Map([
  ['batteries', 'battery'],
  ['e waste', 'e waste'],
  ['electronic waste', 'e waste'],
  ['electronics', 'e waste'],
  ['old phone', 'e waste'],
  ['mobile phone', 'e waste'],
  ['cell phone', 'e waste'],
  ['laptop', 'e waste'],
  ['computer', 'e waste'],
  ['newspaper', 'paper'],
  ['newspapers', 'paper'],
  ['aluminium cans', 'metal'],
  ['aluminum cans', 'metal']
]);

function normalize(value) {
  return value.trim().toLowerCase().replace(/[-–—]+/g, ' ').replace(/\s+/g, ' ');
}

function materialKey(value) {
  const normalized = normalize(value);
  return aliases.get(normalized) || normalized;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

function nearestMappedPoint(candidates, lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let nearest = null;
  for (const point of candidates) {
    if (!hasMapLocation(point) || point.status === 'demo' || point.historical) continue;
    const distance = distanceKm(lat, lng, point.lat, point.lng);
    if (!nearest || distance < nearest.distance) nearest = { point, distance };
  }
  return nearest;
}

function nearestStatus(message = '') {
  const status = $('nearest-status');
  status.textContent = message;
  status.hidden = !message;
}

function locateNearest() {
  const request = ++locationRequest;
  const material = $('material').value;
  if (material === 'all') { nearestStatus(); return; }
  if (!visiblePoints.some((point) => hasMapLocation(point) && point.status !== 'demo' && !point.historical)) {
    nearestStatus('No mapped matches. Some listed places may not have coordinates.');
    return;
  }
  if (!map || !navigator.geolocation) {
    nearestStatus('Location is unavailable. Browse the matching places below.');
    return;
  }
  nearestStatus('Finding your nearest listed match…');
  navigator.geolocation.getCurrentPosition((position) => {
    if (request !== locationRequest || $('material').value !== material || currentTab !== 'map') return;
    const nearest = nearestMappedPoint(visiblePoints, position.coords.latitude, position.coords.longitude);
    if (!nearest) { nearestStatus('No mapped matches. Browse the list below.'); return; }
    selectedId = nearest.point.id;
    renderPoints();
    viewChanged = true;
    map.setView([nearest.point.lat, nearest.point.lng], Math.max(map.getZoom(), 15), { animate: false });
    nearestStatus(`Closest mapped match: ${nearest.point.name} · ${nearest.distance.toFixed(1)} km straight line. Availability unverified.`);
  }, (error) => {
    if (request !== locationRequest) return;
    nearestStatus(error.code === 1 ? 'Location permission denied. Allow location in your browser to find the nearest place.' :
      'Could not get your location. Check settings, choose All materials, then try again.');
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
}

// Translate only explicitly stated source terms into broad search categories.
// Keep the original wording visible because each category can have restrictions.
function reportedMaterialKeys(record) {
  const text = (Array.isArray(record.sourceReportedMaterials)
    ? record.sourceReportedMaterials.join('; ') : record.sourceReportedMaterials || '').toLowerCase();
  const keys = [];
  const rules = [
    ['plastic', /\bplastics?\b/], ['paper', /\b(?:papers?|cartons?|carton box)\b/],
    ['glass', /\bglass\b/], ['metal', /\b(?:metals?|aluminium|aluminum|iron|copper|cans)\b/],
    ['battery', /\b(?:batter(?:y|ies))\b/], ['e waste', /\b(?:e[ -]?waste|electronics?)\b/],
    ['clothes', /\b(?:cloth(?:es|ing))\b/], ['cooking oil', /\bused cooking oil\b/],
    ['fluorescent lights', /\b(?:fluorescent (?:lights?|tubes?)|light tubes|lamps)\b/],
    ['drink packets', /\bdrink packets\b/], ['poly foam', /\bpoly foam\b/],
    ['toys', /\btoys\b/], ['jewellery', /\bjewellery\b/]
  ];
  for (const [key, pattern] of rules) {
    // A stated exclusion is not acceptance.
    if (pattern.test(text) && !(key === 'glass' && /except (?:for )?glass/.test(text))) keys.push(key);
  }
  const types = Array.isArray(record.sourceReportedFacilityTypes) ? record.sourceReportedFacilityTypes : [];
  if (types.includes('used cooking oil bin') && !keys.includes('cooking oil')) keys.push('cooking oil');
  if (types.includes('e-waste bin') && !keys.includes('e waste')) keys.push('e waste');
  return keys;
}

function safeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function sourceLink(value) {
  if (typeof value === 'string' && /^data\/sources\/[a-z0-9._-]+\.pdf(?:#page=\d+)?$/i.test(value)) return value;
  return safeUrl(value);
}

function hasMapLocation(point) {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
    point.lat >= navigationBounds[0][0] && point.lat <= navigationBounds[1][0] &&
    point.lng >= navigationBounds[0][1] && point.lng <= navigationBounds[1][1] &&
    (point.status === 'demo' || (point.coordinatesVerified === true && Boolean(safeUrl(point.coordinateSourceUrl))) ||
      (point.status === 'source_listed_not_currently_verified' && Boolean(safeUrl(point.sourceUrl))));
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10);
}

// Decimal places are not evidence of accuracy. The editor must review an actual
// published destination pin and record its source before enabling directions.
function hasVerifiedDirections(point) {
  return point.status === 'verified' && !point.historical && !/^demo\b/i.test(point.name) &&
    Boolean(safeUrl(point.sourceUrl)) && validDate(point.verifiedAt) &&
    point.verificationMethod === 'published-sources' && point.coordinatesVerified === true &&
    Boolean(safeUrl(point.coordinateSourceUrl)) &&
    Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
    point.lat >= navigationBounds[0][0] && point.lat <= navigationBounds[1][0] &&
    point.lng >= navigationBounds[0][1] && point.lng <= navigationBounds[1][1];
}

function prepareRecords(records) {
  if (!Array.isArray(records)) throw new Error('Expected an array of locations.');
  const seen = new Set();
  invalidRecords = 0;
  return records.flatMap((record) => {
    if (!record || typeof record.id !== 'string' || !record.id.trim() ||
        typeof record.name !== 'string' || !record.name.trim() || seen.has(record.id.trim())) {
      invalidRecords += 1;
      return [];
    }
    const id = record.id.trim();
    seen.add(id);
    const isDemo = record.status === 'demo' || /^demo\b/i.test(record.name.trim());
    return [{
      id,
      name: isDemo && !/^demo\b/i.test(record.name.trim()) ? `DEMO — ${record.name.trim()}` : record.name.trim(),
      lat: hasMapLocation(record) ? record.lat : null,
      lng: hasMapLocation(record) ? record.lng : null,
      status: isDemo ? 'demo' : record.status,
      materials: Array.isArray(record.materials)
        ? record.materials.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
        : [],
      reportedMaterials: reportedMaterialKeys(record),
      address: typeof record.address === 'string' ? record.address.trim() : '',
      district: typeof record.district === 'string' ? record.district.trim() : '',
      region: typeof record.region === 'string' ? record.region : '',
      historical: record.historical === true,
      historicalPhone: typeof record.historicalPhone === 'string' ? record.historicalPhone : '',
      sourceYear: record.sourceYear,
      sourcePages: Array.isArray(record.sourcePages) ? record.sourcePages : [],
      sourceCategories: Array.isArray(record.sourceCategories) ? record.sourceCategories.filter((value) => typeof value === 'string') : [],
      sourceStatus: typeof record.sourceStatus === 'string' ? record.sourceStatus : '',
      hours: typeof record.hours === 'string' ? record.hours.trim() : '',
      phone: typeof record.phone === 'string' ? record.phone.trim() : '',
      sourceUrl: record.sourceUrl,
      materialsSourceUrl: record.materialsSourceUrl,
      hoursSourceUrl: record.hoursSourceUrl,
      coordinateSourceUrl: record.coordinateSourceUrl,
      coordinatesVerified: record.coordinatesVerified === true,
      verificationMethod: record.verificationMethod,
      notes: typeof record.notes === 'string' ? record.notes.trim() : '',
      sourceReportedMaterials: typeof record.sourceReportedMaterials === 'string' ? record.sourceReportedMaterials :
        Array.isArray(record.sourceReportedMaterials) ? record.sourceReportedMaterials.join(', ') : '',
      sourceReportedFacilityTypes: Array.isArray(record.sourceReportedFacilityTypes) ? record.sourceReportedFacilityTypes : [],
      verifiedAt: record.verifiedAt
    }];
  });
}

function populateMaterials() {
  const labels = new Map([
    ['paper', 'Paper'], ['plastic', 'Plastic'], ['metal', 'Metal'], ['glass', 'Glass'],
    ['battery', 'Batteries'], ['e waste', 'E-waste'], ['fluorescent lights', 'Fluorescent lights'],
    ['cooking oil', 'Used cooking oil'], ['drink packets', 'Drink cartons'], ['clothes', 'Clothes'],
    ['poly foam', 'Polystyrene foam'], ['toys', 'Toys'], ['jewellery', 'Jewellery']
  ]);
  for (const point of points) {
    for (const material of [...point.materials, ...point.reportedMaterials]) {
      const key = materialKey(material);
      if (!labels.has(key)) labels.set(key, material);
    }
  }
  const select = $('material');
  select.replaceChildren(new Option('All materials', 'all'));
  for (const [key, label] of labels) select.add(new Option(label, key));
  const symbols = {
    all:'M4 6h16M4 12h16M4 18h16', paper:'M6 3h9l4 4v14H6zM15 3v5h4M9 12h7M9 16h7',
    plastic:'M10 3h4v4l3 4v10H7V11l3-4zM9 15h6', metal:'M7 5q5-3 10 0v14q-5 3-10 0zM7 5q5 3 10 0M7 18q5 3 10 0',
    glass:'M9 3h6v4l3 4v9H6v-9l3-4zM9 6h6', battery:'M8 5h8v16H8zM10 3h4M10 11h4M12 9v4',
    'e waste':'M5 4h14v12H5zM9 20h6M12 16v4', 'fluorescent lights':'M10 3h4v13h-4zM10 19h4M12 16v3',
    'cooking oil':'M9 4h6v3l2 3v11H7V10l2-3zM9 14h6', 'drink packets':'M7 4h10l1 16H6zM7 8h10M14 4l2-2',
    clothes:'M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c-1 3-7 3-8 0z',
    'poly foam':'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8',
    toys:'M8 8a4 4 0 0 1 8 0l3 3v7H5v-7zM9 14h6M12 11v6', jewellery:'M5 8l3-4h8l3 4-7 12zM5 8h14M8 4l4 16 4-16'
  };
  const options = $('material-options');
  options.replaceChildren();
  for (const option of select.options) {
    const button = element('button', 'material-option');
    button.type = 'button';
    button.dataset.value = option.value;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', symbols[option.value] || symbols.all);
    svg.append(path);
    button.append(svg, document.createTextNode(option.textContent));
    button.addEventListener('click', () => {
      select.value = option.value;
      $('material-menu').open = false;
      select.dispatchEvent(new Event('change'));
      $('material-menu').querySelector('summary').focus();
    });
    options.append(button);
  }
}

function syncMaterialMenu() {
  const select = $('material');
  $('material-label').textContent = select.value === 'all' ? 'Filter by material' : (select.selectedOptions[0]?.textContent || 'Filter by material');
  $('material-options').querySelectorAll('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.value === select.value));
  });
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showMapError(message) {
  $('map-error').textContent = message;
  $('map-error').hidden = false;
}

function details(point) {
  const fragment = document.createDocumentFragment();
  fragment.append(element('h2', '', point.name));
  const data = element('div', 'data');
  const row = (label, value, className = '') => {
    const content = element('span', `v ${className}`);
    if (typeof value === 'string') content.textContent = value;
    else content.append(value);
    data.append(element('span', 'k', label), content);
  };
  row('Address', point.address || 'Not listed');
  if (point.historical) {
    row('Source date', `${point.sourceYear || 'Unknown'} · pages ${point.sourcePages.join(', ')}`);
    row('PDF section', point.sourceCategories.join('; ') || 'Not listed');
    if (point.region && point.region !== 'Penang') row('Region', `${point.region} — outside Penang`);
    if (point.historicalPhone) row('Contact (2005)', `${point.historicalPhone} · not reconfirmed`);
    if (point.sourceStatus) row('Source remark', point.sourceStatus);
    row('Map', hasMapLocation(point) ? 'Building location only; recycling not reconfirmed' : 'No checked coordinates; not mapped');
  } else if (point.district) row('District', point.district);
  row(point.historical ? '2005 category' : 'Materials', point.materials.length
    ? `${point.materials.join(', ')}${point.status === 'demo' ? ' (demo only)' : ''}`
    : point.reportedMaterials.length ? `${point.reportedMaterials.join(', ')} · source-listed; confirm before visiting` : 'Unknown');
  if (point.sourceReportedFacilityTypes.length) row('Type', point.sourceReportedFacilityTypes.join(', '));
  if (point.sourceReportedMaterials) row('Source-listed items', `${point.sourceReportedMaterials} · confirm before visiting`);
  if (point.hours && point.status !== 'demo') row('Hours', point.hours);
  if (point.phone && point.status !== 'demo') row('Contact', point.phone);
  const verified = hasVerifiedDirections(point);
  row('Status', point.status === 'demo' ? 'Fictional DEMO · not verified'
    : point.historical ? 'Historical listing · current service unverified'
    : verified ? 'Sources checked online' : 'Source listed · current service unverified', verified ? '' : 'unverified');
  if (point.status !== 'demo') {
    const source = sourceLink(point.sourceUrl);
    if (source) {
      const link = element('a', 'detail-link', 'View source');
      link.href = source;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row('Source', link);
    }
    if (!point.historical && validDate(point.verifiedAt)) row('Last checked', point.verifiedAt);
    const acceptanceSource = safeUrl(point.materialsSourceUrl);
    if (acceptanceSource) {
      const link = element('a', 'detail-link', 'Acceptance details');
      link.href = acceptanceSource;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row('Materials source', link);
    }
    if (safeUrl(point.coordinateSourceUrl) && hasMapLocation(point)) {
      const link = element('a', 'detail-link', point.historical ? 'Building location source' : 'Coordinate source');
      link.href = safeUrl(point.coordinateSourceUrl);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      row('Map source', link);
    }
  }
  if (point.notes) row('Before visiting', point.notes);
  if (verified) {
    const link = element('a', 'detail-link', 'Get directions');
    link.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    row('Directions', link);
  } else {
    row('Directions', point.status === 'demo' ? 'Unavailable for demo records' : 'Unavailable until verified', 'directions-disabled');
  }
  fragment.append(data);
  return fragment;
}

function closeSheet(restoreFocus = false) {
  $('mobile-sheet').hidden = true;
  $('mobile-sheet').classList.remove('open');
  $('results').hidden = false;
  if (restoreFocus && sheetTrigger?.isConnected) sheetTrigger.focus();
}

function selectPoint(id, trigger, openSheet = true) {
  const point = visiblePoints.find((item) => item.id === id);
  if (!point) return;
  selectedId = id;
  document.querySelectorAll('.result').forEach((button) => {
    const selected = button.dataset.id === id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  markers.forEach((marker, markerId) => {
    marker.getElement()?.classList.toggle('selected', markerId === id);
  });
  if (trigger && markers.get(id)?.getElement() === trigger) {
    const selectedRow = Array.from(document.querySelectorAll('.result')).find((button) => button.dataset.id === id);
    selectedRow?.scrollIntoView({ block: 'nearest' });
  }
  if (openSheet) {
    map?.closePopup();
    if (map && hasMapLocation(point)) {
      viewChanged = true;
      map.setView([point.lat, point.lng], Math.max(map.getZoom(), 15), { animate: false });
    }
    sheetTrigger = trigger;
    $('mobile-detail').replaceChildren(details(point));
    $('mobile-sheet').hidden = false;
    $('mobile-sheet').classList.add('open');
    $('results').hidden = true;
    $('mobile-sheet').querySelector('.dismiss').focus();
    $('mobile-sheet').scrollTop = 0;
  }
}

function renderPoints() {
  syncMaterialMenu();
  const query = normalize($('search').value);
  const queryMaterial = aliases.get(query) || query;
  const selectedMaterial = $('material').value;
  visiblePoints = points.filter((point) => {
    const materials = [...point.materials.map(materialKey), ...point.reportedMaterials];
    const matchesMaterial = selectedMaterial === 'all' || materials.includes(selectedMaterial);
    const matchesQuery = !query || normalize(point.name).includes(query) || normalize(point.address).includes(query) ||
      point.sourceCategories.some((category) => normalize(category).includes(query)) ||
      materials.some((material) => material.includes(queryMaterial));
    return matchesMaterial && matchesQuery;
  });
  const onlyDemo = points.length > 0 && points.every((point) => point.status === 'demo');
  const historical = points.some((point) => point.historical);
  const mappedCount = visiblePoints.filter(hasMapLocation).length;
  $('resultcount').textContent = `${visiblePoints.length} ${onlyDemo ? 'demo ' : ''}${historical ? 'place' : 'point'}${visiblePoints.length === 1 ? '' : 's'}` +
    ` · ${mappedCount} mapped` +
    (invalidRecords ? ` · ${invalidRecords} invalid record${invalidRecords === 1 ? '' : 's'} omitted` : '');
  document.querySelector('.reset').disabled = !query && selectedMaterial === 'all';
  $('results').replaceChildren();
  if (!visiblePoints.length) {
    selectedId = null;
    map?.closePopup();
    markers.forEach((marker) => { if (map.hasLayer(marker)) map.removeLayer(marker); });
    $('results').append(element('p', 'noresult', points.length
      ? 'No matching points. Try another search or reset the filters.'
      : 'No usable locations in the directory.'));
    return;
  }
  if (!visiblePoints.some((point) => point.id === selectedId)) selectedId = visiblePoints[0].id;
  const visibleIds = new Set(visiblePoints.map((point) => point.id));
  markers.forEach((marker, id) => {
    if (visibleIds.has(id)) {
      if (!map.hasLayer(marker)) marker.addTo(map);
    } else if (map.hasLayer(marker)) map.removeLayer(marker);
  });
  for (const point of visiblePoints) {
    const button = element('button', point.historical ? 'result historical' : 'result');
    button.type = 'button';
    button.dataset.id = point.id;
    const label = element('span');
    label.append(element('span', 'resultname', point.name), element('span', 'sub',
      point.status === 'demo' ? 'Fictional sample · not a recycling centre'
        : point.historical ? `2005 listing · ${hasMapLocation(point) ? 'building pin only' : 'not mapped'}${point.region !== 'Penang' ? ' · outside Penang' : ''}`
          : (hasMapLocation(point) ? 'Source-listed · unverified' : 'No coordinates · not mapped')));
    const arrow = element('span', 'arrow', '›');
    arrow.setAttribute('aria-hidden', 'true');
    button.append(element('span', 'mark'), label, arrow);
    button.addEventListener('click', () => {
      locationRequest += 1;
      nearestStatus();
      selectPoint(point.id, button);
    });
    $('results').append(button);
  }
  selectPoint(selectedId, null, false);
}

function resizeMap() {
  if (!map || currentTab !== 'map') return;
  map.invalidateSize({ pan: false });
  document.querySelector('.shell').style.setProperty('--map-panel-height', `${$('map').clientHeight}px`);
  map.setMinZoom(map.getBoundsZoom(penangBounds, false, [48, 48]));
  // Keep both halves of Penang visible on resize until the visitor navigates.
  if (!viewChanged) map.fitBounds(penangBounds, { padding: [24, 24], animate: false });
}

function openTab(tab) {
  closeSheet();
  locationRequest += 1;
  currentTab = tab;
  document.querySelectorAll('[data-tab]').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  const isMap = tab === 'map';
  document.querySelector('.sidebar').hidden = !isMap;
  document.querySelector('.workspace').classList.toggle('support-view', !isMap);
  $('map').hidden = !isMap;
  $('mapmode').hidden = !isMap;
  $('map-error').hidden = !isMap || !$('map-error').textContent;
  $('placeholder').hidden = isMap;
  if (!isMap) renderSection(tab);
  if (isMap) requestAnimationFrame(resizeMap);
}

// Set this only when a real submission form has been configured.
const suggestionFormUrl = null;

function renderSection(tab) {
  const content = document.querySelector('.placeholder-inner');
  content.classList.remove('game-page');
  content.replaceChildren();
  const paragraph = (text) => content.append(element('p', '', text));
  if (tab === 'guide') {
    content.classList.add('game-page');
    const game = element('section');
    content.append(game);
    window.RePenangGame.mount(game, (material) => {
      $('search').value = '';
      $('material').value = material;
      openTab('map');
      renderPoints();
    });
  } else {
    content.append(element('h2', '', 'Suggest a place'));
    paragraph('Suggest a collection point or report a correction. This form saves a draft on this device only.');
    const form = element('form', 'suggestion-form');
    const name = element('input');
    name.id = 'suggest-name';
    name.maxLength = 200;
    const message = element('textarea');
    message.id = 'suggest-message';
    message.maxLength = 3000;
    message.required = true;
    for (const [text, input] of [['Place name (optional)', name], ['Suggestion or correction', message]]) {
      const label = element('label', '', text);
      label.htmlFor = input.id;
      form.append(label, input);
    }
    const status = element('p', 'draft-status');
    status.setAttribute('role', 'status');
    try {
      const draft = JSON.parse(localStorage.getItem('repenang-suggestion') || 'null');
      if (draft && typeof draft.name === 'string' && typeof draft.message === 'string') {
        name.value = draft.name.slice(0, 200);
        message.value = draft.message.slice(0, 3000);
        status.textContent = 'Draft restored from this device — not submitted.';
      }
    } catch { status.textContent = 'Local storage is unavailable or the saved draft could not be read.'; }
    const save = element('button', '', 'Save draft on this device');
    save.type = 'submit';
    form.append(save, status);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!message.value.trim()) { status.textContent = 'Enter a suggestion first.'; return; }
      try {
        localStorage.setItem('repenang-suggestion', JSON.stringify({name: name.value.trim(), message: message.value.trim()}));
        status.textContent = 'Saved on this device only — not submitted.';
      } catch { status.textContent = 'Could not save on this device. Copy your text before leaving this page.'; }
    });
    content.append(form);
    const endpoint = safeUrl(suggestionFormUrl);
    if (endpoint) {
      const link = element('a', 'detail-link', 'Open submission form');
      link.href = endpoint;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      content.append(link);
    } else paragraph('Online submission is not configured.');
  }
}

async function initialize() {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.material-menu')) $('material-menu').open = false;
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('material-menu').open) {
      $('material-menu').open = false;
      $('material-menu').querySelector('summary').focus();
    }
  });
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => openTab(button.dataset.tab));
  });
  document.querySelector('.brand').addEventListener('click', (event) => {
    event.preventDefault();
    openTab('map');
  });
  const updateFilters = () => {
    locationRequest += 1;
    nearestStatus();
    closeSheet();
    renderPoints();
  };
  $('search').addEventListener('input', updateFilters);
  $('material').addEventListener('change', () => {
    updateFilters();
    locateNearest();
  });
  document.querySelector('.reset').addEventListener('click', () => {
    $('search').value = '';
    $('material').value = 'all';
    updateFilters();
    $('search').focus();
  });
  $('mobile-sheet').querySelector('.dismiss').addEventListener('click', () => closeSheet(true));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('mobile-sheet').hidden) closeSheet(true);
  });
  mobile.addEventListener('change', () => closeSheet());

  if (window.L) {
    map = L.map('map', {
      zoomControl: false,
      maxBounds: navigationBounds,
      maxBoundsViscosity: 1
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    const RecenterControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const container = L.DomUtil.create('div', 'leaflet-bar recenter-control');
        const button = L.DomUtil.create('button', '', container);
        button.type = 'button';
        button.textContent = '⌖';
        button.title = 'Recenter on Penang';
        button.setAttribute('aria-label', 'Recenter on Penang');
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(button, 'click', () => {
          viewChanged = false;
          resizeMap();
        });
        return container;
      }
    });
    new RecenterControl().addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).on('tileerror', () => showMapError('Map tiles could not load. Check your internet connection.')).addTo(map);
    resizeMap();
    map.on('dragstart zoomstart', (event) => {
      // Programmatic fitBounds during resizing is synchronous and not animated.
      if (event.type === 'dragstart' || event.originalEvent) viewChanged = true;
    });
    // Zoom controls / keyboard / wheel zoom also count as visitor navigation.
    $('map').addEventListener('wheel', () => { viewChanged = true; }, { passive: true });
    $('map').addEventListener('touchstart', (event) => {
      if (event.touches.length > 1) viewChanged = true;
    }, { passive: true });
    $('map').addEventListener('keydown', () => { viewChanged = true; });
    $('map').querySelector('.leaflet-control-zoom').addEventListener('click', () => { viewChanged = true; });
    new ResizeObserver(() => requestAnimationFrame(resizeMap)).observe($('map'));
  } else {
    showMapError('The map library could not load. Check your internet connection and reload.');
  }

  try {
    const response = await fetch('data/penang-recycling-research.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const research = await response.json();
    points = prepareRecords(research.locations.filter((record) =>
      ['source_listed_not_currently_verified', 'not_independently_confirmed'].includes(record.status)));
    populateMaterials();
    const hasDemo = points.some((point) => point.status === 'demo');
    const hasHistorical = points.some((point) => point.historical);
    $('mapmode').textContent = hasDemo ? 'Sample locations — not verified'
      : hasHistorical ? '2005 directory · recycling not reconfirmed' : 'Source-listed locations · not verified';
    if (map) {
      for (const point of points) {
        if (!hasMapLocation(point)) continue;
        const description = point.status === 'demo' ? `${point.name} — fictional sample`
          : point.historical ? `${point.name} — historical listing; building location only` : `${point.name} — source-listed, not verified`;
        const marker = L.marker([point.lat, point.lng], {
          title: description,
          alt: description,
          icon: L.divIcon({ className: 'demo-marker', html: '<span></span>', iconSize: [28, 34], iconAnchor: [14, 30] })
        });
        marker.bindTooltip(element('span', '', point.status === 'demo' ? `${point.name} · not verified`
          : point.historical ? `${point.name} · recycling not reconfirmed` : `${point.name} · unverified`));
        marker.on('click', () => {
          locationRequest += 1;
          nearestStatus();
          selectPoint(point.id, marker.getElement());
        });
        markers.set(point.id, marker);
      }
    }
    $('search').disabled = false;
    $('material').disabled = false;
    dataState = 'ready';
    renderPoints();
  } catch (error) {
    dataState = 'error';
    $('resultcount').textContent = 'Directory unavailable';
    $('results').replaceChildren(element('p', 'noresult', 'Could not load locations. Serve this folder over HTTP, check data/penang-recycling-research.json and reload.'));
    console.error('RePenang directory:', error);
  }
}

initialize();
