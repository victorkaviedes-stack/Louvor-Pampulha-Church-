// ============================================================
// LÓGICA DO APP — normalmente você não precisa mexer aqui.
// Para editar músicas, senha ou categorias, veja data.js.
// ============================================================

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };

function noteIndex(note) {
  const norm = FLAT_TO_SHARP[note] || note;
  return NOTES.indexOf(norm);
}

function transposeChordToken(token, semitones) {
  return token
    .split("/")
    .map((part) => {
      const m = part.match(/^([A-G])(#|b)?/);
      if (!m) return part;
      const root = m[0];
      const rest = part.slice(root.length);
      const idx = noteIndex(root);
      if (idx === -1) return part;
      const newIdx = (((idx + semitones) % 12) + 12) % 12;
      return NOTES[newIdx] + rest;
    })
    .join("/");
}

function transposeCifraText(raw, semitones) {
  if (!semitones) return raw;
  return raw.replace(/\[([^\]]+)\]/g, (_, chord) => `[${transposeChordToken(chord, semitones)}]`);
}

function renderCifraHTML(raw) {
  const lines = raw.split("\n");
  let html = "";
  for (const line of lines) {
    if (line.trim() === "") {
      html += `<span class="cifra-line">&nbsp;</span>\n`;
      continue;
    }
    if (line.trim().startsWith("## ")) {
      html += `<div class="cifra-section">${escapeHTML(line.trim().slice(3))}</div>`;
      continue;
    }
    const parts = line.split(/(\[[^\]]+\])/g).filter((p) => p !== "");
    let lineHTML = "";
    let pendingChord = null;
    for (const part of parts) {
      const chordMatch = part.match(/^\[([^\]]+)\]$/);
      if (chordMatch) {
        pendingChord = chordMatch[1];
      } else {
        if (pendingChord) {
          lineHTML += `<span class="seg"><span class="chord">${escapeHTML(pendingChord)}</span>${escapeHTML(part)}</span>`;
          pendingChord = null;
        } else {
          lineHTML += escapeHTML(part);
        }
      }
    }
    if (pendingChord) {
      lineHTML += `<span class="seg"><span class="chord">${escapeHTML(pendingChord)}</span>&nbsp;</span>`;
    }
    html += `<span class="cifra-line">${lineHTML}</span>\n`;
  }
  return html;
}

function escapeHTML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------- Estado ----------------
let state = {
  currentSongIndex: null,
  transpose: 0,
  fontSize: 17,
  autoscroll: false,
  autoscrollTimer: null,
  activeTag: null,
  searchTerm: ""
};

// ---------------- Gate de senha ----------------
const gate = document.getElementById("gate");
const appEl = document.getElementById("app");
const gateForm = document.getElementById("gateForm");
const gateInput = document.getElementById("gateInput");
const gateError = document.getElementById("gateError");

function tryEnter(pass) {
  if (pass === APP_PASSWORD) {
    sessionStorage.setItem("pampulha_ok", "1");
    showApp();
  } else {
    gateError.textContent = "Senha incorreta. Confira com a coordenação do ministério.";
    gateInput.value = "";
    gateInput.focus();
  }
}

gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  tryEnter(gateInput.value.trim());
});

function showApp() {
  gate.style.display = "none";
  appEl.style.display = "flex";
  document.getElementById("churchName").textContent = CHURCH_NAME;
  document.getElementById("ministryName").textContent = MINISTRY_NAME;
  buildCategoryChips();
  renderSongList();
  renderSchedule();
}

if (sessionStorage.getItem("pampulha_ok") === "1") {
  showApp();
}

// ---------------- Abas ----------------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.view).classList.add("active");
  });
});

// ---------------- Lista / busca / filtro ----------------
const searchInput = document.getElementById("searchInput");
searchInput.addEventListener("input", () => {
  state.searchTerm = searchInput.value.trim().toLowerCase();
  renderSongList();
});

function buildCategoryChips() {
  const wrap = document.getElementById("chipRow");
  wrap.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = cat;
    chip.addEventListener("click", () => {
      state.activeTag = state.activeTag === cat ? null : cat;
      buildCategoryChips();
      renderSongList();
    });
    if (state.activeTag === cat) chip.classList.add("active");
    wrap.appendChild(chip);
  });
}

