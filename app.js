'use strict';
/* Entreno en Casa: lógica de la app. Todo se guarda en localStorage. */

const K = { hist: 'ent.history', cur: 'ent.current', meas: 'ent.measures', theme: 'ent.theme' };
const DAY = 864e5;

const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast('No se pudo guardar en el teléfono'); return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } }
};

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const num = n => nf.format(n);
const dateFmt = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDate = ts => dateFmt.format(new Date(ts)).replace(/\./g, '');
const fmtClock = sec => { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const fmtRest = s => `${num(s / 60)} min`;
const icon = id => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/* ---------- Datos ---------- */

const getHist = () => store.get(K.hist, []);
const getCur = () => store.get(K.cur, null);
const saveCur = c => store.set(K.cur, c);
const getMeas = () => store.get(K.meas, []);

function exById(id) {
  for (const s of Object.values(PLAN)) for (const e of s.exercises) if (e.id === id) return e;
  return null;
}
const variantOf = (cur, ex) => (ex.alt && cur && cur.variant && cur.variant[ex.id]) || 'main';
const exName = (ex, variant) => (variant === 'alt' && ex.alt ? ex.alt.name : ex.name);
const exTips = (ex, variant) => (variant === 'alt' && ex.alt ? ex.alt.tips : ex.tips);

function scheme(ex) {
  if (ex.type === 'max') return `${ex.sets} × máximo (deja 1 en reserva)`;
  if (ex.type === 'time') return `${ex.sets} × ${ex.min}-${ex.max} s`;
  return `${ex.sets} × ${ex.min}-${ex.max}${ex.side ? ' ' + ex.side : ''}`;
}

function setText(ex, s) {
  if (ex.type === 'time') return `${num(s.w || 0)} kg × ${s.t} s`;
  if (ex.bw) return `${s.r} reps`;
  return `${num(s.w || 0)} kg × ${s.r}`;
}

/* Última vez que hice este ejercicio (con la misma variante). */
function lastFor(exId, variant = 'main') {
  const h = getHist();
  for (let i = h.length - 1; i >= 0; i--) {
    const e = h[i].exercises.find(x => x.id === exId && x.sets.length && (x.variant || 'main') === variant);
    if (e) return { date: h[i].endedAt, ex: e };
  }
  return null;
}

/* Mensaje de progresión. */
function coach(ex, variant) {
  const last = lastFor(ex.id, variant);
  if (!last) {
    const msg = ex.type === 'max' ? 'Primera vez: haz el máximo dejando 1 en reserva en cada serie.'
      : ex.type === 'time' ? `Primera vez: elige un peso que aguantes ${ex.min} s con buena postura.`
      : ex.bw ? `Primera vez: busca llegar a ${ex.min}-${ex.max} con buena técnica.`
      : `Primera vez: elige un peso con el que llegues a ${ex.min}-${ex.max} dejando 1-2 en reserva.`;
    return { msg, last: null, up: false };
  }
  const s = last.ex.sets;
  if (ex.type === 'max') {
    const tot = s.reduce((a, b) => a + (b.r || 0), 0);
    return { msg: `La vez pasada: ${tot} repeticiones en total. Meta hoy: ${tot + 1}-${tot + 2}.`, last, up: false };
  }
  const key = ex.type === 'time' ? 't' : 'r';
  const full = s.length >= ex.sets && s.every(x => (x[key] || 0) >= ex.max);
  if (full) return { msg: ex.bw ? 'Hazlo más difícil: más lento o con lastre' : 'Sube el peso', last, up: true };
  return { msg: ex.type === 'time' ? 'Intenta 5 segundos más que la vez pasada' : 'Intenta 1 repetición más que la vez pasada', last, up: false };
}

/* Valores iniciales de una serie: lo que hice la vez anterior en esa misma serie. */
function defaults(ex, variant, setIdx) {
  const last = lastFor(ex.id, variant);
  const p = last ? last.ex.sets[Math.min(setIdx, last.ex.sets.length - 1)] : null;
  return {
    w: p && p.w != null ? p.w : (ex.bw ? 0 : 5),
    r: p && p.r != null ? p.r : (ex.type === 'max' ? 5 : ex.min),
    t: p && p.t != null ? p.t : ex.min
  };
}

function ensureDraft(cur, ex) {
  cur.draft = cur.draft || {};
  if (!cur.draft[ex.id]) cur.draft[ex.id] = defaults(ex, variantOf(cur, ex), (cur.log[ex.id] || []).length);
  return cur.draft[ex.id];
}

function nextSid() {
  const h = getHist();
  if (!h.length) return SESSION_ORDER[0];
  return SESSION_ORDER[(SESSION_ORDER.indexOf(h[h.length - 1].sid) + 1) % SESSION_ORDER.length];
}

/* Fuerza estancada: ejercicios sin mejora en las últimas 2 semanas. */
function score(e) {
  const maxW = Math.max(...e.sets.map(x => x.w || 0));
  return maxW * 1000 + e.sets.filter(x => (x.w || 0) === maxW).reduce((a, x) => a + (x.r || x.t || 0), 0);
}
function stagnant() {
  const h = getHist(), cutoff = Date.now() - 14 * DAY, out = [];
  for (const s of Object.values(PLAN)) for (const ex of s.exercises) {
    const entries = h.map(x => ({ d: x.endedAt, e: x.exercises.find(y => y.id === ex.id && y.sets.length) })).filter(x => x.e);
    let base = -1;
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i].d <= cutoff) { base = i; break; }
    if (base < 0) continue;
    const after = entries.slice(base + 1);
    if (after.length < 2) continue;
    const sc = score(entries[base].e);
    if (after.every(a => score(a.e) <= sc)) out.push(ex.name);
  }
  return out;
}

