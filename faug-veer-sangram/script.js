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
  // (Section 9 sets this when an admin is logged in.)
  onMatchClick: null,

  // How long the winner banner stays on screen, in milliseconds.
  announceMs: 6000,

  // Champion celebration: how long it stays up, and how long before the confetti starts.
  championMs: 22000,
  confettiDelayMs: 2500,

  // Live results + admin mode (section 9). Leave both blank to run as a plain
  // static page that only shows the data in this file. Both values are public by
  // design: the anon key can only do what the database's row-level security allows.
  supabase: {
    url: "https://vzpknujqblclxlsncmtj.supabase.co",
    anonKey: "sb_publishable_P4ukKrZ76O4qy4m0VUaLQQ_j_JcFOs7", // publishable key (safe in a browser; never the secret key)
  },
};


/* =============================================================================
   2. TEAMS   (16 empty slots — fill in later)
   `logo` can be any image path/URL. Transparent PNGs work best.
   ============================================================================= */
const teams = {
  1:  { name: "Thunder Hawks", logo: "" },
  2:  { name: "Iron Wolves", logo: "" },
  3:  { name: "Shadow Blades", logo: "" },
  4:  { name: "Crimson Tigers", logo: "" },
  5:  { name: "Storm Riders", logo: "" },
  6:  { name: "Night Falcons", logo: "" },
  7:  { name: "Golden Eagles", logo: "" },
  8:  { name: "Frost Giants", logo: "" },
  9:  { name: "Viper Squad", logo: "" },
  10: { name: "Steel Titans", logo: "" },
  11: { name: "Phantom Kings", logo: "" },
  12: { name: "Blaze Rangers", logo: "" },
  13: { name: "Royal Cobras", logo: "" },
  14: { name: "Neon Raiders", logo: "" },
  15: { name: "Desert Lions", logo: "" },
  16: { name: "Silent Reapers", logo: "" },
};


/* =============================================================================
   3. ROUNDS
   `col` is the horizontal column. Winners and losers share the same columns.
   ============================================================================= */