function renderSongList() {
  const list = document.getElementById("songList");
  list.innerHTML = "";

  const filtered = SONGS.map((s, i) => ({ ...s, _idx: i })).filter((s) => {
    const matchesTag = !state.activeTag || s.tags.includes(state.activeTag);
    const matchesSearch =
      !state.searchTerm ||
      s.title.toLowerCase().includes(state.searchTerm) ||
      s.artist.toLowerCase().includes(state.searchTerm);
    return matchesTag && matchesSearch;
  });

  const externalWrap = document.getElementById("externalSearch");
  if (filtered.length === 0 && state.searchTerm) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-title">Não está no repertório ainda</div>Busque a cifra na fonte original e depois use o conversor para adicionar.</div>`;
    renderExternalSearchSuggestion(state.searchTerm);
    return;
  } else if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-title">Nada por aqui</div>Tente outro termo ou remova o filtro.</div>`;
    externalWrap.classList.add("hidden");
    return;
  } else {
    externalWrap.classList.add("hidden");
  }

  filtered.forEach((song) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `
      <div class="song-card-info">
        <p class="song-card-title">${escapeHTML(song.title)}</p>
        <div class="song-card-meta">
          <span>${escapeHTML(song.artist)}</span>
          ${song.youtubeId ? "· ▶" : ""}
        </div>
      </div>
      <span class="tom-badge">${song.tom}</span>
    `;
    card.addEventListener("click", () => openSong(song._idx));
    list.appendChild(card);
  });
}

function renderExternalSearchSuggestion(term) {
  const wrap = document.getElementById("externalSearch");
  const q = encodeURIComponent(term + " cifra");
  wrap.innerHTML = `
    <div class="external-search">
      <p class="external-search-title">Buscar "${escapeHTML(term)}" em outra fonte</p>
      <div class="external-search-links">
        <a href="https://www.google.com/search?q=site:cifraclub.com.br+${q}" target="_blank" rel="noopener">Buscar no Cifra Club</a>
        <a href="https://www.google.com/search?q=site:cifras.com.br+${q}" target="_blank" rel="noopener">Buscar no Cifras.com.br</a>
      </div>
      <p class="external-search-hint">Abre em outra aba. Depois de achar a cifra, copie o texto de lá e cole na aba "Converter" para transformar no formato deste app em poucos segundos.</p>
    </div>
  `;
  wrap.classList.remove("hidden");
}

// ---------------- Conversor de cifra colada ----------------
const CHORD_TOKEN_RE = /^[A-G](#|b)?[A-Za-z0-9()\/#+\-]*$/;
const SECTION_WORD_RE = /^(intro(du[çc][ãa]o)?|verso(\s*\d+)?|pr[ée][- ]?refr[ãa]o|refr[ãa]o|ponte|solo|final|coda|interl[úu]dio)\s*:?\s*\d*$/i;

function isChordLikeToken(tok) {
  return CHORD_TOKEN_RE.test(tok);
}

function isSectionHeaderLine(trimmed) {
  return SECTION_WORD_RE.test(trimmed);
}

function isChordLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const tokens = trimmed.split(/\s+/);
  const chordLike = tokens.filter(isChordLikeToken);
  return chordLike.length / tokens.length >= 0.8;
}

function mergeChordIntoLyric(chordLine, lyricLine) {
  const inserts = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    if (isChordLikeToken(m[0])) inserts.push({ pos: m.index, chord: m[0] });
  }
  inserts.sort((a, b) => b.pos - a.pos);
  const arr = lyricLine.split("");
  for (const ins of inserts) {
    const pos = Math.min(ins.pos, arr.length);
    arr.splice(pos, 0, `[${ins.chord}]`);
  }
  return arr.join("");
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function convertPastedCifra(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      out.push("");
      continue;
    }

    if (isSectionHeaderLine(trimmed) && !isChordLine(trimmed)) {
      out.push("## " + capitalize(trimmed.replace(/:$/, "")));
      continue;
    }

    if (isChordLine(line)) {
      const next = lines[i + 1];
      const nextIsLyric = next !== undefined && next.trim() !== "" && !isChordLine(next) && !isSectionHeaderLine(next.trim());
      if (nextIsLyric) {
        out.push(mergeChordIntoLyric(line, next));
        i++;
      } else {
        const chords = trimmed.split(/\s+/);
        out.push(chords.map((c) => `[${c}]`).join(" "));
      }
      continue;
    }

    out.push(line);
  }
  return out.join("\n");
}

const convBtn = document.getElementById("convBtn");
const convInput = document.getElementById("convInput");
const convOutput = document.getElementById("convOutput");
const convOutputWrap = document.getElementById("convOutputWrap");
const convCopyBtn = document.getElementById("convCopyBtn");

convBtn.addEventListener("click", () => {
  const raw = convInput.value;
  if (!raw.trim()) return;
  convOutput.value = convertPastedCifra(raw);
  convOutputWrap.classList.remove("hidden");
});

convCopyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(convOutput.value);
    convCopyBtn.textContent = "Copiado!";
    setTimeout(() => (convCopyBtn.textContent = "Copiar resultado"), 1500);
  } catch {
    convOutput.select();
    document.execCommand("copy");
  }
});

// ---------------- Detalhe da música ----------------
function openSong(idx) {
  state.currentSongIndex = idx;
  state.transpose = 0;
  state.fontSize = 17;
  stopAutoscroll();
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-detail").classList.add("active");
  renderDetail();
}

document.getElementById("backBtn").addEventListener("click", () => {
  stopAutoscroll();
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById("view-repertorio").classList.add("active");
  document.querySelector('.tab-btn[data-view="view-repertorio"]').classList.add("active");
});

function currentTom(song) {
  const idx = noteIndex(song.tom);
  if (idx === -1) return song.tom;
  const newIdx = (((idx + state.transpose) % 12) + 12) % 12;
  return NOTES[newIdx];
}

function renderDetail() {
  const song = SONGS[state.currentSongIndex];
  document.getElementById("detailTitle").textContent = song.title;
  document.getElementById("detailArtist").textContent = song.artist;
  document.getElementById("tomValue").textContent = currentTom(song);
  document.getElementById("fontValue").textContent = state.fontSize;

  const transposed = transposeCifraText(song.cifra, state.transpose);
  const cifraBody = document.getElementById("cifraBody");
  cifraBody.innerHTML = renderCifraHTML(transposed);
  cifraBody.style.fontSize = state.fontSize + "px";

  const ytWrap = document.getElementById("ytWrap");
  const ytToggle = document.getElementById("ytToggle");
  ytWrap.innerHTML = "";
  ytWrap.classList.add("hidden");
  if (song.youtubeId) {
    ytToggle.classList.remove("hidden");
    ytToggle.textContent = "▶ Ver referência no YouTube";
    ytToggle.onclick = () => {
      if (ytWrap.classList.contains("hidden")) {
        ytWrap.innerHTML = `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(song.youtubeId)}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        ytWrap.classList.remove("hidden");
      } else {
        ytWrap.classList.add("hidden");
        ytWrap.innerHTML = "";
      }
    };
  } else {
    ytToggle.classList.add("hidden");
  }
}

document.getElementById("tomMinus").addEventListener("click", () => {
  state.transpose -= 1;
  renderDetail();
});
document.getElementById("tomPlus").addEventListener("click", () => {
  state.transpose += 1;
  renderDetail();
});
document.getElementById("fontMinus").addEventListener("click", () => {
  state.fontSize = Math.max(13, state.fontSize - 1);
  renderDetail();
});
document.getElementById("fontPlus").addEventListener("click", () => {
  state.fontSize = Math.min(26, state.fontSize + 1);
  renderDetail();
});

// ---------------- Autoscroll (mãos livres para o palco) ----------------
const autoscrollBtn = document.getElementById("autoscrollBtn");
autoscrollBtn.addEventListener("click", () => {
  if (state.autoscrollTimer) {
    stopAutoscroll();
  } else {
    startAutoscroll();
  }
});

function startAutoscroll() {
  state.autoscrollTimer = setInterval(() => {
    window.scrollBy({ top: 1, behavior: "auto" });
  }, 60);
  autoscrollBtn.classList.add("on");
}

function stopAutoscroll() {
  if (state.autoscrollTimer) clearInterval(state.autoscrollTimer);
  state.autoscrollTimer = null;
  autoscrollBtn.classList.remove("on");
}

// ---------------- Escalas ----------------
function renderSchedule() {
  const wrap = document.getElementById("scheduleList");
  if (!SCHEDULE || SCHEDULE.length === 0) {
    wrap.innerHTML = `<div class="schedule-empty"><div class="empty-state-title">Escalas em breve</div>Essa aba já está com a estrutura pronta em data.js. Quando quiser, é só pedir para eu ligar a tela.</div>`;
    return;
  }
  wrap.innerHTML = "";
  SCHEDULE.forEach((entry) => {
    const card = document.createElement("div");
    card.className = "song-card";
    card.innerHTML = `<div class="song-card-info">
      <p class="song-card-title">${escapeHTML(entry.service)}</p>
      <div class="song-card-meta">${escapeHTML(entry.date)}</div>
    </div>`;
    wrap.appendChild(card);
  });
}

// ---------------- Instalação PWA ----------------
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById("installBtn").classList.remove("hidden");
});

document.getElementById("installBtn").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById("installBtn").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