/* ---------- Sonido, vibración y pantalla encendida ---------- */

let actx = null;
function unlockAudio() {
  try {
    if (!actx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume();
  } catch { /* sin audio */ }
}
document.addEventListener('pointerdown', unlockAudio, { passive: true });

function beep() {
  if (!actx) return;
  try {
    const t0 = actx.currentTime + 0.02;
    [0, 0.28, 0.56].forEach((d, i) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, t0 + d);
      g.gain.exponentialRampToValueAtTime(0.6, t0 + d + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + (i === 2 ? 0.45 : 0.2));
      o.connect(g).connect(actx.destination);
      o.start(t0 + d);
      o.stop(t0 + d + 0.5);
    });
  } catch { /* sin audio */ }
}
function buzz() { try { if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]); } catch { /* iPhone no vibra */ } }

let wakeLock = null;
async function keepAwake() {
  if (!('wakeLock' in navigator)) return;
  try {
    if (wakeLock && !wakeLock.released) return;
    wakeLock = await navigator.wakeLock.request('screen');
  } catch { /* el navegador lo negó */ }
}
function releaseAwake() { try { if (wakeLock) wakeLock.release(); } catch { /* ya liberado */ } wakeLock = null; }

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (getCur()) keepAwake();
  if (getCur() && getCur().timer) tick();
});

/* ---------- Temporizador (calculado con la hora real) ---------- */

let timerInt = null;

function startTimer(mode, secs, info) {
  const cur = getCur();
  const now = Date.now();
  cur.timer = Object.assign({ mode, startedAt: now, endsAt: now + secs * 1000, total: secs * 1000 }, info);
  saveCur(cur);
  showTimer();
}

function showTimer() {
  const cur = getCur();
  if (!cur || !cur.timer) return hideTimer();
  const t = cur.timer, el = $('#timer');
  el.hidden = false;
  el.classList.remove('ending');
  el.classList.toggle('work', t.mode === 'work');
  $('#t-label').textContent = t.mode === 'work' ? `Trabajo · ${t.exName}` : 'Descanso';
  $('#t-skip').textContent = t.mode === 'work' ? 'Terminar ya' : 'Saltar';
  $('#t-next').innerHTML = t.next || '';
  clearInterval(timerInt);
  timerInt = setInterval(tick, 200);
  tick();
}

function hideTimer() {
  clearInterval(timerInt);
  timerInt = null;
  const el = $('#timer');
  el.hidden = true;
  el.classList.remove('ending', 'work');
}

function tick() {
  const cur = getCur();
  if (!cur || !cur.timer) return hideTimer();
  const t = cur.timer, left = t.endsAt - Date.now();
  $('#t-num').textContent = fmtClock(left / 1000);
  $('#t-bar').style.transform = `scaleX(${Math.max(0, Math.min(1, left / t.total))})`;
  if (left <= 0) timerEnd(true);
}

function timerEnd(natural) {
  const cur = getCur();
  const t = cur && cur.timer;
  if (!t) return hideTimer();
  cur.timer = null;
  saveCur(cur);
  clearInterval(timerInt);
  if (natural) { beep(); buzz(); }
  if (t.mode === 'work') {
    const secs = natural ? Math.round(t.total / 1000) : Math.max(1, Math.round((Date.now() - t.startedAt) / 1000));
    logSet(t.exId, { w: t.w, t: secs });
    return;
  }
  if (natural) {
    $('#t-num').textContent = '0:00';
    $('#timer').classList.add('ending');
    setTimeout(() => { hideTimer(); render(); }, 650);
  } else {
    hideTimer();
    render();
  }
}

function adjustTimer(deltaSec) {
  const cur = getCur();
  if (!cur || !cur.timer) return;
  const t = cur.timer;
  t.endsAt += deltaSec * 1000;
  const left = t.endsAt - Date.now();
  if (left > t.total) t.total = left;
  saveCur(cur);
  tick();
}

