// ============================================================
// LÓGICA DO APP — normalmente você não precisa mexer aqui.
// Para editar músicas, senha ou categorias fixas, veja data.js.
// Cifras adicionadas pelo botão "+" ficam salvas neste navegador
// (localStorage) até você colar o código gerado em data.js.
// ============================================================

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_TO_SHARP = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
const DRAFTS_KEY = "pampulha_drafts";

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

// ---------------- Rascunhos (localStorage) ----------------
function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(drafts) {
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts));
  } catch {
    // localStorage indisponível (modo privado, por exemplo): segue sem persistir
  }
}

function addDraft(song) {
  const drafts = loadDrafts();
  const withId = { ...song, id: "draft-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7) };
  drafts.push(withId);
  saveDrafts(drafts);
  return withId;
}

function removeDraft(id) {
  saveDrafts(loadDrafts().filter((d) => d.id !== id));
}

function getAllSongs() {
  const built = SONGS.map((s, i) => ({ ...s, _source: "built", _key: "built-" + i }));
  const drafts = loadDrafts().map((s) => ({ ...s, _source: "draft", _key: s.id }));
  return built.concat(drafts);
}

// ---------------- Estado ----------------
let state = {
  currentSong: null,
  transpose: 0,
  fontSize: 17,
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

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // storage bloqueado (ex: arquivo aberto direto sem servidor, ou modo restrito
    // do navegador); segue sem persistir, a senha será pedida de novo ao recarregar
  }
}

