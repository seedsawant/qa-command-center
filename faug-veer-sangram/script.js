"use strict";

/* =============================================================================
   FAUG VEER SANGRAM — 16-team double elimination bracket
   -----------------------------------------------------------------------------
   HOW THIS FILE IS ORGANISED
     1. CONFIG        – a few switches
     2. TEAMS         – fill in `name` and `logo` for each of the 16 slots
     3. ROUNDS        – round labels and which column they sit in
     4. MATCHES       – all 31 matches. Edit scores / status / winner here
     5. ENGINE        – resolves who plays who from the results (no DOM)
     6. LAYOUT        – computes x/y of every card from the bracket structure
     7. RENDER        – builds cards + SVG connector lines from 4–6
     8. INTERACTION   – hover highlighting, responsive scaling, public API

   EDITING CHEAT SHEET (everything below is plain data — no HTML to touch)
     • Team:    teams[3] = { name: "Team Name", logo: "assets/team3.png" }
     • Result:  { ..., scoreA: 2, scoreB: 1, status: "COMPLETED", winner: null }
                winner: null  -> decided by the higher score (when COMPLETED)
                winner: 5     -> force a winner by team slot number
                winner: "A"|"B" -> force a winner by side
     • Live:    status: "LIVE"
     • Winners and losers advance automatically; later rounds fill themselves in.
     • From the browser console you can also do (no reload needed):
         Bracket.setTeam(1, { name: "Alpha" })
         Bracket.setMatch("W1", { scoreA: 2, scoreB: 0, status: "COMPLETED" })
   ============================================================================= */


/* =============================================================================
   1. CONFIG
   ============================================================================= */
const CONFIG = {
  // Small muted tag shown in a slot while its team name is blank
  // ("SLOT 3", "WIN W1", "LOSS WQ2" ...). Set to false for fully blank slots.
  showSlotHints: true,

  // Hook for a future edit mode: called with the match id when a card is clicked.
  onMatchClick: null, // e.g. (id) => openEditor(id)
};


/* =============================================================================
   2. TEAMS   (16 empty slots — fill in later)
   `logo` can be any image path/URL. Transparent PNGs work best.
   ============================================================================= */
const teams = {
  1:  { name: "", logo: "" },
  2:  { name: "", logo: "" },
  3:  { name: "", logo: "" },
  4:  { name: "", logo: "" },
  5:  { name: "", logo: "" },
  6:  { name: "", logo: "" },
  7:  { name: "", logo: "" },
  8:  { name: "", logo: "" },
  9:  { name: "", logo: "" },
  10: { name: "", logo: "" },
  11: { name: "", logo: "" },
  12: { name: "", logo: "" },
  13: { name: "", logo: "" },
  14: { name: "", logo: "" },
  15: { name: "", logo: "" },
  16: { name: "", logo: "" },
};


/* =============================================================================
   3. ROUNDS
   `col` is the horizontal column. Winners and losers share the same columns.
   ============================================================================= */
const rounds = [
  { key: "WR16", label: "WINNERS ROUND OF 16",   bracket: "winners", col: 0 },
  { key: "WQF",  label: "WINNERS QUARTERFINALS", bracket: "winners", col: 1 },
  { key: "WSF",  label: "WINNERS SEMIFINALS",    bracket: "winners", col: 2 },
  { key: "WF",   label: "WINNERS FINAL",         bracket: "winners", col: 3 },

  { key: "LR1",  label: "LOSERS ROUND 1",        bracket: "losers",  col: 0 },
  { key: "LR2",  label: "LOSERS ROUND 2",        bracket: "losers",  col: 1 },
  { key: "LR3",  label: "LOSERS ROUND 3",        bracket: "losers",  col: 2 },
  { key: "LQF",  label: "LOSERS QUARTERFINAL",   bracket: "losers",  col: 3 },
  { key: "LSF",  label: "LOSERS SEMIFINAL",      bracket: "losers",  col: 4 },
  { key: "LF",   label: "LOSERS FINAL",          bracket: "losers",  col: 5 },

  { key: "GF",   label: "GRAND FINAL",           bracket: "final" },
  { key: "GFR",  label: "GRAND FINAL RESET",     bracket: "final" },
];