/* ---------- Sesión ---------- */

function startSession(sid) {
  const cur = getCur();
  if (cur && !confirm(`Tienes ${PLAN[cur.sid].name} a medias. ¿Descartarla y empezar ${PLAN[sid].name}?`)) return;
  saveCur({ sid, startedAt: Date.now(), i: -1, log: {}, variant: {}, draft: {}, timer: null });
  keepAwake();
  location.hash = '#sesion';
}

function logSet(exId, set) {
  const cur = getCur();
  const s = PLAN[cur.sid], ex = exById(exId);
  (cur.log[exId] = cur.log[exId] || []).push(set);
  const done = cur.log[exId].length;
  let next = '';

  if (done < ex.sets) {
    const d = defaults(ex, variantOf(cur, ex), done);
    const draft = ensureDraft(cur, ex);
    if (lastFor(ex.id, variantOf(cur, ex))) { draft.r = d.r; draft.t = d.t; }
    next = `Siguiente: serie ${done + 1} de ${ex.sets} · <b>${esc(setText(ex, draft))}</b>`;
  } else {
    cur.i = s.exercises.findIndex(e => e.id === exId) + 1;
    if (cur.i < s.exercises.length) {
      const nx = s.exercises[cur.i];
      next = `Siguiente ejercicio: <b>${esc(exName(nx, variantOf(cur, nx)))}</b> · ${esc(setText(nx, ensureDraft(cur, nx)))}`;
    }
  }
  saveCur(cur);

  // Feedback inmediato: llenar el círculo.
  const dot = document.querySelectorAll('.dots li')[done - 1];
  if (dot) { dot.classList.add('done', 'pop'); dot.innerHTML = icon('check'); }

  if (cur.i >= s.exercises.length) {
    hideTimer();
    setTimeout(render, 350);
    toast('¡Sesión completa!');
    return;
  }
  setTimeout(() => startTimer('rest', ex.rest, { next }), dot ? 350 : 0);
}

function finishSession() {
  const cur = getCur();
  if (!cur) return;
  const s = PLAN[cur.sid];
  const exercises = s.exercises
    .map(ex => ({ id: ex.id, name: exName(ex, variantOf(cur, ex)), variant: variantOf(cur, ex), type: ex.type, bw: !!ex.bw, sets: cur.log[ex.id] || [] }))
    .filter(e => e.sets.length);
  if (!exercises.length) {
    if (!confirm('No registraste ninguna serie. ¿Descartar la sesión?')) return;
  } else {
    const h = getHist();
    h.push({ id: Date.now(), sid: cur.sid, name: s.name, startedAt: cur.startedAt, endedAt: Date.now(), exercises });
    if (!store.set(K.hist, h)) return;
    toast(`${s.name} guardada`);
  }
  store.del(K.cur);
  hideTimer();
  releaseAwake();
  location.hash = '#inicio';
}

/* ---------- Vistas ---------- */