// `order` is the running order of play across both brackets (shown as "ROUND N" beside each name).
const rounds = [
  { key: "WR16", label: "WINNERS ROUND OF 16",   bracket: "winners", col: 0, order: 1 },
  { key: "WQF",  label: "WINNERS QUARTERFINALS", bracket: "winners", col: 1, order: 3 },
  { key: "WSF",  label: "WINNERS SEMIFINALS",    bracket: "winners", col: 2, order: 6 },
  { key: "WF",   label: "WINNERS FINAL",         bracket: "winners", col: 4, order: 9 },

  { key: "LR1",  label: "LOSERS ROUND 1",        bracket: "losers",  col: 1, order: 2 },
  { key: "LR2",  label: "LOSERS ROUND 2",        bracket: "losers",  col: 2, order: 4 },
  { key: "LR3",  label: "LOSERS ROUND 3",        bracket: "losers",  col: 3, order: 5 },
  { key: "LQF",  label: "LOSERS QUARTERFINAL",   bracket: "losers",  col: 4, order: 7 },
  { key: "LSF",  label: "LOSERS SEMIFINAL",      bracket: "losers",  col: 5, order: 8 },
  { key: "LF",   label: "LOSERS FINAL",          bracket: "losers",  col: 6, order: 10 },

  { key: "GF",   label: "GRAND FINAL",           bracket: "final", order: 11 },
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
/* ---- display mode (read from the address after the #) ---------------------------
     #stream                  whole bracket scaled to fit the screen, no scrolling
     #stream&view=rotate      alternates winners / losers full-screen (&every=15 seconds)
     #stream&view=winners     (or losers) pin one half
     #stream&bg=clear         transparent page background, for overlays in OBS
     #stream&veil=0.4         how much the background art is darkened (0 = none, 1 = black)
     #stream&logo=off         hide the logo watermark in the stream
     #admin                   shows the admin log-in (see section 9)
   Options combine with &, for example  #stream&view=rotate&bg=clear                  */
const MODE = { stream: false, view: "all", rotate: false, every: 15, clear: false, veil: null };
const hashParams = () => new URLSearchParams(location.hash.slice(1));

function readMode() {
  const p = hashParams();
  const v = p.get("view");
  MODE.stream = p.has("stream");
  MODE.clear = p.get("bg") === "clear";
  MODE.rotate = MODE.stream && v === "rotate";
  MODE.every = Math.min(120, Math.max(5, parseInt(p.get("every"), 10) || 15));
  const veil = parseFloat(p.get("veil"));
  MODE.veil = Number.isFinite(veil) ? Math.min(1, Math.max(0, veil)) : null;
  MODE.view = !MODE.stream ? "all" : MODE.rotate ? "winners" : (v === "winners" || v === "losers") ? v : "all";
}

const GEO_BASE = {
  PAD_X: 28,
  CARD_W: 220,
  CARD_H: 64,
  GAP_X: 28,           // horizontal gap between columns (connector trunks live here)
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
// Tighter sizes for stream mode so a whole 16:9 frame fits without scrolling.
const GEO_STREAM = { CARD_H: 56, WB_TOP: 56, WB_PITCH: 64, LB_GAP: 76, LB_PITCH: 70, GRAND_GAP: 36, CHAMP_H: 160, GAP_X: 22, GRAND_W: 236 };

const GEO = {};
function applyGeo() {
  Object.assign(GEO, GEO_BASE);
  if (MODE.stream) Object.assign(GEO, GEO_STREAM);
  if (MODE.stream && MODE.view === "losers") GEO.LB_PITCH = 170; // only 4 rows, so use the height
  GEO.PITCH_X = GEO.CARD_W + GEO.GAP_X;
  GEO.GRAND_H = GEO.GRAND_HEAD + GEO.GRAND_ROW * 2;
}
const colX = (c) => GEO.PAD_X + c * GEO.PITCH_X;

function computeLayout() {
  const view = MODE.view;                       // "all" | "winners" | "losers"
  const roundBy = Object.fromEntries(rounds.map((r) => [r.key, r]));
  const matchBy = Object.fromEntries(matches.map((m) => [m.id, m]));
  const pos = {};
  const seen = {};

  const wbBottom = GEO.WB_TOP + 7 * GEO.WB_PITCH + GEO.CARD_H;
  const lbTop = view === "losers" ? GEO.WB_TOP : wbBottom + GEO.LB_GAP;

  // Column of a round. The half views pull their bracket in so nothing is left empty.
  const colOf = (r) => view === "winners" ? (r.key === "WF" ? 3 : r.col)
                     : view === "losers" ? r.col - 1
                     : r.col;

  for (const m of matches) {
    const r = roundBy[m.round];
    if (r.bracket === "final") continue;
    if (view !== "all" && r.bracket !== view) continue;   // not part of this view

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
    pos[m.id] = { x: colX(colOf(r)), y: cy - GEO.CARD_H / 2, w: GEO.CARD_W, h: GEO.CARD_H };
  }

  // Grand Final sits on the far right. With both brackets showing it is centred between
  // the Winners Final and the Losers Final (L14), so one trunk line serves both.
  // The half views put it level with the final on show.
  const cyWF = view === "losers" ? null : pos.WF.y + GEO.CARD_H / 2;
  const cyLF = view === "winners" ? null : pos.L14.y + GEO.CARD_H / 2;
  const gx = colX(view === "winners" ? 4 : view === "losers" ? 6 : 7);
  const cyGF = cyWF != null && cyLF != null ? (cyWF + cyLF) / 2 : (cyWF ?? cyLF);
  pos.GF = { x: gx, y: cyGF - GEO.GRAND_H / 2, w: GEO.GRAND_W, h: GEO.GRAND_H };
  pos.GFR = { x: gx, y: pos.GF.y + GEO.GRAND_H + GEO.GRAND_GAP, w: GEO.GRAND_W, h: GEO.GRAND_H };
  // Champion at the top right when everything is showing; above the Grand Final otherwise.
  const champY = view === "all" ? GEO.WB_TOP : pos.GF.y - GEO.GRAND_GAP - GEO.CHAMP_H;
  pos.CHAMP = { x: gx, y: champY, w: GEO.GRAND_W, h: GEO.CHAMP_H };

  // Keep everything below the round labels; the half views can push the Champion box up.
  const topMin = GEO.WB_TOP - 48;
  const minY = Math.min(...Object.values(pos).map((p) => p.y));
  const dy = minY < topMin ? topMin - minY : 0;
  if (dy) for (const p of Object.values(pos)) p.y += dy;

  const bottom = Math.max(...Object.values(pos).map((p) => p.y + p.h));
  return {
    pos,
    dy,
    wbBottom: wbBottom + dy,
    lbTop: lbTop + dy,
    cols: Object.fromEntries(rounds.map((r) => [r.key, colOf(r)])),
    width: gx + GEO.GRAND_W + GEO.PAD_X,
    height: bottom + (MODE.stream ? 20 : 44),
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
  renderOnAir(st);
  detectResults(st);
  const canvas = document.getElementById("canvas");
  canvas.replaceChildren();
  canvas.style.width = L.width + "px";
  canvas.style.height = L.height + "px";
  canvasSize = { width: L.width, height: L.height };

  /* --- layer 0: decorative background art + section rules ------------------ */
  if (MODE.view === "all") canvas.appendChild(buildDecor(L));
  if (!MODE.stream) {
    canvas.appendChild(sectionTitle("WINNERS BRACKET", 12, L.width));
    canvas.appendChild(sectionTitle("LOSERS BRACKET", L.wbBottom + 30, L.width));
  }

  /* --- round labels -------------------------------------------------------- */
  for (const r of rounds) {
    if (r.bracket === "final") continue;
    if (MODE.view !== "all" && r.bracket !== MODE.view) continue;
    const lab = h("div", "round-label");
    lab.append(h("span", "round-no", "ROUND " + r.order), h("span", "round-name", r.label));
    place(lab, {
      x: colX(L.cols[r.key]),
      y: (r.bracket === "winners" ? GEO.WB_TOP + L.dy : L.lbTop) - 42,
      w: GEO.CARD_W,
      h: 30,
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
    if (!a || !b) continue;        // one end is not part of this view
    const ay = a.y + a.h / 2;
    const by = b.y + b.h / 2;
    let d;
    let cls = "conn";
    if (lk.kind === "X") {
      d = `M${a.x + a.w / 2},${a.y + a.h}V${b.y}`;
      cls += " conn--dashed conn--gold";
    } else {
      const jump = b.x - (a.x + a.w);
      const midX = lk.to !== "GF" && jump > GEO.GAP_X * 3 ? a.x + a.w + jump / 2 : b.x - GEO.GAP_X / 2;
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
    if (!L.pos[m.id]) continue;    // not part of this view
    const card = buildMatchCard(st[m.id], L.pos[m.id], roundBy[m.round]);
    cardEls[m.id] = card;
    canvas.appendChild(card);
  }

  /* --- champion + legend --------------------------------------------------- */
  canvas.appendChild(buildChampion(champion, L.pos.CHAMP));
  if (!MODE.stream) canvas.appendChild(buildLegend(L));

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
  const wf = L.pos.WF;
  const x0 = wf.x + wf.w + GEO.GAP_X;
  const x1 = g.x - GEO.GAP_X;
  const cx = (x0 + x1) / 2;
  const cy = wf.y + wf.h / 2;
  const R = Math.min(236, (x1 - x0) / 2 - 6);

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
  const nameEl = h("span", "team-name", t?.name || "");
  if (t?.name) nameEl.title = t.name; // full name on hover when the card truncates it
  row.appendChild(nameEl);
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
    const headName = h("span", "match-head-title", round.label);
    if (round.order) headName.appendChild(h("small", "head-round", "ROUND " + round.order));
    head.appendChild(headName);
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

  if (CONFIG.onMatchClick) card.classList.add("is-editable");
  card.addEventListener("click", () => CONFIG.onMatchClick?.(s.id));
  return card;
}

/* Team name for a slot, falling back to "Slot 5" or "WIN W1" while it is undecided. */
function teamLabel(s, i) {
  const id = i === 0 ? s.teamA : s.teamB;
  return id != null ? (teams[id].name || "Slot " + id) : (hintText(s, i) || "TBD");
}

/* "Live now" and "Up next" strip in the page header (and the stream's title strip).
   Up next = matches still to play whose two teams are both known, in bracket order. */
function renderOnAir(st) {
  const host = document.querySelector(".hero-inner");
  if (!host) return;
  let bar = document.getElementById("onair");
  if (!bar) {
    bar = h("div", "onair");
    bar.id = "onair";
    host.appendChild(bar);
  }
  bar.replaceChildren();

  const all = matches.map((m) => st[m.id]);
  const live = all.filter((s) => s.status === "LIVE" && !s.dormant);
  const next = all.filter((s) => s.status === "UPCOMING" && !s.dormant && s.teamA != null && s.teamB != null).slice(0, 3);

  const group = (label, cls, list) => {
    if (!list.length) return;
    const g = h("div", "onair-group " + cls);
    g.appendChild(h("span", "onair-tag", label));
    for (const s of list) {
      const item = h("span", "onair-item");
      item.appendChild(h("b", null, s.id));
      item.appendChild(document.createTextNode(` ${teamLabel(s, 0)} v ${teamLabel(s, 1)}`));
      g.appendChild(item);
    }
    bar.appendChild(g);
  };
  group("LIVE", "is-live", live);
  group("NEXT", "is-next", next);
  bar.hidden = bar.childNodes.length === 0;
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
  el.style.left = colX(0) + "px";
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
        if (!pos[lk.from] || !pos[lk.to]) continue;
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
  if (MODE.stream) {
    const hero = document.querySelector(".hero");
    const availH = window.innerHeight - (hero ? hero.offsetHeight : 0);
    scale = Math.min(window.innerWidth / canvasSize.width, availH / canvasSize.height);
  } else if (window.innerWidth >= 1000) {
    scale = Math.min(1.15, Math.max(0.64, vp.clientWidth / canvasSize.width));
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


/* =============================================================================
   9. LIVE RESULTS + ADMIN MODE
   -----------------------------------------------------------------------------
   Talks to Supabase over plain fetch (no library). Needs CONFIG.supabase filled in
   and the table from supabase-setup.sql. The database holds one JSON document with
   the teams (name, logo) and each match's scoreA / scoreB / status / winner. It
   overrides the defaults in this file.

   Everyone can READ it; only the admin login can WRITE (enforced by row-level
   security in the database, not by this page). The admin opens the page with
   #admin on the end of the address, logs in, then clicks a match to edit it.
   ============================================================================= */
const LIVE = { enabled: false, session: null, lastStamp: null, timer: 0, busy: false, synced: false };
const SESSION_KEY = "fvs-admin-session";
const POLL_MS = 8000;
const RESULT_FIELDS = ["scoreA", "scoreB", "status", "winner"];

async function sb(path, { method = "GET", body, token, prefer } = {}) {
  const headers = { apikey: CONFIG.supabase.anonKey };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(CONFIG.supabase.url.replace(/\/+$/, "") + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) throw new Error(json?.error_description || json?.msg || json?.message || text || res.statusText);
  return json;
}

/* ---- state <-> document ---------------------------------------------------- */
function snapshot() {
  return {
    teams: JSON.parse(JSON.stringify(teams)),
    matches: Object.fromEntries(matches.map((m) => [m.id, {
      scoreA: m.scoreA, scoreB: m.scoreB, status: m.status, winner: m.winner ?? null,
    }])),
  };
}

function applyState(doc) {
  if (!doc || typeof doc !== "object") return;
  for (const [slot, t] of Object.entries(doc.teams || {})) {
    if (!teams[slot] || !t) continue;
    teams[slot].name = String(t.name ?? "");
    teams[slot].logo = String(t.logo ?? "");
  }
  for (const [id, r] of Object.entries(doc.matches || {})) {
    const m = matches.find((x) => x.id === id);
    if (!m || !r) continue;
    for (const f of RESULT_FIELDS) if (f in r) m[f] = r[f];
    m.scoreA = Number.isFinite(+m.scoreA) ? +m.scoreA : 0;
    m.scoreB = Number.isFinite(+m.scoreB) ? +m.scoreB : 0;
  }
}

async function pull() {
  const rows = await sb("/rest/v1/fvs_state?id=eq.bracket&select=data,updated_at");
  const row = rows?.[0];
  if (!row || row.updated_at === LIVE.lastStamp) return false;
  LIVE.lastStamp = row.updated_at;
  applyState(row.data);
  return true;
}

async function refresh() {
  if (LIVE.busy) return;          // never redraw under an open editor
  try {
    const changed = await pull();
    const first = !LIVE.synced;
    LIVE.synced = true;                 // from now on, new results are announced
    if (changed || first) render();
  } catch (e) { console.warn("[live] could not load results:", e.message); }
}

/* ---- admin session --------------------------------------------------------- */
function persistSession(s) {
  LIVE.session = s;
  try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify(s)) : localStorage.removeItem(SESSION_KEY); } catch { /* storage blocked */ }
}

function setSession(s) {
  persistSession(s);
  CONFIG.onMatchClick = s ? openMatchEditor : null;
  renderAdminBar();
  render();
}

const toSession = (r, email) => ({
  access: r.access_token, refresh: r.refresh_token,
  expires: Date.now() + r.expires_in * 1000, email: r.user?.email || email,
});

async function login(email, password) {
  const r = await sb("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  setSession(toSession(r, email));
}

async function freshToken() {
  const s = LIVE.session;
  if (!s) throw new Error("Not logged in.");
  if (Date.now() < s.expires - 60000) return s.access;
  try {
    const r = await sb("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: { refresh_token: s.refresh } });
    persistSession(toSession(r, s.email));
    return LIVE.session.access;
  } catch {
    setSession(null);
    throw new Error("Your admin session expired. Log in again.");
  }
}

async function pushState() {
  const token = await freshToken();
  const stamp = new Date().toISOString();
  await sb("/rest/v1/fvs_state?on_conflict=id", {
    method: "POST", token, prefer: "resolution=merge-duplicates,return=minimal",
    body: { id: "bracket", data: snapshot(), updated_at: stamp },
  });
  LIVE.lastStamp = stamp;
}

/* ---- tiny UI kit ----------------------------------------------------------- */
function openModal(title, build) {
  const back = h("div", "modal-back");
  const box = h("div", "modal");
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", title);
  const head = h("div", "modal-head");
  head.appendChild(h("h2", null, title));
  const x = h("button", "modal-x", "×");
  x.type = "button";
  x.setAttribute("aria-label", "Close");
  head.appendChild(x);
  box.appendChild(head);
  back.appendChild(box);
  document.body.appendChild(back);
  LIVE.busy = true;

  const onKey = (e) => { if (e.key === "Escape") close(); };
  function close() {
    document.removeEventListener("keydown", onKey);
    back.remove();
    LIVE.busy = false;
  }
  document.addEventListener("keydown", onKey);
  back.addEventListener("mousedown", (e) => { if (e.target === back) close(); });
  x.addEventListener("click", close);
  build(box, close);
  box.querySelector("input, select")?.focus();
  return close;
}

function field(label, input) {
  const wrap = h("label", "field");
  wrap.appendChild(h("span", "field-label", label));
  wrap.appendChild(input);
  return wrap;
}

function input(type, value, attrs = {}) {
  const el = document.createElement(type === "select" ? "select" : "input");
  if (type !== "select") el.type = type;
  if (value != null && type !== "select") el.value = value;
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
}

function button(label, cls, type = "button") {
  const b = h("button", "btn " + (cls || ""), label);
  b.type = type;
  return b;
}

/* Runs `work`, shows its error in `msg`, keeps the buttons usable. */
async function guarded(form, msg, work) {
  const buttons = [...form.querySelectorAll("button")];
  buttons.forEach((b) => (b.disabled = true));
  msg.textContent = "";
  msg.hidden = true;
  try { await work(); } catch (e) { msg.textContent = e.message; msg.hidden = false; }
  buttons.forEach((b) => (b.disabled = false));
}

/* ---- dialogs --------------------------------------------------------------- */
function openLogin() {
  openModal("Admin log in", (box, close) => {
    const form = h("form", "modal-form");
    const email = input("email", "", { autocomplete: "username", required: "" });
    const pass = input("password", "", { autocomplete: "current-password", required: "" });
    const msg = h("p", "form-msg");
    msg.hidden = true;
    const go = button("Log in", "btn--primary", "submit");
    form.append(field("Email", email), field("Password", pass), msg, go);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      guarded(form, msg, async () => { await login(email.value.trim(), pass.value); close(); });
    });
    box.appendChild(form);
  });
}

function openMatchEditor(id) {
  const m = matches.find((x) => x.id === id);
  const st = resolveBracket().st[id];
  if (!m || !st) return;
  if (st.dormant) { return; }          // the Reset match is only editable once it is required

  const label = (i) => {
    const t = i === 0 ? st.teamA : st.teamB;
    return t != null ? (teams[t].name || "Slot " + t) : (hintText(st, i) || "TBD");
  };
  const nameA = label(0), nameB = label(1);
  const prev = { scoreA: m.scoreA, scoreB: m.scoreB, status: m.status, winner: m.winner };

  openModal(`Match ${id}`, (box, close) => {
    const form = h("form", "modal-form");
    const sa = input("number", m.scoreA, { min: "0", max: "99", step: "1", inputmode: "numeric" });
    const sb2 = input("number", m.scoreB, { min: "0", max: "99", step: "1", inputmode: "numeric" });
    const status = input("select");
    for (const s of STATUSES) status.appendChild(new Option(s, s, false, s === m.status));
    const win = input("select");
    win.appendChild(new Option("Decide by score", ""));
    win.appendChild(new Option(nameA, "A"));
    win.appendChild(new Option(nameB, "B"));
    win.value = m.winner === "A" || (m.winner != null && m.winner === st.teamA) ? "A"
              : m.winner === "B" || (m.winner != null && m.winner === st.teamB) ? "B" : "";

    const scores = h("div", "field-row");
    scores.append(field(nameA + " score", sa), field(nameB + " score", sb2));
    const msg = h("p", "form-msg");
    msg.hidden = true;
    const note = h("p", "form-note", "Set the status to COMPLETED for the winner to advance.");
    const actions = h("div", "modal-actions");
    const cancel = button("Cancel", "btn--ghost");
    const save = button("Save", "btn--primary", "submit");
    cancel.addEventListener("click", close);
    actions.append(cancel, save);
    form.append(scores, field("Status", status), field("Winner", win), note, msg, actions);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      guarded(form, msg, async () => {
        const a = Math.trunc(+sa.value), b = Math.trunc(+sb2.value);
        if (!(a >= 0 && a <= 99 && b >= 0 && b <= 99)) throw new Error("Scores must be whole numbers from 0 to 99.");
        Object.assign(m, { scoreA: a, scoreB: b, status: status.value, winner: win.value || null });
        try { await pushState(); } catch (err) { Object.assign(m, prev); throw err; }
        render();
        close();
      });
    });
    box.appendChild(form);
  });
}

function openTeamsEditor() {
  const prev = JSON.parse(JSON.stringify(teams));
  openModal("Teams", (box, close) => {
    const form = h("form", "modal-form");
    const list = h("div", "teams-grid");
    const rows = Object.keys(teams).map((slot) => {
      const name = input("text", teams[slot].name, { maxlength: "40", placeholder: "Team name", "aria-label": `Slot ${slot} name` });
      const logo = input("text", teams[slot].logo, { placeholder: "Logo URL (optional)", "aria-label": `Slot ${slot} logo URL` });
      list.append(h("span", "slot-no", String(slot)), name, logo);
      return { slot, name, logo };
    });
    const msg = h("p", "form-msg");
    msg.hidden = true;
    const note = h("p", "form-note", "Logos: paste an image address, for example assets/team1.png or a full https:// link.");
    const actions = h("div", "modal-actions");
    const cancel = button("Cancel", "btn--ghost");
    const save = button("Save teams", "btn--primary", "submit");
    cancel.addEventListener("click", close);
    actions.append(cancel, save);
    form.append(list, note, msg, actions);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      guarded(form, msg, async () => {
        for (const r of rows) Object.assign(teams[r.slot], { name: r.name.value.trim(), logo: r.logo.value.trim() });
        try { await pushState(); } catch (err) {
          for (const r of rows) Object.assign(teams[r.slot], prev[r.slot]);
          throw err;
        }
        render();
        close();
      });
    });
    box.appendChild(form);
  });
}

/* ---- admin bar (hidden from the public unless the address ends in #admin) --- */
function renderAdminBar() {
  let bar = document.getElementById("adminBar");
  if (!bar) {
    bar = h("div", "admin-bar");
    bar.id = "adminBar";
    document.body.appendChild(bar);
  }
  bar.replaceChildren();
  bar.hidden = true;
  if (!LIVE.enabled) return;

  if (LIVE.session) {
    const teamsBtn = button("Teams", "btn--ghost");
    const testBtn = button("Test celebration", "btn--ghost");
    const out = button("Log out", "btn--ghost");
    teamsBtn.addEventListener("click", openTeamsEditor);
    testBtn.addEventListener("click", () => celebrateDemo());
    out.addEventListener("click", () => setSession(null));
    bar.append(h("span", "admin-tag", "ADMIN"), h("span", "admin-hint", "Click a match to edit it"), teamsBtn, testBtn, out);
    bar.hidden = false;
  } else if (hashParams().has("admin")) {
    const inBtn = button("Admin log in", "btn--primary");
    inBtn.addEventListener("click", openLogin);
    bar.appendChild(inBtn);
    bar.hidden = false;
  }
}
window.addEventListener("hashchange", renderAdminBar);

function startLive() {
  const c = CONFIG.supabase;
  if (!c.url || !c.anonKey) return;       // not configured: stay a static page
  LIVE.enabled = true;
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (saved && saved.refresh) { LIVE.session = saved; CONFIG.onMatchClick = openMatchEditor; }
  } catch { /* ignore */ }
  renderAdminBar();
  refresh().then(() => { if (LIVE.session) render(); });
  clearInterval(LIVE.timer);
  LIVE.timer = setInterval(refresh, POLL_MS);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
}

/* =============================================================================
   10. WINNER BANNER
   -----------------------------------------------------------------------------
   When a match becomes COMPLETED with a winner while the page is open (a live
   update from the database, or the admin saving), a banner slides in for a few
   seconds: who won, the score, and where the winner and loser go next. Results
   that were already there when the page loaded are never announced. Several
   results at once play one after another.
   ============================================================================= */
const ANNOUNCE = { prev: null, queue: [], showing: false };

function detectResults(st) {
  if (!LIVE.synced) return;                       // no baseline yet (still loading, or not connected)
  const now = {};
  for (const s of Object.values(st)) now[s.id] = s.status === "COMPLETED" && s.winner != null ? s.winner : null;
  const prev = ANNOUNCE.prev;
  ANNOUNCE.prev = now;
  if (!prev) return;                              // first look: this is the baseline
  for (const m of matches) {
    if (now[m.id] == null || now[m.id] === prev[m.id]) continue;
    const info = resultInfo(st, m.id);
    if (info.champion) celebrate(info); else enqueueBanner(info);
  }
}

function resultInfo(st, id) {
  const s = st[id];
  const winnerIsA = s.winner === s.teamA;
  const side = (w) => (w ? 0 : 1);
  const winnerName = teamLabel(s, side(winnerIsA));
  const loserName = teamLabel(s, side(!winnerIsA));
  const wScore = winnerIsA ? s.scoreA : s.scoreB;
  const lScore = winnerIsA ? s.scoreB : s.scoreA;
  const score = wScore || lScore ? `${wScore}–${lScore}` : "";

  const roundName = (matchId) => {
    const m = matches.find((x) => x.id === matchId);
    return rounds.find((r) => r.key === m.round)?.label || matchId;
  };
  const nextWin = matches.find((x) => x.from?.includes("W:" + id));
  const nextLose = matches.find((x) => x.from?.includes("L:" + id));

  let tag = "MATCH RESULT", line1 = "", line2 = "", champion = false;
  if (id === "GFR" || (id === "GF" && winnerIsA)) {
    tag = "CHAMPIONS"; champion = true; line1 = "TOURNAMENT CHAMPIONS";
  } else if (id === "GF") {
    line1 = "FORCES A GRAND FINAL RESET";        // the losers-bracket team won, so it is not over yet
  } else if (nextWin) {
    line1 = `ADVANCES TO ${roundName(nextWin.id)} · ${nextWin.id}`;
  }
  if (id !== "GF" && id !== "GFR") {
    line2 = nextLose ? `${loserName} DROPS TO ${nextLose.id}` : `${loserName} ELIMINATED`;
  }
  const winnerTeam = s.winner;
  return { id, tag, winnerName, score, line1, line2, champion, winnerTeam };
}

function enqueueBanner(info) {
  ANNOUNCE.queue.push(info);
  if (ANNOUNCE.queue.length > 4) ANNOUNCE.queue.shift();
  if (!ANNOUNCE.showing) playNextBanner();
}

function playNextBanner() {
  const info = ANNOUNCE.queue.shift();
  if (!info) { ANNOUNCE.showing = false; return; }
  ANNOUNCE.showing = true;

  const el = h("div", "announce" + (info.champion ? " is-champion" : ""));
  el.setAttribute("role", "status");
  const t = teams[info.winnerTeam];
  if (t && t.logo) el.appendChild(logoEl(info.winnerTeam, "logo--banner"));
  const body = h("div", "announce-body");
  body.appendChild(h("span", "announce-tag", info.tag));
  const main = h("div", "announce-main");
  main.appendChild(h("b", null, info.id));
  main.appendChild(document.createTextNode(` ${info.winnerName} `));
  main.appendChild(h("i", null, info.score ? `WIN ${info.score}` : "WIN"));
  body.appendChild(main);
  if (info.line1) body.appendChild(h("div", "announce-sub", info.line1));
  if (info.line2) body.appendChild(h("div", "announce-sub is-out", info.line2));
  el.appendChild(body);
  document.body.appendChild(el);

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  setTimeout(() => {
    el.classList.remove("is-in");
    setTimeout(() => { el.remove(); playNextBanner(); }, 600);
  }, CONFIG.announceMs);
}

/* =============================================================================
   11. CHAMPION CELEBRATION
   -----------------------------------------------------------------------------
   When the final result decides a champion while the page is open: a full-screen
   "CONGRATULATIONS" with the team name in the centre, golden rays, and, after a
   few seconds, confetti that keeps bursting until the celebration ends
   (CONFIG.championMs). Click anywhere to close it early. Admins can rehearse it
   with the "Test celebration" button. Results already there at load never trigger it.
   ============================================================================= */
const CELEB = { el: null, raf: 0, timers: [], parts: [] };

function celebrate(info) {
  endCelebration(true);
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const el = h("div", "celebrate");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", "Champions");
  el.append(h("div", "celebrate-rays"), h("div", "celebrate-glow"));
  const canvas = document.createElement("canvas");
  canvas.className = "celebrate-confetti";

  const card = h("div", "celebrate-card");
  card.appendChild(h("div", "celebrate-kicker", "FAUG VEER SANGRAM"));
  card.appendChild(h("div", "celebrate-title", "CONGRATULATIONS"));
  const t = teams[info.winnerTeam];
  if (t && t.logo) {
    card.appendChild(logoEl(info.winnerTeam, "logo--celebrate"));
  } else {
    const trophy = h("div", "celebrate-trophy");
    trophy.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 10h24v14a12 12 0 0 1-24 0V10Z"/><path d="M20 14h-8c0 9 4 15 10 16M44 14h8c0 9-4 15-10 16"/><path d="M32 36v10M22 54h20M26 46h12v8H26z"/></svg>';
    card.appendChild(trophy);
  }
  card.appendChild(h("div", "celebrate-name", info.winnerName));
  card.appendChild(h("div", "celebrate-sub", "TOURNAMENT CHAMPIONS"));
  const showBtn = h("button", "celebrate-btn", "SHOW LEADERBOARD");
  showBtn.type = "button";
  card.appendChild(showBtn);
  el.append(canvas, card);
  document.body.appendChild(el);
  CELEB.el = el;
  el.addEventListener("click", () => endCelebration());
  CELEB.onKey = (e) => { if (e.key === "Escape") endCelebration(); };
  document.addEventListener("keydown", CELEB.onKey);

  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  if (!reduce) CELEB.timers.push(setTimeout(() => startConfetti(canvas), CONFIG.confettiDelayMs));
  CELEB.timers.push(setTimeout(() => endCelebration(), reduce ? 9000 : CONFIG.championMs));
}

function endCelebration(immediate) {
  if (CELEB.onKey) { document.removeEventListener("keydown", CELEB.onKey); CELEB.onKey = null; }
  CELEB.timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
  CELEB.timers = [];
  cancelAnimationFrame(CELEB.raf);
  CELEB.parts = [];
  const el = CELEB.el;
  CELEB.el = null;
  if (!el) return;
  if (immediate) { el.remove(); return; }
  el.classList.remove("is-in");
  setTimeout(() => el.remove(), 900);
}

function startConfetti(canvas) {
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, k = 1;
  const fitCanvas = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    k = Math.max(0.6, H / 900);               // everything scales with the screen
  };
  fitCanvas();

  const colors = ["#f4c04e", "#ffe3a1", "#2de2b5", "#ffffff", "#ff5468", "#47a7ff"];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const parts = CELEB.parts;
  const add = (x, y, ang, speed) => {
    if (parts.length > 900) return;
    parts.push({
      x, y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      w: rnd(7, 14) * k, h: rnd(5, 9) * k, rot: rnd(0, 6.28), vr: rnd(-9, 9),
      tilt: rnd(0, 6.28), vt: rnd(4, 10), color: colors[(Math.random() * colors.length) | 0],
      round: Math.random() < 0.25, life: rnd(3.2, 5.2), age: 0,
    });
  };
  const cannon = (side, n) => {                // from a bottom corner, up and across
    for (let i = 0; i < n; i++) {
      const ang = (side < 0 ? -Math.PI * 0.36 : -Math.PI * 0.64) + rnd(-0.38, 0.38);
      add(side < 0 ? -10 : W + 10, H * 0.98, ang, rnd(0.95, 1.7) * H * 0.95);
    }
  };
  const pop = (n) => {                         // a round burst in the upper half
    const cx = rnd(W * 0.15, W * 0.85), cy = rnd(H * 0.15, H * 0.5);
    for (let i = 0; i < n; i++) add(cx, cy, rnd(0, 6.28), rnd(0.15, 0.7) * H);
  };

  const scale = Math.min(1.4, Math.max(0.6, (W * H) / (1920 * 1080)));
  const big = () => { cannon(-1, 170 * scale | 0); cannon(1, 170 * scale | 0); pop(140 * scale | 0); };
  big();
  let n = 0;
  CELEB.timers.push(setInterval(() => {
    n++;
    if (n % 3 === 0) { cannon(-1, 85 * scale | 0); cannon(1, 85 * scale | 0); } else pop(110 * scale | 0);
  }, 850));

  let last = performance.now();
  const tick = (now) => {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    const g = 1250 * k, drag = Math.pow(0.42, dt);   // gravity, and air drag per second
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life || p.y > H + 40) { parts.splice(i, 1); continue; }
      p.vy += g * dt; p.vx *= drag; p.vy *= drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt; p.tilt += p.vt * dt;
      const left = p.life - p.age;
      ctx.globalAlpha = left < 0.8 ? Math.max(0, left / 0.8) : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.tilt)) * 0.9 + 0.1);   // flutter
      ctx.fillStyle = p.color;
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.h * 0.6, 0, 6.283); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    CELEB.raf = requestAnimationFrame(tick);
  };
  CELEB.raf = requestAnimationFrame(tick);
  window.addEventListener("resize", fitCanvas, { once: true });
}

