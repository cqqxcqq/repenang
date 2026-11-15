'use strict';

// These parsers read the named publishers' public directory markup, not map APIs.
const clean = (value = '') => value.replace(/<br\s*\/?>/gi, ', ').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#0*39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

function mampan(html) {
  const records = [...html.matchAll(/Array\s*\(\s*\[0\][\s\S]*?\n\)/g)].map((m) => {
    const row = {};
    for (const f of m[0].matchAll(/\[([a-z_]+)\]\s*=>\s*([\s\S]*?)(?=\s*\[[a-z_0-9]+\]\s*=>|\n\))/g)) row[f[1]] = clean(f[2]);
    const block = html.match(new RegExp('onclick="zoom_loc\\([^)]*,' + row.company_id + '\\);">([\\s\\S]*?)(?=<div  class="list-group-item|$)'))?.[1] || '';
    row.listMaterials = [...block.matchAll(/<span style="font-weight:600">([^<]*)<\/span><br><span style="padding: 0px 10px;">\s*- ([\s\S]*?)<\/span>/g)].map((part) => ({ category: clean(part[1]), detail: clean(part[2]) }));
    return row;
  });
  if (!records.length) throw new Error('MAMPAN markup changed; manual review required.');
  return records;
}

function riiicycle(html) {
  const records = html.split(/<h2[^>]*>/).slice(1).map((card) => {
    const name = clean(card.slice(0, card.indexOf('</h2>')));
    const weekly = [...card.matchAll(/<strong>(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[\s\S]*?<\/strong>\s*<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => ({ day: m[1], session: clean(m[2]).replace(/^:\s*/, '').replace(/\(Today\)/g, '').trim() }));
    return {
      name,
      address: clean(card.match(/<span class="line-clamp-2">([\s\S]*?)<\/span>/)?.[1]),
      phone: clean(card.match(/fa-phone[^>]*><\/i>([\s\S]*?)<\/p>/)?.[1]),
      maps: [...card.matchAll(/href="([^"]*(?:maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com)[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&')),
      closed: /Closed until further notice|Closed and relocated/.test(card),
      weekly
    };
  });
  if (!records.length || !records.some((r) => r.weekly.length === 7)) throw new Error('Riiicycle markup changed; manual review required.');
  return records;
}

function mampanObservation(row) {
  return { name: row.company_name, address: row.address, coordinates: row.lat_long, phone: row.tel_no, hours: row.working_hour, materials: row.listMaterials, remarks: row.additional_information, status: row.company_status };
}

function guidanceText(html, id) {
  const body = clean(html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''));
  const start = id === 'ecochamps' ? 'What Can You Recycle?' : 'Category A: Uncommon Recyclable Materials';
  const end = id === 'ecochamps' ? 'Terms & Conditions' : 'Category E: General Waste';
  const from = body.indexOf(start), to = body.indexOf(end, from);
  if (from < 0 || to < from) throw new Error(`${id} guidance section changed; manual review required.`);
  return body.slice(from, to).replace(/\s+/g, ' ').trim();
}

module.exports = { clean, mampan, riiicycle, mampanObservation, guidanceText };
