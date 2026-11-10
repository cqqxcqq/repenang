'use strict';

// The rule model is shared with the local tests; no DOM or network required.
function createSortingRound(items) {
  const prepared = new Set();
  const sorted = new Set();
  const retried = new Set();
  return {
    items, prepared, sorted, retried,
    prepare(id) {
      const item = items.find((value) => value.id === id);
      if (!item?.preparation || sorted.has(id)) return false;
      prepared.add(id);
      return true;
    },
    place(id, destination) {
      const item = items.find((value) => value.id === id);
      if (!item || sorted.has(id)) return { result: 'ignore' };
      if (destination !== item.destination) {
        retried.add(id);
        return { result: 'retry', message: item.hint };
      }
      if (item.preparation && !prepared.has(id)) {
        retried.add(id);
        return { result: 'prepare', message: item.hint };
      }
      sorted.add(id);
      return { result: 'sorted', message: item.explanation };
    }
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { createSortingRound };

if (typeof window !== 'undefined') {
  window.RePenangGame = (() => {
    let dataset;
    let loading;
    let round;
    let bag = 0;
    let selected = null;
    let message = '';
    let feedbackKind = '';
    let navigate;
    const icons = {
      paper: '<path d="M23 27h48v64H23z" fill="#f9f7ef"/><path d="M23 27h48v64H23zM30 37h34M30 44h34M30 51h14v17H30zM50 52h14M50 59h14M50 66h14M30 76h34M30 82h25"/>',
      bottle: '<path d="M43 15h15v17l12 16v51H31V48l12-16z" fill="#dce8e2"/><path class="bottle-water" d="M32 76h37v22H32z" fill="#adc9c7" stroke="none"/><path d="M43 15h15v17l12 16v51H31V48l12-16zM42 21h17M37 55h27v19H37zM43 32h15"/>',
      can: '<path d="M31 29q19-10 38 0v59q-19 10-38 0z" fill="#dee4de"/><ellipse cx="50" cy="29" rx="19" ry="6"/><path d="M31 29v59q19 10 38 0V29M38 43h24M38 71h24M45 29h10l-3 4h-7z"/>',
      tissue: '<path d="M19 46l17-19 15 9 21-9 8 24-7 30-27 8-27-15 8-15z" fill="#f1eee4"/><path d="M19 46l17-19 15 9 21-9 8 24-7 30-27 8-27-15 8-15zM36 27l3 24-12 8M51 36l5 22 17 23M39 51l17 7-10 31"/>',
      battery: '<path d="M41 23v-6h18v6M33 23h34v70H33z" fill="#d5ded5"/><path d="M33 43h34M45 32h10M50 27v10M45 81h10"/>',
      jar: '<path d="M34 25h32v11l9 10v44q-25 9-50 0V46l9-10z" fill="#dce8e2"/><path d="M34 25h32v11l9 10v44q-25 9-50 0V46l9-10zM34 31h32M34 36h32M31 55h38v23H31z"/>',
      phone: '<rect x="31" y="17" width="39" height="80" rx="5" fill="#d5ded5"/><path d="M31 28h39M31 83h39M46 90h9"/><path d="M38 37h25v37H38z" fill="#eff2eb"/>'
    };
    const destinations = [
      ['recycling', 'Recycling', 'Clean paper, plastic & metal'],
      ['special', 'Special collection', 'Set aside for a suitable collector'],
      ['residual', 'Residual waste', 'Dirty, non-recyclable waste']
    ];
    function node(tag, className, text) {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    }
    function picture(name) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      el.setAttribute('viewBox', '0 0 100 115');
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = icons[name]; // Fixed, authored shapes only; never source data.
      return el;
    }
    function start() {
      const ids = dataset.bags[bag].items;
      const items = ids.map((id) => dataset.items.find((item) => item.id === id));
      // A new arrangement keeps repeated bags from becoming position memorisation.
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      round = createSortingRound(items);
      selected = null;
      message = '';
      feedbackKind = '';
    }
    function draw(focusId) {
      const host = document.querySelector('.sorting-game');
      if (!host) return;
      host.replaceChildren();
      const head = node('div', 'game-heading');
      const intro = node('div');
      intro.append(node('h2', '', 'Sort this bag.'));
      head.append(intro);
      host.append(head);
      const complete = round.sorted.size === round.items.length;
      const table = node('div', 'sorting-table');
      table.setAttribute('aria-label', 'Things to sort');
      for (const [index, item] of round.items.entries()) {
        const done = round.sorted.has(item.id);
        const button = node('button', `game-item${selected === item.id ? ' picked' : ''}${done ? ' sorted' : ''}${round.prepared.has(item.id) ? ' prepared' : ''}${item.id === 'dirty-paper' ? ' soiled' : ''}`);
        button.type = 'button';
        button.dataset.item = item.id;
        button.style.setProperty('--item-angle', `${[-7, 5, -4, 6, -6, 4][index]}deg`);
        button.disabled = done;
        button.draggable = !done;
        button.setAttribute('aria-pressed', String(selected === item.id));
        button.setAttribute('aria-label', `${item.name}${done ? ', sorted' : ''}`);
        button.append(picture(item.icon), node('span', 'item-name', item.name), node('span', 'item-state', done ? 'Sorted' : round.prepared.has(item.id) ? 'Emptied' : ''));
        button.addEventListener('click', () => { selected = item.id; message = ''; feedbackKind = ''; draw(item.id); });
        button.addEventListener('dragstart', (event) => {
          selected = item.id;
          event.dataTransfer.setData('text/plain', item.id);
          event.dataTransfer.effectAllowed = 'move';
          button.classList.add('picked');
        });
        button.addEventListener('dragend', () => draw(item.id));
        table.append(button);
      }
      host.append(table);
      const inspector = node('div', 'item-inspector');
      const active = round.items.find((item) => item.id === selected);
      if (active && !complete) {
        const copy = node('div');
        copy.append(node('h3', '', active.name), node('p', '', round.prepared.has(active.id) ? active.readyCondition : active.condition));
        inspector.append(copy);
        if (active.preparation && !round.prepared.has(active.id)) {
          const prep = node('button', 'game-action', active.preparation);
          prep.type = 'button';
          prep.addEventListener('click', () => {
            round.prepare(active.id);
            message = active.preparationExplanation;
            feedbackKind = 'ready';
            draw('destination-recycling');
          });
          inspector.append(prep);
        }
      } else {
        inspector.append(node('p', '', complete ? 'Everything has a place. You cleared the table.' : 'Pick something up to look closer. Then choose where it goes.'));
      }
      host.append(inspector);
      const bins = node('div', 'sorting-destinations');
      for (const [id, label, description] of destinations) {
        const target = node('button', `sorting-bin bin-${id}`);
        target.type = 'button';
        target.id = `destination-${id}`;
        target.disabled = complete;
        const count = round.items.filter((item) => round.sorted.has(item.id) && item.destination === id).length;
        target.append(node('span', 'bin-slot'), node('strong', '', label), node('span', 'bin-description', description), node('span', 'bin-count', count ? `${count} placed` : ''));
        target.addEventListener('click', () => place(selected, id));
        target.addEventListener('dragover', (event) => { event.preventDefault(); target.classList.add('drop-over'); });
        target.addEventListener('dragleave', () => target.classList.remove('drop-over'));
        target.addEventListener('drop', (event) => { event.preventDefault(); place(event.dataTransfer.getData('text/plain'), id); });
        bins.append(target);
      }
      host.append(bins);
      const feedback = node('p', `game-feedback ${feedbackKind}`, message || 'Click to choose, or drag an item to its destination.');
      feedback.setAttribute('role', 'status');
      host.append(feedback);
      if (complete) {
        const ending = node('div', 'game-ending');
        ending.append(node('h3', '', 'One bag, sorted.'), node('p', '', round.retried.size ? `${round.retried.size} ${round.retried.size === 1 ? 'item needed' : 'items needed'} another look. That’s how you learn.` : 'You found the right place for every item on your first try.'));
        const again = node('button', 'game-action', bag === 0 ? 'Try a trickier bag' : 'Sort another bag');
        again.type = 'button';
        again.addEventListener('click', () => { bag = (bag + 1) % dataset.bags.length; start(); draw(round.items[0].id); });
        ending.append(again);
        const hasPhone = round.items.some((item) => item.id === 'phone');
        const explore = node('button', 'game-text-action', hasPhone ? 'Find e-waste collection points' : 'Find battery collection points');
        explore.type = 'button';
        explore.addEventListener('click', () => navigate(hasPhone ? 'e waste' : 'battery'));
        ending.append(explore);
        host.append(ending);
      }
      const footer = node('div', 'game-footer');
      const restart = node('button', 'game-text-action', 'Start this bag again');
      restart.type = 'button';
      restart.addEventListener('click', () => { start(); draw(round.items[0].id); });
      const source = node('a', '', 'Why these choices?');
      source.href = dataset.sourceUrl;
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      footer.append(restart, source);
      host.append(footer);
      if (focusId) host.querySelector(`[data-item="${focusId}"], #${focusId}`)?.focus({ preventScroll: true });
    }
    function place(id, destination) {
      if (!id) { message = 'Pick an item first, then choose its destination.'; feedbackKind = ''; draw(`destination-${destination}`); return; }
      const result = round.place(id, destination);
      if (result.result === 'ignore') return;
      message = result.message;
      feedbackKind = result.result;
      selected = result.result === 'sorted' ? null : id;
      draw(result.result === 'sorted' ? round.items.find((item) => !round.sorted.has(item.id))?.id : `destination-${destination}`);
    }
    return {
      async mount(host, onNavigate) {
        navigate = onNavigate;
        host.classList.add('sorting-game');
        host.textContent = 'Opening the bag…';
        try {
          loading ||= fetch('data/sorting-game.json').then((response) => { if (!response.ok) throw new Error('game data'); return response.json(); });
          dataset = await loading;
          if (!host.isConnected) return;
          if (!round) start();
          draw();
        } catch {
          loading = null;
          if (!host.isConnected) return;
          host.replaceChildren(node('p', '', 'Could not load the bag. Check your connection and try again.'));
          const retry = node('button', 'game-action', 'Try again');
          retry.type = 'button';
          retry.addEventListener('click', () => this.mount(host, onNavigate));
          host.append(retry);
        }
      }
    };
  })();
}