/* Rehearsal: uses the real champion if there is one, otherwise a named team. */
function celebrateDemo() {
  const { st, champion } = resolveBracket();
  const id = champion ?? Number(Object.keys(teams).find((k) => teams[k].name) || 1);
  const name = champion != null || teams[id]?.name ? teamLabel({ teamA: id, teamB: id }, 0) : "TEAM NAME";
  celebrate({ id: "GF", winnerTeam: id, winnerName: name, champion: true });
}

window.Bracket.celebrate = celebrateDemo;
window.Bracket.live = { start: startLive, refresh, snapshot, state: LIVE };

/* ---- mode switching + rotation ------------------------------------------------- */
let rotateTimer = 0;

function setupMode() {
  readMode();
  applyGeo();
  document.documentElement.classList.toggle("stream", MODE.stream);
  document.documentElement.classList.toggle("clear", MODE.clear);
  document.documentElement.classList.toggle("no-logo", hashParams().get("logo") === "off");
  if (MODE.veil == null) document.documentElement.style.removeProperty("--stream-veil");
  else document.documentElement.style.setProperty("--stream-veil", String(MODE.veil));
  clearInterval(rotateTimer);
  if (MODE.rotate) rotateTimer = setInterval(rotateView, MODE.every * 1000);
}

function rotateView() {
  if (LIVE.busy) return;
  const stage = document.getElementById("stage");
  stage.classList.add("is-fading");
  setTimeout(() => {
    MODE.view = MODE.view === "winners" ? "losers" : "winners";
    applyGeo();
    render();
    stage.classList.remove("is-fading");
  }, 350);
}

window.addEventListener("hashchange", () => { setupMode(); render(); });

setupMode();
render();
startLive();
