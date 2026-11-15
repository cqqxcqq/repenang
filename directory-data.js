'use strict';

// Shared by the browser and the maintenance checks. No network requests here.
(function (root) {
  const materialLabels = {
    paper: 'Paper', plastic: 'Plastic', metal: 'Metal', glass: 'Glass',
    battery: 'Batteries', 'e waste': 'E-waste', 'fluorescent lights': 'Fluorescent lights',
    'cooking oil': 'Used cooking oil', 'drink packets': 'Drink cartons', clothes: 'Clothes',
    'poly foam': 'Polystyrene foam', toys: 'Toys', jewellery: 'Jewellery'
  };
  const text = (value) => typeof value === 'string' && Boolean(value.trim());
  const url = (value) => {
    try { return typeof value === 'string' && new URL(value).protocol === 'https:'; }
    catch { return false; }
  };
  const date = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  const today = () => new Date().toISOString().slice(0, 10);

  function locationIssues(record, sources, onDate = today()) {
    if (!record || typeof record !== 'object') return ['Invalid record'];
    const issues = [];
    for (const key of ['id', 'name', 'address']) if (!text(record[key])) issues.push(`Missing ${key}`);
    if (/^demo\b/i.test(record.name || '') || record.historical || record.status !== 'source_reviewed') issues.push('Not a reviewed current listing');
    if (!Number.isFinite(record.lat) || !Number.isFinite(record.lng) || record.lat < 5.1 || record.lat > 5.6 || record.lng < 100.13 || record.lng > 100.6) issues.push('Coordinates outside directory area');
    if (!date(record.reviewedAt) || record.reviewedAt > onDate) issues.push('Invalid review date');
    if (!date(record.reviewDueAt) || record.reviewDueAt <= record.reviewedAt || record.reviewDueAt < onDate) issues.push('Review due');
    if (!Array.isArray(record.acceptance) || !record.acceptance.length) issues.push('Missing acceptance rules');
    const seen = new Set();
    for (const rule of record.acceptance || []) {
      if (!materialLabels[rule.material] || seen.has(rule.material)) issues.push('Invalid or repeated material');
      seen.add(rule.material);
      if (!text(rule.sourceText) || !text(rule.condition) || !Array.isArray(rule.forms) || !sources[rule.sourceId]) issues.push('Incomplete material evidence');
    }
    if (!text(record.hours?.display) || !['weekly', 'publisher_text'].includes(record.hours?.kind) || record.hours?.timezone !== 'Asia/Kuala_Lumpur') issues.push('Missing collection schedule');
    if (record.hours?.kind === 'weekly') {
      if (!Array.isArray(record.hours.weekly) || !record.hours.weekly.length) issues.push('Missing weekly sessions');
      for (const slot of record.hours.weekly || []) {
        if (!Number.isInteger(slot.day) || slot.day < 0 || slot.day > 6 || !/^\d\d:\d\d$/.test(slot.opens) || !/^\d\d:\d\d$/.test(slot.closes) || slot.opens >= slot.closes || slot.closes > '24:00' || slot.opens >= '24:00' || Number(slot.opens.slice(3)) > 59 || Number(slot.closes.slice(3)) > 59) issues.push('Invalid weekly session');
      }
    }
    if (!Array.isArray(record.contacts) || !record.contacts.some((c) => text(c.label) && /^\+60\d{8,10}$/.test(c.value) && sources[c.sourceId])) issues.push('Missing sourced contact');
    if (!text(record.access?.instructions) || !['scheduled_drop_off', 'confirm_first_visit'].includes(record.access?.mode)) issues.push('Missing access instructions');
    for (const field of ['identity', 'coordinates', 'materials', 'hours', 'contact', 'access']) {
      const evidence = record.evidence?.[field];
      const source = sources[evidence?.sourceId];
      if (!source || !url(source.url) || !text(evidence.locator) || !date(source.checkedAt) || source.checkedAt > onDate || !date(source.reviewDueAt) || source.reviewDueAt < onDate) issues.push(`Missing or expired ${field} source`);
    }
    for (const rule of record.exclusions || []) if (!text(rule.reason) || !sources[rule.sourceId] || (!rule.material && !rule.form)) issues.push('Incomplete exclusion');
    if (record.conflicts?.length) issues.push('Unresolved source conflict');
    return [...new Set(issues)];
  }

  function validateDirectory(directory, onDate = today()) {
    const issues = [];
    if (directory?.schemaVersion !== 1 || !Array.isArray(directory.locations) || !Array.isArray(directory.sources)) return ['Invalid directory format'];
    const sources = Object.fromEntries(directory.sources.map((s) => [s.id, s]));
    if (Object.keys(sources).length !== directory.sources.length) issues.push('Duplicate source ID');
    for (const source of directory.sources) if (!text(source.id) || !text(source.publisher) || !url(source.url) || !date(source.checkedAt) || source.checkedAt > onDate || !date(source.reviewDueAt) || source.reviewDueAt <= source.checkedAt || source.reviewDueAt < onDate) issues.push(`${source.id}: Invalid or expired source review`);
    const ids = new Set();
    for (const record of directory.locations) {
      if (ids.has(record.id)) issues.push(`${record.id}: Duplicate location ID`);
      ids.add(record.id);
      for (const issue of locationIssues(record, sources, onDate)) issues.push(`${record.id}: ${issue}`);
    }
    if (!directory.locations.length) issues.push('No publishable locations');
    return issues;
  }

  // Item matching deliberately distinguishes a material category from an exact item.
  // The bag UI consumes this without upgrading unknown categories to acceptance.
  function assessItem(location, item, condition = 'ready', onDate = today(), sources = null) {
    if (!sources || locationIssues(location, sources, onDate).length) return { status: 'review_required', reason: 'The place needs source review before item matching.' };
    if (!item || !item.id || !item.material) return { status: 'not_listed', reason: 'No supported item definition.' };
    if (item.route === 'residual' || condition === 'damaged' || condition === 'contaminated') return { status: 'unsuitable', reason: item.caution || 'This condition needs separate handling.' };
    const excluded = (location.exclusions || []).find((r) => r.form === item.id || (r.material === item.material && !r.form));
    if (excluded) return { status: 'not_accepted', reason: excluded.reason, sourceId: excluded.sourceId };
    const rule = (location.acceptance || []).find((r) => r.material === item.material);
    if (!rule) return { status: 'not_listed', reason: 'This item is not covered by the published acceptance information.' };
    if (condition === 'needs_preparation') return { status: 'prepare_first', reason: item.preparation, sourceId: item.sourceId };
    return { status: rule.forms.includes(item.id) ? 'source_listed' : 'confirm_item', reason: rule.condition, sourceId: rule.sourceId };
  }

  const api = { materialLabels, locationIssues, validateDirectory, assessItem, today };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PulangDirectory = api;
})(typeof window !== 'undefined' ? window : globalThis);