function viewHome() {
  const cur = getCur();
  const sid = nextSid();
  const s = PLAN[sid];
  const h = getHist();
  const lastOf = id => { for (let i = h.length - 1; i >= 0; i--) if (h[i].sid === id) return h[i].endedAt; return null; };

  const days = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
  const main = { 0: 'torsoA', 2: 'piernaA', 4: 'torsoB', 5: 'piernaB' };
  const today = (new Date().getDay() + 6) % 7;
  const week = days.map((d, i) => `<div class="day${main[i] ? ' on' : ''}${i === today ? ' today' : ''}"><b>${d}</b>${main[i] ? `<span>${PLAN[main[i]].name}</span>` : '<span class="muted">—</span>'}</div>`).join('');

  const meas = getMeas();
  const lastM = meas.length ? meas[meas.length - 1] : null;
  const measDue = !lastM || (Date.now() - new Date(lastM.date + 'T12:00').getTime()) >= 28 * DAY;
  const stuck = stagnant();
  const theme = store.get(K.theme, 'auto');

  return `
  ${cur ? `<section class="card alert">
    <h3>${icon('bell')} Sesión a medias</h3>
    <p>${esc(PLAN[cur.sid].name)}, empezada ${fmtDate(cur.startedAt)}. ${cur.i < 0 ? 'En calentamiento.' : `Ejercicio ${Math.min(cur.i + 1, PLAN[cur.sid].exercises.length)} de ${PLAN[cur.sid].exercises.length}.`}</p>
    <div class="row"><button class="btn btn-primary" data-act="resume">Continuar</button><button class="btn" data-act="discard">Descartar</button></div>
  </section>` : ''}

  <section class="card hero">
    <div class="eyebrow" style="color:inherit">Próxima sesión</div>
    <h1>${s.name}</h1>
    <p>${s.exercises.length} ejercicios · ${s.exercises.map(e => e.name.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).join(', ').toLowerCase()}…</p>
    <button class="btn btn-block btn-big" data-act="start" data-sid="${sid}">Empezar ${s.name}</button>
  </section>

  ${stuck.length ? `<section class="card alert"><h3>Fuerza estancada dos semanas</h3>
    <p>${stuck.map(esc).join(', ')}.</p><p><b>Revisa sueño y comida.</b></p></section>` : ''}
  ${measDue ? `<section class="card alert"><h3>${icon('ruler')} Toca medir</h3>
    <p>${lastM ? `Última medición: ${fmtDate(new Date(lastM.date + 'T12:00'))}.` : 'Aún no tienes medidas.'} Se mide cada 4 semanas.</p>
    <a class="btn" href="#medidas">Ir a medidas</a></section>` : ''}

  <section class="card">
    <h2>Otra sesión</h2>
    <div class="grid2">
      ${SESSION_ORDER.map(id => { const d = lastOf(id); return `<button class="btn session-pick" data-act="start" data-sid="${id}"><b>${PLAN[id].name}</b><span>${d ? 'Última: ' + fmtDate(d) : 'Sin registrar'}</span></button>`; }).join('')}
    </div>
  </section>

  <section class="card">
    <h2>Calendario sugerido</h2>
    <div class="week">${week}</div>
    <p class="small muted">Si no puedes el miércoles: lunes Torso A, viernes Pierna A, sábado Torso B y domingo Pierna B. La app sigue la rotación según la última sesión que terminaste.</p>
  </section>

  <section class="card">
    <h2>Siempre</h2>
    <ul class="clean ticks">${REMINDERS.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
  </section>

  <section class="card">
    <h3>Tema</h3>
    <div class="seg" role="group" aria-label="Tema">
      ${[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<button data-act="theme" data-v="${v}" aria-pressed="${theme === v}">${l}</button>`).join('')}
    </div>
  </section>`;
}

function viewSession() {
  const cur = getCur();
  const s = PLAN[cur.sid];
  const n = s.exercises.length;
  const top = (label, pct) => `
    <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${Math.max(0, cur.i)}"><div style="width:${pct}%"></div></div>
    <div class="ses-top">
      <div><div class="eyebrow">${esc(s.name)}</div><b>${label}</b></div>
      <div class="row" style="flex:none">
        <button class="btn" data-act="exit">Salir</button>
        <button class="btn" data-act="finish">Terminar</button>
      </div>
    </div>`;

  if (cur.i < 0) {
    return `${top('Calentamiento', 0)}
    <section class="card">
      <h1>Calentamiento · 5 min</h1>
      <ol>${WARMUP.map(w => `<li>${esc(w)}</li>`).join('')}</ol>
    </section>
    <section class="card">
      <h3>Recuerda</h3>
      <ul class="clean ticks">${REMINDERS.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    </section>
    <section class="card">
      <h3>Hoy</h3>
      <ol class="small">${s.exercises.map(e => `<li>${esc(e.name)} <span class="muted">· ${esc(scheme(e))}</span></li>`).join('')}</ol>
    </section>
    <div class="dock"><div class="dock-in"><button class="btn btn-primary btn-block btn-big" data-act="go" data-i="0">Empezar ejercicios</button></div></div>`;
  }

  if (cur.i >= n) {
    const total = s.exercises.reduce((a, e) => a + (cur.log[e.id] || []).length, 0);
    return `${top('Sesión completa', 100)}
    <section class="card">
      <h1>¡Listo!</h1>
      <p>${total} series registradas en ${Math.round((Date.now() - cur.startedAt) / 60000)} minutos.</p>
      <ul class="clean">${s.exercises.map(e => { const l = cur.log[e.id] || []; return `<li class="hist-ex"><b>${esc(exName(e, variantOf(cur, e)))}</b><span class="muted small">${l.length ? l.map(x => esc(setText(e, x))).join(' · ') : 'Sin series'}</span></li>`; }).join('')}</ul>
    </section>
    <div class="ex-nav"><button class="btn" data-act="go" data-i="${n - 1}">${icon('back')} Volver al último</button></div>
    <div class="dock"><div class="dock-in"><button class="btn btn-primary btn-block btn-big" data-act="save">Guardar y terminar</button></div></div>`;
  }

  const ex = s.exercises[cur.i];
  const variant = variantOf(cur, ex);
  const done = (cur.log[ex.id] || []).length;
  const draft = ensureDraft(cur, ex);
  saveCur(cur);
  const c = coach(ex, variant);
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(exName(ex, variant) + ' técnica');
  const anim = ANIMACIONES[ex.id];
  const complete = done >= ex.sets;

  const dots = Array.from({ length: ex.sets }, (_, k) => `<li class="${k < done ? 'done' : ''}" aria-label="Serie ${k + 1}${k < done ? ' hecha' : ''}">${k < done ? icon('check') : ''}</li>`).join('');

  const stepper = (k, label, step, val, mode) => `
    <div class="stepper">
      <label for="in-${k}">${label}</label>
      <div class="ctl">
        <button data-act="step" data-k="${k}" data-d="${-step}" aria-label="Menos">−</button>
        <input id="in-${k}" data-k="${k}" type="text" inputmode="${mode}" autocomplete="off" value="${num(val)}">
        <button data-act="step" data-k="${k}" data-d="${step}" aria-label="Más">+</button>
      </div>
    </div>`;

  let inputs;
  if (ex.type === 'time') inputs = `<div class="steppers">${stepper('w', 'Peso (kg c/u)', 1, draft.w, 'decimal')}${stepper('t', 'Segundos', 5, draft.t, 'numeric')}</div>`;
  else if (ex.bw) inputs = `<div class="steppers one">${stepper('r', 'Repeticiones', 1, draft.r, 'numeric')}</div>`;
  else inputs = `<div class="steppers">${stepper('w', 'Peso (kg c/u)', 1, draft.w, 'decimal')}${stepper('r', 'Repeticiones', 1, draft.r, 'numeric')}</div>`;

  const mainBtn = complete
    ? `<button class="btn btn-primary btn-block btn-big" data-act="go" data-i="${cur.i + 1}">${cur.i + 1 < n ? 'Siguiente ejercicio' : 'Ver resumen'}</button>`
    : ex.type === 'time'
      ? `<button class="btn btn-primary btn-block btn-big" data-act="work">Empezar ${draft.t} s</button>`
      : `<button class="btn btn-primary btn-block btn-big" data-act="done">Serie hecha</button>`;

  return `${top(`Ejercicio ${cur.i + 1} de ${n}`, (cur.i / n) * 100)}
  <section>
    <div class="ex-media">${anim ? `<img src="${esc(anim)}" alt="Animación de ${esc(exName(ex, variant))}">` : ''}</div>
    <h1 class="ex-name">${esc(exName(ex, variant))}</h1>
    <p class="ex-meta">${esc(scheme(ex))} · descanso ${fmtRest(ex.rest)}</p>
    ${ex.alt ? `<label class="toggle"><input type="checkbox" data-act="variant" ${variant === 'alt' ? 'checked' : ''}> Hoy hago ${esc(ex.alt.name.toLowerCase())}</label>` : ''}
    <ol class="dots">${dots}</ol>
  </section>
  <section class="card coach${c.up ? ' up' : ''}">
    <strong>${esc(c.msg)}</strong>
    <span class="muted small">${c.last ? `La vez pasada (${fmtDate(c.last.date)}): ${c.last.ex.sets.map(x => esc(setText(ex, x))).join(' · ')}` : 'Sin registro anterior.'}</span>
  </section>
  <details class="card tech">
    <summary>Técnica y video</summary>
    <ol>${exTips(ex, variant).map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    <a class="btn btn-block" href="${yt}" target="_blank" rel="noopener">${icon('video')} Ver video</a>
  </details>
  <p class="remind">Aprieta las roscas · deja 1-2 en reserva · si el hombro molesta más de 3/10, cámbialo hoy.</p>
  <div class="ex-nav">
    <button class="btn" data-act="go" data-i="${cur.i - 1}" ${cur.i === 0 ? 'disabled' : ''}>${icon('back')} Anterior</button>
    <button class="btn" data-act="undo" ${done ? '' : 'disabled'}>${icon('undo')} Deshacer</button>
    <button class="btn" data-act="go" data-i="${cur.i + 1}">Saltar ${icon('next')}</button>
  </div>
  <div class="dock"><div class="dock-in">${complete ? '' : inputs}${mainBtn}</div></div>`;
}

function viewHistory() {
  const h = getHist().slice().reverse();
  return `
  <h1>Historial</h1>
  ${h.length ? h.map(x => {
    const nSets = x.exercises.reduce((a, e) => a + e.sets.length, 0);
    return `<details class="hist">
      <summary><span><b class="cond" style="font-size:22px">${esc(x.name)}</b><br><span class="muted small">${fmtDate(x.endedAt)} · ${Math.round((x.endedAt - x.startedAt) / 60000)} min</span></span><span class="muted small">${nSets} series</span></summary>
      <div class="body">${x.exercises.map(e => { const ex = exById(e.id) || e; return `<div class="hist-ex"><b>${esc(e.name)}</b><span class="small">${e.sets.map((st, k) => `${k + 1}) ${esc(setText(ex, st))}`).join(' · ')}</span></div>`; }).join('')}
      <button class="btn btn-ghost btn-danger" data-act="del-session" data-id="${x.id}">Borrar esta sesión</button></div>
    </details>`;
  }).join('') : '<section class="card"><p>Todavía no has terminado ninguna sesión.</p></section>'}
  <section class="card">
    <h3>Respaldo</h3>
    <p class="small muted">Tus datos viven solo en este teléfono. Exporta de vez en cuando para no perderlos.</p>
    <div class="row"><button class="btn" data-act="export">Exportar datos</button><label class="btn" for="imp">Importar datos</label></div>
    <input id="imp" type="file" accept="application/json,.json" hidden>
  </section>`;
}

const MEAS_FIELDS = [
  { k: 'weight', label: 'Peso promedio', unit: 'kg' },
  { k: 'waist', label: 'Cintura en el ombligo', unit: 'cm' },
  { k: 'arm', label: 'Brazo relajado', unit: 'cm' },
  { k: 'thigh', label: 'Muslo', unit: 'cm' },
  { k: 'pullups', label: 'Dominadas máximas', unit: 'reps' },
  { k: 'pushups', label: 'Flexiones máximas', unit: 'reps' },
  { k: 'bulg', label: 'Búlgara con peso fijo', unit: 'reps' },
  { k: 'bulgW', label: 'Peso usado en la búlgara', unit: 'kg c/u' }
];

function verdict(cur, prev) {
  if (!prev || cur.weight == null || prev.weight == null) return null;
  const dw = cur.weight - prev.weight;
  const dc = cur.waist != null && prev.waist != null ? cur.waist - prev.waist : 0;
  if (dw >= 1.5 || dc >= 1.5) return { t: 'Quita 200 kcal al día', c: 'warn' };
  if (dw < 0.5) return { t: 'Agrega 200-300 kcal al día', c: 'warn' };
  return { t: 'Sigue igual', c: 'ok' };
}

function viewMeasures() {
  const m = getMeas();
  const last = m[m.length - 1];
  const nextDate = last ? fmtDate(new Date(last.date + 'T12:00').getTime() + 28 * DAY) : null;
  const stuck = stagnant();
  const sign = d => (d > 0 ? '+' : d < 0 ? '−' : '±') + num(Math.abs(d));

  return `
  <h1>Medidas</h1>
  <p class="muted">Cada 4 semanas.${nextDate ? ` Próxima: <b>${nextDate}</b>.` : ''}</p>
  <form class="card" id="meas-form" autocomplete="off">
    <div class="form-grid">
      <div class="field full"><label for="m-date">Fecha</label><input id="m-date" name="date" type="date" value="${todayISO()}" required></div>
      ${MEAS_FIELDS.map(f => `<div class="field"><label for="m-${f.k}">${f.label} (${f.unit})</label><input id="m-${f.k}" name="${f.k}" type="text" inputmode="decimal" autocomplete="off" ${f.k === 'bulgW' && last && last.bulgW != null ? `value="${num(last.bulgW)}"` : ''}></div>`).join('')}
    </div>
    <button class="btn btn-primary btn-block btn-big" style="margin-top:14px" type="submit">Guardar medición</button>
  </form>

  <section class="card">
    <h3>Reglas</h3>
    <ul class="small" style="padding-left:18px;margin:0">
      <li>Peso +0,5 a 1 kg y cintura igual o +1 cm: seguir igual.</li>
      <li>Peso sube menos de 0,5 kg: agregar 200-300 kcal.</li>
      <li>Peso +1,5 kg o más, o cintura +1,5 cm o más: quitar 200 kcal.</li>
      <li>Fuerza estancada dos semanas: revisar sueño y comida.${stuck.length ? ` <b>Ahora: ${stuck.map(esc).join(', ')}.</b>` : ''}</li>
    </ul>
  </section>

  ${m.slice().reverse().map((x, ri) => {
    const i = m.length - 1 - ri, prev = m[i - 1];
    const v = verdict(x, prev);
    return `<section class="card">
      <div class="row" style="justify-content:space-between"><h3 style="margin:0">${fmtDate(new Date(x.date + 'T12:00'))}</h3>
      <button class="btn btn-ghost btn-danger" style="flex:none;min-height:40px;font-size:14px" data-act="del-meas" data-i="${i}">Borrar</button></div>
      <table><tbody>${MEAS_FIELDS.filter(f => x[f.k] != null).map(f => {
        const d = prev && prev[f.k] != null ? x[f.k] - prev[f.k] : null;
        return `<tr><td>${f.label}</td><td class="n">${num(x[f.k])} <span class="small muted">${f.unit}</span></td><td class="n small">${d == null ? '' : sign(d)}</td></tr>`;
      }).join('')}</tbody></table>
      ${v ? `<span class="verdict ${v.c}">${v.t}</span>` : prev ? '' : '<p class="small muted" style="margin-top:8px">Primera medición: la comparación sale desde la próxima.</p>'}
    </section>`;
  }).join('')}`;
}

function viewPrint() {
  const lines = n => Array.from({ length: n }, () => '<div class="line"></div>').join('');
  return `
  <div class="no-print">
    <h1>Imprimir</h1>
    <p class="muted">El plan completo y una hoja de registro de 6 semanas por sesión.</p>
    <button class="btn btn-primary btn-block btn-big" data-act="print">${icon('print')} Imprimir</button>
  </div>
  <div class="print-sheet">
    <section class="card">
      <h2>Plan de entrenamiento en casa</h2>
      <p class="small">Equipo: barra de dominadas/fondos y mancuernas de hasta 20 kg cada una.<br>
      Calendario: lunes Torso A · miércoles Pierna A · viernes Torso B · sábado Pierna B. Alternativa: lunes, viernes, sábado, domingo.<br>
      Calentamiento (5 min): ${WARMUP.map(esc).join(' · ')}.<br>
      ${REMINDERS.map(esc).join(' ')}</p>
      ${SESSION_ORDER.map(id => `<h3 style="margin-top:14px">${PLAN[id].name}</h3>
        <table><thead><tr><th>Ejercicio</th><th>Series × reps</th><th>Descanso</th></tr></thead><tbody>
        ${PLAN[id].exercises.map(e => `<tr><td>${esc(e.name)}${e.alt ? ` <span class="muted">(alt.: ${esc(e.alt.name.toLowerCase())})</span>` : ''}</td><td>${esc(scheme(e))}</td><td>${fmtRest(e.rest)}</td></tr>`).join('')}
        </tbody></table>`).join('')}
    </section>
    ${SESSION_ORDER.map(id => `<section class="card page">
      <h2>Registro · ${PLAN[id].name}</h2>
      <p class="small muted">Anota peso × repeticiones por serie.</p>
      <div class="scroll-x"><table class="log-table"><thead><tr><th>Ejercicio</th>${[1, 2, 3, 4, 5, 6].map(w => `<th>Sem ${w}<br><span class="small">__/__</span></th>`).join('')}</tr></thead><tbody>
      ${PLAN[id].exercises.map(e => `<tr><td><b>${esc(e.name)}</b><br><span class="small muted">${esc(scheme(e))}</span></td>${[1, 2, 3, 4, 5, 6].map(() => `<td class="cell">${lines(e.sets)}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
    </section>`).join('')}
  </div>`;
}

/* ---------- Router ---------- */

const ROUTES = { inicio: viewHome, sesion: viewSession, historial: viewHistory, medidas: viewMeasures, imprimir: viewPrint };
let lastRoute = null;

function render() {
  let r = location.hash.slice(1) || 'inicio';
  if (!ROUTES[r]) r = 'inicio';
  if (r === 'sesion' && !getCur()) { location.replace('#inicio'); return; }
  document.body.dataset.route = r;
  $('#app').innerHTML = ROUTES[r]();
  document.querySelectorAll('.tabbar a').forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + r ? 'page' : 'false'));
  const dock = $('.dock');
  document.documentElement.style.setProperty('--dock-h', dock ? dock.offsetHeight + 'px' : '0px');
  if (r !== lastRoute) window.scrollTo(0, 0);
  lastRoute = r;
}

/* ---------- Eventos ---------- */

function readInputs(cur, ex) {
  const d = ensureDraft(cur, ex);
  for (const k of ['w', 'r', 't']) {
    const el = document.getElementById('in-' + k);
    if (el) { const v = parseFloat(String(el.value).replace(',', '.')); d[k] = isFinite(v) && v >= 0 ? v : 0; }
  }
  return d;
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  const cur = getCur();
  const ex = cur && cur.i >= 0 && PLAN[cur.sid].exercises[cur.i];

  switch (act) {
    case 'start': startSession(b.dataset.sid); break;
    case 'resume': keepAwake(); location.hash = '#sesion'; break;
    case 'discard':
      if (confirm('¿Descartar la sesión a medias? Se pierden sus series.')) { store.del(K.cur); releaseAwake(); render(); }
      break;
    case 'exit': location.hash = '#inicio'; break;
    case 'finish':
      if (confirm('¿Terminar la sesión y guardarla en el historial?')) finishSession();
      break;
    case 'save': finishSession(); break;
    case 'go': {
      const n = PLAN[cur.sid].exercises.length;
      cur.i = Math.max(0, Math.min(n, +b.dataset.i));
      saveCur(cur);
      render();
      window.scrollTo(0, 0);
      break;
    }
    case 'step': {
      const k = b.dataset.k, inp = document.getElementById('in-' + k);
      const v = Math.max(0, (parseFloat(String(inp.value).replace(',', '.')) || 0) + parseFloat(b.dataset.d));
      inp.value = num(Math.round(v * 10) / 10);
      readInputs(cur, ex);
      saveCur(cur);
      if (k === 't') { const w = $('[data-act="work"]'); if (w) w.textContent = `Empezar ${inp.value} s`; }
      break;
    }
    case 'done': {
      const d = readInputs(cur, ex);
      saveCur(cur);
      logSet(ex.id, ex.bw ? { r: d.r } : { w: d.w, r: d.r });
      break;
    }
    case 'work': {
      const d = readInputs(cur, ex);
      saveCur(cur);
      if (!d.t) { toast('Pon los segundos'); break; }
      startTimer('work', d.t, { exId: ex.id, exName: ex.name, w: d.w, next: `Después: descanso de ${fmtRest(ex.rest)}` });
      break;
    }
    case 'undo': {
      const l = cur.log[ex.id];
      if (l && l.length) { l.pop(); saveCur(cur); render(); toast('Serie borrada'); }
      break;
    }
    case 't-minus': adjustTimer(-15); break;
    case 't-plus': adjustTimer(15); break;
    case 't-skip': timerEnd(false); break;
    case 'theme': setTheme(b.dataset.v); render(); break;
    case 'export': exportData(); break;
    case 'print': window.print(); break;
    case 'del-session':
      if (confirm('¿Borrar esta sesión del historial?')) { store.set(K.hist, getHist().filter(x => String(x.id) !== b.dataset.id)); render(); }
      break;
    case 'del-meas':
      if (confirm('¿Borrar esta medición?')) { const m = getMeas(); m.splice(+b.dataset.i, 1); store.set(K.meas, m); render(); }
      break;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-act="variant"]')) {
    const cur = getCur(), ex = PLAN[cur.sid].exercises[cur.i];
    cur.variant[ex.id] = t.checked ? 'alt' : 'main';
    delete cur.draft[ex.id];
    saveCur(cur);
    render();
  } else if (t.matches('.stepper input')) {
    const cur = getCur();
    const ex = PLAN[cur.sid].exercises[cur.i];
    readInputs(cur, ex);
    saveCur(cur);
    const w = $('[data-act="work"]');
    if (w && t.dataset.k === 't') w.textContent = `Empezar ${t.value} s`;
  } else if (t.id === 'imp' && t.files[0]) {
    importData(t.files[0]);
  }
});

document.addEventListener('focusin', e => { if (e.target.matches('.stepper input, .field input')) e.target.select && e.target.select(); });

document.addEventListener('submit', e => {
  if (e.target.id !== 'meas-form') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const rec = { date: fd.get('date') || todayISO() };
  let any = false;
  for (const f of MEAS_FIELDS) {
    const raw = String(fd.get(f.k) || '').replace(',', '.').trim();
    if (raw !== '') { const v = parseFloat(raw); if (isFinite(v)) { rec[f.k] = v; if (f.k !== 'bulgW') any = true; } }
  }
  if (!any) { toast('Escribe al menos una medida'); return; }
  const m = getMeas();
  m.push(rec);
  m.sort((a, b) => a.date.localeCompare(b.date));
  if (store.set(K.meas, m)) { toast('Medición guardada'); render(); }
});

/* ---------- Respaldo ---------- */

function exportData() {
  const data = { app: 'entreno-en-casa', version: 1, exportedAt: new Date().toISOString(), history: getHist(), measures: getMeas() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `entreno-${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (!Array.isArray(d.history) || !Array.isArray(d.measures)) throw new Error('formato');
      if (!confirm(`El archivo trae ${d.history.length} sesiones y ${d.measures.length} mediciones. Reemplazarán lo que hay en este teléfono. ¿Seguir?`)) return;
      store.set(K.hist, d.history);
      store.set(K.meas, d.measures);
      toast('Datos importados');
      render();
    } catch { toast('Ese archivo no es un respaldo válido'); }
  };
  fr.readAsText(file);
}

/* ---------- Tema y avisos ---------- */

function setTheme(v) {
  store.set(K.theme, v);
  if (v === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = v;
}

let toastT = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------- Arranque ---------- */

setTheme(store.get(K.theme, 'auto'));
window.addEventListener('hashchange', render);
window.addEventListener('resize', () => { const d = $('.dock'); if (d) document.documentElement.style.setProperty('--dock-h', d.offsetHeight + 'px'); });
render();

(function resumeTimer() {
  const cur = getCur();
  if (!cur) return;
  if (cur.timer) {
    if (cur.timer.mode === 'work' && cur.timer.endsAt <= Date.now()) {
      // El trabajo terminó con la app cerrada: se registra y arranca el descanso.
      const t = cur.timer; cur.timer = null; saveCur(cur);
      logSet(t.exId, { w: t.w, t: Math.round(t.total / 1000) });
    } else {
      showTimer();
    }
  }
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