/* =============================================================================
   4. MATCHES
   -----------------------------------------------------------------------------
   Fixed first-round pairings use  teamA / teamB  (team slot numbers).
   Every other match uses  `from: [sourceA, sourceB]`  where a source is:
       "W:<matchId>"  winner of that match
       "L:<matchId>"  loser  of that match
       "A:<matchId>" / "B:<matchId>"  side A / B of that match (reset match only)
   The engine fills in teamA/teamB from the results — you never enter them by hand.

   Losers bracket wiring (standard 16-team double elimination):
     LR1  L1–L4    losers of W1–W8, paired
     LR2  L5–L8    LR1 winner  vs  loser of a Winners Quarterfinal (crossed to avoid rematches)
     LR3  L9–L10   LR2 winners paired
     LQF  L11–L12  LR3 winner  vs  loser of a Winners Semifinal (crossed)
     LSF  L13      LQF winners
     LF   L14      LSF winner  vs  loser of the Winners Final
   ============================================================================= */
const matches = [
  // ---- WINNERS ROUND OF 16 --------------------------------------------------
  { id: "W1",  round: "WR16", teamA: 1,  teamB: 2,  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W2",  round: "WR16", teamA: 3,  teamB: 4,  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W3",  round: "WR16", teamA: 5,  teamB: 6,  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W4",  round: "WR16", teamA: 7,  teamB: 8,  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W5",  round: "WR16", teamA: 9,  teamB: 10, scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W6",  round: "WR16", teamA: 11, teamB: 12, scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W7",  round: "WR16", teamA: 13, teamB: 14, scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "W8",  round: "WR16", teamA: 15, teamB: 16, scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- WINNERS QUARTERFINALS ------------------------------------------------
  { id: "WQ1", round: "WQF",  from: ["W:W1", "W:W2"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "WQ2", round: "WQF",  from: ["W:W3", "W:W4"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "WQ3", round: "WQF",  from: ["W:W5", "W:W6"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "WQ4", round: "WQF",  from: ["W:W7", "W:W8"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- WINNERS SEMIFINALS / FINAL ------------------------------------------
  { id: "WS1", round: "WSF",  from: ["W:WQ1", "W:WQ2"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "WS2", round: "WSF",  from: ["W:WQ3", "W:WQ4"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "WF",  round: "WF",   from: ["W:WS1", "W:WS2"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- LOSERS ROUND 1 -------------------------------------------------------
  { id: "L1",  round: "LR1",  from: ["L:W1", "L:W2"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L2",  round: "LR1",  from: ["L:W3", "L:W4"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L3",  round: "LR1",  from: ["L:W5", "L:W6"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L4",  round: "LR1",  from: ["L:W7", "L:W8"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- LOSERS ROUND 2 (LR1 winner vs Winners Quarterfinal loser) -------------
  { id: "L5",  round: "LR2",  from: ["W:L1", "L:WQ2"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L6",  round: "LR2",  from: ["W:L2", "L:WQ1"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L7",  round: "LR2",  from: ["W:L3", "L:WQ4"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L8",  round: "LR2",  from: ["W:L4", "L:WQ3"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- LOSERS ROUND 3 -------------------------------------------------------
  { id: "L9",  round: "LR3",  from: ["W:L5", "W:L6"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L10", round: "LR3",  from: ["W:L7", "W:L8"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- LOSERS QUARTERFINAL (LR3 winner vs Winners Semifinal loser) ----------
  { id: "L11", round: "LQF",  from: ["W:L9",  "L:WS2"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L12", round: "LQF",  from: ["W:L10", "L:WS1"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- LOSERS SEMIFINAL / FINAL --------------------------------------------
  { id: "L13", round: "LSF",  from: ["W:L11", "W:L12"], scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },
  { id: "L14", round: "LF",   from: ["W:L13", "L:WF"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null },

  // ---- GRAND FINAL ----------------------------------------------------------
  { id: "GF",  round: "GF",   from: ["W:WF", "W:L14"],  scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null,
    hints: ["WB FINALIST", "LB FINALIST"] },

  // Only played if the Losers Bracket finalist (side B) wins the Grand Final.
  { id: "GFR", round: "GFR",  from: ["A:GF", "B:GF"],   scoreA: 0, scoreB: 0, status: "UPCOMING", winner: null,
    requires: { match: "GF", winnerSide: "B" },
    hints: ["WB FINALIST", "LB FINALIST"] },
];


/* =============================================================================
   5. ENGINE — turns the data above into a resolved bracket (no DOM here)
   ============================================================================= */
const STATUSES = ["UPCOMING", "LIVE", "COMPLETED"];

function resolveBracket() {
  const st = {};

  for (const m of matches) {
    const fromSource = (i) => {
      const [kind, id] = (m.from?.[i] || "").split(":");
      const s = st[id];
      if (!s) return null;
      return ({ W: s.winner, L: s.loser, A: s.teamA, B: s.teamB })[kind] ?? null;
    };

    let teamA = m.teamA ?? fromSource(0);
    let teamB = m.teamB ?? fromSource(1);

    // Grand Final Reset: dormant unless the required side won the Grand Final.
    let dormant = false;
    let dormantReason = null;
    if (m.requires) {
      const g = st[m.requires.match];
      const side = m.requires.winnerSide === "B" ? g.teamB : g.teamA;
      const required = g.status === "COMPLETED" && g.winner != null && g.winner === side;
      if (!required) {
        dormant = true;
        dormantReason = g.status === "COMPLETED" ? "NOT REQUIRED" : "IF REQUIRED";
        teamA = teamB = null;
      }
    }

    const status = dormant ? "UPCOMING" : (STATUSES.includes(m.status) ? m.status : "UPCOMING");

    // Winner: explicit (slot number or "A"/"B") or inferred from the score.
    // Only honoured once the match is COMPLETED.
    let winner = null;
    if (!dormant && status === "COMPLETED") {
      const w = m.winner;
      if (w === "A") winner = teamA;
      else if (w === "B") winner = teamB;
      else if (w != null) winner = (w === teamA || w === teamB) ? w : null;
      else if (teamA != null && teamB != null && m.scoreA !== m.scoreB) {
        winner = m.scoreA > m.scoreB ? teamA : teamB;
      }
      if (winner == null) {
        console.warn(`[bracket] ${m.id} is COMPLETED but has no valid winner ` +
                     `(check teams, scores or the winner field).`);
      }
    } else if (m.winner != null && !dormant) {
      console.warn(`[bracket] ${m.id} has a winner set but status is ${status}; winner ignored.`);
    }
    const loser = winner == null ? null : (winner === teamA ? teamB : teamA);

    st[m.id] = { ...m, teamA, teamB, status, winner, loser, dormant, dormantReason };
  }

  // Champion: reset winner if a reset was needed, else Grand Final winner when the
  // Winners Bracket finalist (side A) took it.
  let champion = null;
  const gf = st.GF;
  const gfr = st.GFR;
  if (gfr && !gfr.dormant) champion = gfr.winner;
  else if (gf.status === "COMPLETED" && gf.winner != null && gf.winner === gf.teamA) champion = gf.winner;

  return { st, champion };
}


/* =============================================================================
   6. LAYOUT — every card position derives from the bracket structure
   ============================================================================= */
const GEO = {
  PAD_X: 28,
  CARD_W: 208,
  CARD_H: 64,
  GAP_X: 36,           // horizontal gap between columns (connector trunks live here)
  WB_TOP: 76,          // y of first Winners Round of 16 card
  WB_PITCH: 80,
  LB_PITCH: 88,
  LB_GAP: 108,         // space between winners bracket bottom and first losers card
  GRAND_W: 256,
  GRAND_HEAD: 28,
  GRAND_ROW: 46,
  GRAND_GAP: 44,
  CHAMP_H: 176,
};
GEO.PITCH_X = GEO.CARD_W + GEO.GAP_X;
GEO.GRAND_H = GEO.GRAND_HEAD + GEO.GRAND_ROW * 2;
const colX = (c) => GEO.PAD_X + c * GEO.PITCH_X;

function computeLayout() {
  const roundBy = Object.fromEntries(rounds.map((r) => [r.key, r]));
  const matchBy = Object.fromEntries(matches.map((m) => [m.id, m]));
  const pos = {};
  const seen = {};

  const wbBottom = GEO.WB_TOP + 7 * GEO.WB_PITCH + GEO.CARD_H;
  const lbTop = wbBottom + GEO.LB_GAP;

  for (const m of matches) {
    const r = roundBy[m.round];
    if (r.bracket === "final") continue;

    const idx = (seen[r.key] = (seen[r.key] ?? -1) + 1);

    // Same-bracket winner feeders pull this card to their vertical midpoint,
    // which is what makes the fork-shaped connectors line up exactly.
    const feeders = (m.from || [])
      .filter((s) => s.startsWith("W:"))
      .map((s) => s.slice(2))
      .filter((id) => roundBy[matchBy[id].round].bracket === r.bracket);

    let cy;
    if (feeders.length) {
      cy = feeders.reduce((sum, id) => sum + pos[id].y + GEO.CARD_H / 2, 0) / feeders.length;
    } else {
      const top = r.bracket === "winners" ? GEO.WB_TOP : lbTop;
      const pitch = r.bracket === "winners" ? GEO.WB_PITCH : GEO.LB_PITCH;
      cy = top + idx * pitch + GEO.CARD_H / 2;
    }
    pos[m.id] = { x: colX(r.col), y: cy - GEO.CARD_H / 2, w: GEO.CARD_W, h: GEO.CARD_H };
  }

  // Grand Final sits level with the Winners Final so that line runs dead straight.
  const wfCy = pos.WF.y + GEO.CARD_H / 2;
  const gx = colX(6);
  pos.GF = { x: gx, y: wfCy - GEO.GRAND_H / 2, w: GEO.GRAND_W, h: GEO.GRAND_H };
  pos.GFR = { x: gx, y: pos.GF.y + GEO.GRAND_H + GEO.GRAND_GAP, w: GEO.GRAND_W, h: GEO.GRAND_H };
  pos.CHAMP = { x: gx, y: pos.GF.y - GEO.GRAND_GAP - GEO.CHAMP_H, w: GEO.GRAND_W, h: GEO.CHAMP_H };

  const lbBottom = lbTop + 3 * GEO.LB_PITCH + GEO.CARD_H;
  return {
    pos,
    wbBottom,
    lbTop,
    lbBottom,
    width: gx + GEO.GRAND_W + GEO.PAD_X,
    height: lbBottom + 44,
  };
}


/* =============================================================================
   7. RENDER
   ============================================================================= */
const SVGNS = "http://www.w3.org/2000/svg";
const h = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const sv = (tag, attrs = {}) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};
const place = (e, p) => {
  e.style.left = p.x + "px";
  e.style.top = p.y + "px";
  e.style.width = p.w + "px";
  e.style.height = p.h + "px";
};

let canvasSize = { width: 0, height: 0 };

function render() {
  const { st, champion } = resolveBracket();
  const L = computeLayout();
  const roundBy = Object.fromEntries(rounds.map((r) => [r.key, r]));
  const canvas = document.getElementById("canvas");
  canvas.replaceChildren();
  canvas.style.width = L.width + "px";
  canvas.style.height = L.height + "px";
  canvasSize = { width: L.width, height: L.height };

  /* --- layer 0: decorative background art + section rules ------------------ */
  canvas.appendChild(buildDecor(L));
  canvas.appendChild(sectionTitle("WINNERS BRACKET", 12, L.width));
  canvas.appendChild(sectionTitle("LOSERS BRACKET", L.wbBottom + 30, L.width));

  /* --- round labels -------------------------------------------------------- */
  for (const r of rounds) {
    if (r.bracket === "final") continue;
    const lab = h("div", "round-label", r.label);
    place(lab, {
      x: colX(r.col),
      y: (r.bracket === "winners" ? GEO.WB_TOP : L.lbTop) - 30,
      w: GEO.CARD_W,
      h: 18,
    });
    canvas.appendChild(lab);
  }

  /* --- layer 1: connectors ------------------------------------------------- */
  const links = buildLinks();
  const linkSvg = sv("svg", { class: "links", width: L.width, height: L.height, viewBox: `0 0 ${L.width} ${L.height}` });
  const linkEls = {};
  for (const lk of links) {
    if (lk.kind === "L") continue; // loser drops are drawn on hover only
    const a = L.pos[lk.from];
    const b = L.pos[lk.to];
    const ay = a.y + a.h / 2;
    const by = b.y + b.h / 2;
    let d;
    let cls = "conn";
    if (lk.kind === "X") {
      d = `M${a.x + a.w / 2},${a.y + a.h}V${b.y}`;
      cls += " conn--dashed conn--gold";
    } else {
      const midX = b.x - GEO.GAP_X / 2;
      d = ay === by ? `M${a.x + a.w},${ay}H${b.x}` : `M${a.x + a.w},${ay}H${midX}V${by}H${b.x}`;
      if (st[lk.from].winner != null) cls += " conn--done";
      if (lk.to === "GF") cls += " conn--gold";
    }
    const p = sv("path", { d, class: cls });
    linkSvg.appendChild(p);
    (linkEls[`${lk.from}>${lk.to}`] ||= []).push(p);
  }
  // Grand Final -> Champion
  const gfP = L.pos.GF, chP = L.pos.CHAMP;
  linkSvg.appendChild(sv("path", {
    d: `M${gfP.x + gfP.w / 2},${gfP.y}V${chP.y + chP.h}`,
    class: "conn conn--dashed conn--gold" + (champion != null ? " conn--done" : ""),
  }));
  canvas.appendChild(linkSvg);

  /* --- layer 2: match cards ------------------------------------------------ */
  const cardEls = {};
  for (const m of matches) {
    const card = buildMatchCard(st[m.id], L.pos[m.id], roundBy[m.round]);
    cardEls[m.id] = card;
    canvas.appendChild(card);
  }

  /* --- champion + legend --------------------------------------------------- */
  canvas.appendChild(buildChampion(champion, L.pos.CHAMP));
  canvas.appendChild(buildLegend(L));

  /* --- layer 3: hover-only drop lines (loser -> losers bracket) ------------ */
  const dropSvg = sv("svg", { class: "drops", width: L.width, height: L.height, viewBox: `0 0 ${L.width} ${L.height}` });
  canvas.appendChild(dropSvg);

  wireHover({ links, pos: L.pos, cardEls, linkEls, dropSvg });
  fit();
}

/* Every source reference in the match list becomes one link {from, to, kind}. */
function buildLinks() {
  const out = [];
  for (const m of matches) {
    if (!m.from) continue;
    if (m.from.every((s) => s.startsWith("A:") || s.startsWith("B:"))) {
      out.push({ from: m.from[0].split(":")[1], to: m.id, kind: "X" });
      continue;
    }
    m.from.forEach((s) => {
      const [kind, id] = s.split(":");
      out.push({ from: id, to: m.id, kind });
    });
  }
  return out;
}

function sectionTitle(text, y, width) {
  const el = h("div", "section-title");
  el.style.top = y + "px";
  el.style.left = GEO.PAD_X + "px";
  el.style.width = width - GEO.PAD_X * 2 - GEO.GRAND_W - GEO.GAP_X + "px";
  el.appendChild(h("span", null, text));
  return el;
}

/* Decorative concentric "globe" in the empty space beside the Winners Final line. */
function buildDecor(L) {
  const g = L.pos.GF;
  const x0 = colX(4);
  const x1 = g.x - GEO.GAP_X;
  const cx = (x0 + x1) / 2;
  const cy = g.y + g.h / 2;
  const R = 236;

  const svg = sv("svg", { class: "decor", width: L.width, height: L.height, viewBox: `0 0 ${L.width} ${L.height}`, "aria-hidden": "true" });
  const defs = sv("defs");
  const grad = sv("radialGradient", { id: "decorGlow", cx: "50%", cy: "50%", r: "50%" });
  grad.appendChild(sv("stop", { offset: "0%", "stop-color": "#2de2b5", "stop-opacity": "0.10" }));
  grad.appendChild(sv("stop", { offset: "70%", "stop-color": "#2f7bff", "stop-opacity": "0.05" }));
  grad.appendChild(sv("stop", { offset: "100%", "stop-color": "#2f7bff", "stop-opacity": "0" }));
  defs.appendChild(grad);
  const clip = sv("clipPath", { id: "decorClip" });
  clip.appendChild(sv("circle", { cx, cy, r: R }));
  defs.appendChild(clip);
  svg.appendChild(defs);

  svg.appendChild(sv("circle", { cx, cy, r: R * 1.18, fill: "url(#decorGlow)" }));

  const lines = sv("g", { "clip-path": "url(#decorClip)", class: "decor-lines" });
  for (const f of [0.2, 0.4, 0.6, 0.8, 1]) lines.appendChild(sv("circle", { cx, cy, r: R * f }));
  for (const f of [0.28, 0.55, 0.8]) lines.appendChild(sv("ellipse", { cx, cy, rx: R * f, ry: R }));
  for (const f of [-0.66, -0.33, 0, 0.33, 0.66]) {
    const dy = R * f;
    const dx = Math.sqrt(R * R - dy * dy);
    lines.appendChild(sv("line", { x1: cx - dx, y1: cy + dy, x2: cx + dx, y2: cy + dy }));
  }
  svg.appendChild(lines);
  svg.appendChild(sv("circle", { cx, cy, r: R, class: "decor-ring" }));

  const t1 = sv("text", { x: cx, y: cy + 84, class: "decor-word" });
  t1.textContent = "FAUG VEER SANGRAM";
  const t2 = sv("text", { x: cx, y: cy + 106, class: "decor-sub" });
  t2.textContent = "16 TEAMS · DOUBLE ELIMINATION";
  svg.append(t1, t2);
  return svg;
}

/* ---- team pieces --------------------------------------------------------- */
function logoEl(teamId, extra = "") {
  const wrap = h("span", "logo " + extra);
  const t = teamId != null ? teams[teamId] : null;
  if (t && t.logo) {
    const img = document.createElement("img");
    img.src = t.logo;
    img.alt = t.name || "";
    img.draggable = false;
    img.addEventListener("error", () => { img.remove(); wrap.classList.add("is-empty"); });
    wrap.appendChild(img);
  } else {
    wrap.classList.add("is-empty");
  }
  return wrap;
}

function hintText(s, i) {
  const id = i === 0 ? s.teamA : s.teamB;
  if (id != null) return "SLOT " + id;
  if (s.hints) return s.hints[i];
  const [kind, ref] = (s.from?.[i] || "").split(":");
  if (kind === "W") return "WIN " + ref;
  if (kind === "L") return "LOSS " + ref;
  return "";
}

function teamRow(s, i) {
  const id = i === 0 ? s.teamA : s.teamB;
  const t = id != null ? teams[id] : null;
  const row = h("div", "team-row");
  row.dataset.side = i === 0 ? "A" : "B";
  if (s.winner != null && id != null) row.classList.add(id === s.winner ? "is-winner" : "is-loser");

  row.appendChild(logoEl(id));
  row.appendChild(h("span", "team-name", t?.name || ""));
  if (CONFIG.showSlotHints && !(t && t.name)) row.appendChild(h("span", "team-hint", hintText(s, i)));
  row.appendChild(h("span", "score", String(i === 0 ? s.scoreA : s.scoreB)));
  return row;
}

function buildMatchCard(s, p, round) {
  const grand = round.bracket === "final";
  const card = h("article", "match" + (grand ? " match--grand" : ""));
  card.dataset.id = s.id;
  card.dataset.status = s.status;
  if (s.dormant) card.classList.add("is-dormant");
  card.tabIndex = 0;
  card.setAttribute("aria-label", `${round.label} — match ${s.id} — ${s.dormant ? s.dormantReason : s.status}`);
  place(card, p);

  const body = h("div", "teams");
  body.append(teamRow(s, 0), teamRow(s, 1));

  if (grand) {
    const head = h("div", "match-head");
    head.appendChild(h("span", "match-head-title", round.label));
    const tag = s.dormant ? s.dormantReason : (s.status === "LIVE" ? "LIVE" : s.id);
    head.appendChild(h("span", "match-head-tag" + (s.status === "LIVE" ? " is-live" : ""), tag));
    card.append(head, body);
  } else {
    const chip = h("div", "match-id");
    chip.appendChild(h("span", null, s.id));
    card.append(chip, body);
    if (s.status === "LIVE") {
      const badge = h("span", "live-badge");
      badge.append(h("i"), document.createTextNode("LIVE"));
      card.appendChild(badge);
    }
  }

  card.addEventListener("click", () => CONFIG.onMatchClick?.(s.id));
  return card;
}

function buildChampion(championId, p) {
  const box = h("div", "champion" + (championId != null ? " has-champion" : ""));
  place(box, p);
  box.appendChild(h("div", "champion-kicker", "FAUG VEER SANGRAM"));
  box.appendChild(h("div", "champion-label", "CHAMPION"));

  const crest = h("div", "champion-crest");
  if (championId != null) crest.appendChild(logoEl(championId, "logo--xl"));
  else crest.innerHTML =
    '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24v14a12 12 0 0 1-24 0V10Z"/>' +
    '<path d="M20 14h-8c0 9 4 15 10 16M44 14h8c0 9-4 15-10 16"/><path d="M32 36v10M22 54h20M26 46h12v8H26z"/></svg>';
  box.appendChild(crest);

  const name = championId != null ? teams[championId].name : "";
  box.appendChild(h("div", "champion-name", name));
  if (championId == null) box.appendChild(h("div", "champion-tbd", "TO BE DECIDED"));
  return box;
}

function buildLegend(L) {
  const el = h("div", "legend");
  el.style.left = colX(6) + "px";
  el.style.top = L.lbTop + "px";
  el.style.width = GEO.GRAND_W + "px";
  el.innerHTML =
    '<div class="legend-title">KEY</div>' +
    '<div class="legend-row"><i class="dot dot--up"></i>UPCOMING</div>' +
    '<div class="legend-row"><i class="dot dot--live"></i>LIVE</div>' +
    '<div class="legend-row"><i class="dot dot--done"></i>COMPLETED</div>' +
    '<div class="legend-row"><i class="swatch swatch--win"></i>WINNER</div>' +
    '<div class="legend-row"><i class="swatch swatch--lose"></i>ELIMINATED / LOSER</div>' +
    '<div class="legend-note">Hover a match to trace where its winner and loser go.</div>';
  return el;
}


/* =============================================================================
   8. INTERACTION + RESPONSIVE SCALING + PUBLIC API
   ============================================================================= */

/* Hover / focus: highlight connected matches and show where the loser drops. */
function wireHover({ links, pos, cardEls, linkEls, dropSvg }) {
  const clear = () => {
    dropSvg.replaceChildren();
    document.querySelectorAll(".match.is-related, .match.is-focus").forEach((e) => e.classList.remove("is-related", "is-focus"));
    document.querySelectorAll(".conn.hl").forEach((e) => e.classList.remove("hl"));
  };

  const dropPath = (a, b) => {
    const ay = a.y + a.h / 2;
    const by = b.y + b.h / 2;
    if (b.x >= a.x + GEO.PITCH_X - 1) {
      const gx = b.x - GEO.GAP_X / 2;
      return `M${a.x + a.w},${ay}H${gx}V${by}H${b.x}`;
    }
    const gx = a.x + a.w + GEO.GAP_X / 2; // same column: travel down the gutter
    return `M${a.x + a.w},${ay}H${gx}V${by}H${b.x + b.w}`;
  };

  const show = (id) => {
    clear();
    cardEls[id].classList.add("is-focus");
    for (const lk of links) {
      if (lk.from !== id && lk.to !== id) continue;
      const other = lk.from === id ? lk.to : lk.from;
      cardEls[other]?.classList.add("is-related");
      if (lk.kind === "L") {
        dropSvg.appendChild(sv("path", { d: dropPath(pos[lk.from], pos[lk.to]), class: "drop" }));
      } else {
        linkEls[`${lk.from}>${lk.to}`]?.forEach((p) => p.classList.add("hl"));
      }
    }
  };

  for (const id in cardEls) {
    const c = cardEls[id];
    c.addEventListener("mouseenter", () => show(id));
    c.addEventListener("mouseleave", clear);
    c.addEventListener("focus", () => show(id));
    c.addEventListener("blur", clear);
  }
}

/* Desktop: scale the whole canvas to fit the width. Tablet/phone: keep cards at a
   readable size and let the viewport scroll horizontally. */
function fit() {
  const vp = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("canvas");
  if (!canvasSize.width) return;

  let scale = 1;
  if (window.innerWidth >= 1000) {
    scale = Math.min(1.15, Math.max(0.7, vp.clientWidth / canvasSize.width));
  }
  stage.style.width = canvasSize.width * scale + "px";
  stage.style.height = canvasSize.height * scale + "px";
  canvas.style.transform = `scale(${scale})`;
}

let resizeRaf = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(fit);
});

/* Public API — handy from the console now, and for a future edit mode. */
window.Bracket = {
  teams,
  matches,
  rounds,
  config: CONFIG,
  render,
  resolve: resolveBracket,
  setTeam(slot, patch) {
    if (!teams[slot]) throw new Error("Unknown team slot " + slot);
    Object.assign(teams[slot], patch);
    render();
  },
  setMatch(id, patch) {
    const m = matches.find((x) => x.id === id);
    if (!m) throw new Error("Unknown match " + id);
    Object.assign(m, patch);
    render();
  },
};

render();