function tryEnter(pass) {
  if (pass === APP_PASSWORD) {
    safeSessionSet("pampulha_ok", "1");
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
  buildAddChips();
  renderSongList();
  renderSchedule();
}

if (safeSessionGet("pampulha_ok") === "1") {
  showApp();
}

// ---------------- Navegação genérica ----------------
function showView(id, opts) {
  const keepTab = opts && opts.keepTab;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (!keepTab) {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  }
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    showView(btn.dataset.view, { keepTab: true });
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
  const externalWrap = document.getElementById("externalSearch");
  list.innerHTML = "";

  const filtered = getAllSongs().filter((s) => {
    const matchesTag = !state.activeTag || s.tags.includes(state.activeTag);
    const matchesSearch =
      !state.searchTerm ||
      s.title.toLowerCase().includes(state.searchTerm) ||
      s.artist.toLowerCase().includes(state.searchTerm);
    return matchesTag && matchesSearch;
  });

  if (filtered.length === 0 && state.searchTerm) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-title">Não está no repertório ainda</div>Busque a cifra na fonte original, converta e adicione pelo botão "+".</div>`;
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
          ${song._source === "draft" ? '<span class="draft-badge">Rascunho</span>' : ""}
        </div>
      </div>
      <span class="tom-badge">${song.tom}</span>
    `;
    card.addEventListener("click", () => openSong(song));
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
      <p class="external-search-hint">Abre em outra aba. Depois de achar a cifra, copie o texto de lá, cole na aba "Converter" e use o botão "Usar em nova cifra".</p>
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
const convUseBtn = document.getElementById("convUseBtn");

convBtn.addEventListener("click", () => {
  const raw = convInput.value;
  if (!raw.trim()) return;
  convOutput.value = convertPastedCifra(raw);
  convOutputWrap.classList.remove("hidden");
});

convCopyBtn.addEventListener("click", async () => {
  await copyToClipboard(convOutput.value);
  flashCopied(convCopyBtn, "Copiar resultado");
});

convUseBtn.addEventListener("click", () => {
  document.getElementById("addCifraInput").value = convOutput.value;
  document.getElementById("addCodeWrap").classList.add("hidden");
  showView("view-add");
});

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const tmp = document.createElement("textarea");
    tmp.value = text;
    document.body.appendChild(tmp);
    tmp.select();
    document.execCommand("copy");
    document.body.removeChild(tmp);
  }
}

function flashCopied(btn, restoreText) {
  btn.textContent = "Copiado!";
  setTimeout(() => (btn.textContent = restoreText), 1500);
}

// ---------------- Nova cifra (formulário) ----------------
let addSelectedTags = [];

function buildAddChips() {
  const wrap = document.getElementById("addChipRow");
  wrap.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = cat;
    if (addSelectedTags.includes(cat)) chip.classList.add("active");
    chip.addEventListener("click", () => {
      addSelectedTags = addSelectedTags.includes(cat)
        ? addSelectedTags.filter((t) => t !== cat)
        : [...addSelectedTags, cat];
      buildAddChips();
    });
    wrap.appendChild(chip);
  });
}

function extractYoutubeId(input) {
  if (!input) return "";
  const trimmed = input.trim();
  const patterns = [/[?&]v=([A-Za-z0-9_-]{6,})/, /youtu\.be\/([A-Za-z0-9_-]{6,})/, /embed\/([A-Za-z0-9_-]{6,})/];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return trimmed;
}

function songToCodeSnippet(song) {
  const cifraEscaped = song.cifra.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return [
    "  {",
    `    title: ${JSON.stringify(song.title)},`,
    `    artist: ${JSON.stringify(song.artist)},`,
    `    tom: ${JSON.stringify(song.tom)},`,
    `    tags: ${JSON.stringify(song.tags)},`,
    `    youtubeId: ${JSON.stringify(song.youtubeId || "")},`,
    "    cifra: `" + cifraEscaped + "`",
    "  },"
  ].join("\n");
}

document.getElementById("addSongFab").addEventListener("click", () => {
  addSelectedTags = [];
  document.getElementById("addTitle").value = "";
  document.getElementById("addArtist").value = "";
  document.getElementById("addTom").value = "";
  document.getElementById("addYoutube").value = "";
  document.getElementById("addCifraInput").value = "";
  document.getElementById("addError").textContent = "";
  document.getElementById("addCodeWrap").classList.add("hidden");
  buildAddChips();
  showView("view-add");
});

document.getElementById("addBackBtn").addEventListener("click", () => {
  showView("view-repertorio");
  document.querySelector('.tab-btn[data-view="view-repertorio"]').classList.add("active");
});

document.getElementById("addSaveBtn").addEventListener("click", () => {
  const title = document.getElementById("addTitle").value.trim();
  const artist = document.getElementById("addArtist").value.trim() || "Ministério Pampulha";
  const tom = document.getElementById("addTom").value.trim();
  const youtubeRaw = document.getElementById("addYoutube").value.trim();
  const cifra = document.getElementById("addCifraInput").value;
  const errorEl = document.getElementById("addError");

  if (!title || !tom || !cifra.trim()) {
    errorEl.textContent = "Preencha pelo menos título, tom e a cifra.";
    return;
  }
  errorEl.textContent = "";

  const song = {
    title,
    artist,
    tom,
    tags: [...addSelectedTags],
    youtubeId: extractYoutubeId(youtubeRaw),
    cifra
  };

  addDraft(song);
  renderSongList();

  const codeWrap = document.getElementById("addCodeWrap");
  document.getElementById("addCodeOutput").value = songToCodeSnippet(song);
  codeWrap.classList.remove("hidden");
});

document.getElementById("addCopyCodeBtn").addEventListener("click", async () => {
  await copyToClipboard(document.getElementById("addCodeOutput").value);
  flashCopied(document.getElementById("addCopyCodeBtn"), "Copiar código");
});

// ---------------- Detalhe da música ----------------
function openSong(song) {
  state.currentSong = song;
  state.transpose = 0;
  state.fontSize = 17;
  stopAutoscroll();
  showView("view-detail");
  renderDetail();
}

document.getElementById("backBtn").addEventListener("click", () => {
  stopAutoscroll();
  showView("view-repertorio");
  document.querySelector('.tab-btn[data-view="view-repertorio"]').classList.add("active");
});

function currentTom(song) {
  const idx = noteIndex(song.tom);
  if (idx === -1) return song.tom;
  const newIdx = (((idx + state.transpose) % 12) + 12) % 12;
  return NOTES[newIdx];
}

function renderDetail() {
  const song = state.currentSong;
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

  const existingNote = document.getElementById("draftDetailNote");
  if (existingNote) existingNote.remove();
  const existingDelete = document.getElementById("draftDeleteBtn");
  if (existingDelete) existingDelete.remove();

  if (song._source === "draft") {
    const note = document.createElement("p");
    note.id = "draftDetailNote";
    note.className = "draft-note";
    note.textContent = "Rascunho salvo só neste aparelho. Cole o código em data.js para todo mundo ver, depois remova o rascunho.";
    document.getElementById("detailArtist").insertAdjacentElement("afterend", note);

    const delBtn = document.createElement("button");
    delBtn.id = "draftDeleteBtn";
    delBtn.className = "danger-btn";
    delBtn.textContent = "Remover rascunho";
    delBtn.addEventListener("click", () => {
      removeDraft(song.id);
      showView("view-repertorio");
      document.querySelector('.tab-btn[data-view="view-repertorio"]').classList.add("active");
      renderSongList();
    });
    document.querySelector(".cifra-card").insertAdjacentElement("afterend", delBtn);
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
