// KIIT Indoor Navigation - script.js
// Short names: N = nodes, W = edge weights, EL = edges, st = app state, $ = document.querySelector


// ============================================================
// 1. SETTINGS (step length, walking speed, scale, stair cost)
// ============================================================
let STEP_LENGTH_METERS = 0.75, WALK_SPEED = 1.4, MIRROR = true;
// SC = steps per map unit. Calibrated from your measured edges (median 0.23-0.25), so corridor
// estimates and your measured distances agree with each other.
const SC = 0.24, STAIR_COST = 28;

// ============================================================
// Floor names used in the tabs and directions
// ============================================================
const FL = ['Ground', '1st', '2nd', '3rd'], $ = s => document.querySelector(s);

// ============================================================
// 2. MAP LAYOUT: every room, stair, toilet and corridor is placed here.
// BASE = all places, BE = corridor links between them (weight null = calculated from map distance)
// ============================================================
const STUB = 8, BASE = {}, BE = [];
const mkJ = (k, x, y) => BASE[k] = {
    x,
    y,
    t: 'junc',
    label: 'corridor'
};

// ============================================================
// Draws one block as a rectangular corridor loop and hangs rooms on its sides
// ============================================================
function ring(pre, x0, y0, x1, y1, items) {
    const c = ['TL', 'TR', 'BR', 'BL'].map(n => pre + '_' + n);
    mkJ(c[0], x0, y0);
    mkJ(c[1], x1, y0);
    mkJ(c[2], x1, y1);
    mkJ(c[3], x0, y1);
    const sd = {
        T: [],
        R: [],
        B: [],
        L: []
    };
    for (const [k, s, pos, inn, t, label] of items) {
        const T = s == 'T', B = s == 'B', L = s == 'L', Rr = s == 'R';
        const jx = T || B ? pos : L ? x0 : x1, jy = L || Rr ? pos : T ? y0 : y1;
        if (t == 'J') {
            mkJ(k, jx, jy);
            sd[s].push(k);
            continue;
        }
        const d = inn ? 45 : -45, x = T || B ? pos : L ? x0 + d : x1 - d, y = L || Rr ? pos : T ? y0 + d : y1 - d;
        mkJ('j' + k, jx, jy);
        BASE[k] = {
            x,
            y,
            t: t || 'room',
            label: label || k
        };
        BE.push([
            k,
            'j' + k,
            STUB
        ]);
        sd[s].push('j' + k);
    }
    const g = {
            T: j => BASE[j].x,
            R: j => BASE[j].y,
            B: j => -BASE[j].x,
            L: j => -BASE[j].y
        }, srt = s => sd[s].sort((a, b) => g[s](a) - g[s](b));
    const seq = [
        c[0],
        ...srt('T'),
        c[1],
        ...srt('R'),
        c[2],
        ...srt('B'),
        c[3],
        ...srt('L'),
        c[0]
    ];
    for (let i = 1; i < seq.length; i++)
        BE.push([
            seq[i - 1],
            seq[i]
        ]);
}
ring('A', 130, 130, 400, 350, [
    ['TL_A', 'T', 130, 0, 'toilet', 'Toilet A (Ladies)'],
    ['A006', 'T', 190, 0],
    ['A007', 'T', 250, 0],
    ['A009', 'T', 340, 0],
    ['TG_A', 'T', 400, 0, 'toilet', 'Toilet A (Gents)'],
    ['SA_NW', 'T', 195, 1, 'stair', 'Stair A-NW'],
    ['A008', 'T', 265, 1],
    ['A010', 'T', 340, 1],
    ['A011', 'R', 170, 0],
    ['A013', 'R', 225, 0],
    ['A012', 'R', 250, 1],
    ['sA', 'R', 300, 0, 'J'],
    ['SA_C', 'B', 320, 1, 'stair', 'Stair A-Centre'],
    ['aC', 'B', 360, 0, 'J'],
    ['A017', 'B', 260, 1],
    ['A016', 'B', 260, 0],
    ['A018', 'B', 215, 0],
    ['TG_A2', 'B', 150, 0, 'toilet', 'Toilet A-SW (Gents)'],
    ['AO', 'L', 340, 0, 'entry', 'Block A outside entry'],
    ['A001', 'L', 285, 0],
    ['SA_SW', 'L', 322, 1, 'stair', 'Stair A-SW'],
    ['A002', 'L', 245, 0],
    ['A003', 'L', 215, 1],
    ['A004', 'L', 205, 0],
    ['A005', 'L', 160, 0]
]);
ring('B', 600, 400, 860, 610, [
    ['B009', 'T', 650, 0],
    ['B007', 'T', 730, 0],
    ['B006', 'T', 810, 0],
    ['TG_B', 'T', 860, 0, 'toilet', 'Toilet B (Gents)'],
    ['B010', 'T', 650, 1],
    ['B008', 'T', 730, 1],
    ['SB_NE', 'T', 800, 1, 'stair', 'Stair B-NE'],
    ['B005', 'R', 450, 0],
    ['B004', 'R', 495, 0],
    ['B002', 'R', 540, 0],
    ['B003', 'R', 520, 1],
    ['TL_B2', 'B', 860, 0, 'toilet', 'Toilet B-SE (Ladies)'],
    ['B001', 'B', 815, 0],
    ['BO', 'B', 770, 0, 'entry', 'Block B outside entry'],
    ['B022', 'B', 715, 0],
    ['B020', 'B', 655, 0],
    ['SB_S', 'B', 775, 1, 'stair', 'Stair B-South'],
    ['B021', 'B', 715, 1],
    ['B019', 'B', 650, 1],
    ['BC', 'L', 545, 0, 'entry', 'Block B entry (from C)'],
    ['B017', 'L', 485, 0],
    ['B016', 'L', 440, 0],
    ['B018', 'L', 500, 1]
]);
for (const [k, x, up, t, l] of [
        ['B014', 450, 1],
        ['B012', 500, 1],
        ['B011', 550, 1],
        ['B015', 450, 0],
        ['B013', 500, 0],
        ['SB_C', 550, 0, 'stair', 'Stair B-Centre'],
        ['TL_B', 600, 1, 'toilet', 'Toilet B (Ladies)']
    ]) {
    mkJ('j' + k, x, 300);
    BASE[k] = {
        x,
        y: up ? 255 : 345,
        t: t || 'room',
        label: l || k
    };
    BE.push([
        k,
        'j' + k,
        STUB
    ]);
}
mkJ('s5', 600, 350);
const sp = ['sA', 'jB014', 'jB015', 'jB012', 'jB013', 'jB011', 'jSB_C', 'jTL_B', 's5', 'B_TL'];
for (let i = 1; i < sp.length; i++)
    BE.push([
        sp[i - 1],
        sp[i]
    ]);
BASE.AC = {
    x: 360,
    y: 545,
    t: 'entry',
    label: 'Block A entry (from C)'
};
BASE.CB = {
    x: 455,
    y: 600,
    t: 'entry',
    label: 'C Block connection'
};
mkJ('ac1', 360, 400);
mkJ('ac2', 360, 450);
BASE.A014 = {
    x: 410,
    y: 400,
    t: 'room',
    label: 'A014'
};
BASE.A015 = {
    x: 410,
    y: 450,
    t: 'room',
    label: 'A015'
};
// The ac2 to AC piece is fixed at its original 12 steps even though it is drawn longer now
BE.push(['aC', 'ac1'], ['ac1', 'ac2'], ['ac2', 'AC', 12], [
    'A014',
    'ac1',
    STUB
], [
    'A015',
    'ac2',
    STUB
], ['AC', 'CB', 110], ['CB', 'BC', 162]);

// ------------------------------------------------------------
// A-B CORRIDOR (from your hand-drawn graph): runs from the Block A entry (near A015)
// to the Block B entry (near B018). Length = 52 steps. A staircase sits in the middle
// of it and goes up to the 3rd floor (every floor has this corridor).
// ------------------------------------------------------------
mkJ('jSM', 457, 545);   // same height as both entries, so the corridor is a straight horizontal line
BASE.SM = {
    x: 470,
    y: 495,
    t: 'stair',
    label: 'Stair A-B corridor'
};
BE.push(['AC', 'jSM', 26], ['jSM', 'BC', 26], ['SM', 'jSM', STUB]);
BASE.AO.g = BASE.BO.g = 1;

// ============================================================
// Your measured distances in steps. They are used to fit the corridor lengths (see calibrateWeights)
// ============================================================
const M = [
    ['B018', 'B019', 26],
    ['B019', 'B020', 12],
    ['B020', 'B022', 9],
    ['B022', 'B021', 9],
    ['B003', 'B005', 15],
    ['B005', 'B006', 25],
    ['B005', 'B007', 41],
    ['B005', 'B009', 60],
    ['B009', 'B016', 9],
    ['B016', 'B017', 11],
    ['B017', 'B018', 44],
    ['B011', 'B012', 16],
    ['B011', 'B013', 32],
    ['B011', 'B014', 32],
    ['B013', 'B015', 12],
    ['A011', 'A009', 42],
    ['A011', 'A007', 57],
    ['A011', 'A008', 57],
    ['A007', 'A006', 15],
    ['A005', 'A007', 20],
    ['A005', 'A003', 12],
    ['A005', 'A002', 18],
    ['A005', 'A001', 28],
    ['A017', 'A016', 11],
    ['A017', 'A014', 38],
    ['A001', 'SA_SW', 10],
    ['SA_SW', 'A017', 20],
    ['SA_SW', 'A018', 20],
    ['A007', 'SA_NW', 13],
    ['B005', 'SB_NE', 10],
    ['B015', 'SB_C', 24],
    ['B011', 'TL_B', 10]
];

// ============================================================
// Measurements that conflict or are missing (shown in debug mode, not used)
// ============================================================
const CONFLICTS = ['B005\u2192B008: 41 vs 60 steps (not used)', 'A011\u2194A012: 22 vs 42 steps (not used)', 'A017\u2192A014: 38 vs 47 steps (47 not used)', 'B015\u2192A entry: missing'];
const isRoom = k => /^[AB]\d{3}$/.test(k), nid = (k, f) => isRoom(k) ? k[0] + f + k.slice(2) : k + '_' + f;

// ============================================================
// 3. BUILD THE GRAPH for all 4 floors.
// N = nodes, adj = neighbours of each node, W = edge weights, EL = list of all edges
// ============================================================
const N = {}, adj = {}, W = {}, EL = [];
for (let f = 0; f < 4; f++)
    for (const k in BASE) {
        const b = BASE[k];
        if (b.g && f)
            continue;
        const id = nid(k, f);
        N[id] = {
            id,
            f,
            x: b.x,
            y: b.y,
            t: b.t,
            label: b.t == 'room' ? id : b.label,
            k
        };
        adj[id] = [];
    }
function add(a, b, w, kind) {
    if (!N[a] || !N[b])
        return;
    EL.push({
        a,
        b,
        w,
        kind
    });
    for (const [x, y] of [
            [
                a,
                b
            ],
            [
                b,
                a
            ]
        ]) {
        adj[x].push({
            kind,
            to: y,
            w,
            st: kind == 'stair'
        });
        const key = x + '|' + y;
        W[key] = Math.min(W[key] ?? 1000000000, w);
    }
}
const dist = (a, b) => Math.hypot(BASE[a].x - BASE[b].x, BASE[a].y - BASE[b].y);

// ============================================================
// CALIBRATION: your measured distances (M) are used to fit the corridor lengths.
// Each measured pair is walked along the corridors on the map. If the map says the walk is
// too long or too short, the corridor pieces on that walk are stretched or shrunk a little,
// and this is repeated until the map agrees with your measurements as well as it can.
// This keeps every route on the corridors (rooms are never used as shortcuts).
// The C Block links (110 and 162 steps) are fixed and never changed.
// ============================================================
function calibrateWeights() {
    const neighbours = {};
    BE.forEach(([a, b], i) => {
        if (!neighbours[a])
            neighbours[a] = [];
        if (!neighbours[b])
            neighbours[b] = [];
        neighbours[a].push([b, i]);
        neighbours[b].push([a, i]);
    });
    const start = BE.map(([a, b, w]) => w ?? Math.max(2, dist(a, b) * SC));
    const locked = BE.map(([a, b, w]) => w != null && w > STUB);
    // list of corridor-piece numbers used when walking from one place to another
    function walkPieces(from, to) {
        const d = { [from]: 0 }, prev = {}, queue = [[0, from]], done = new Set();
        while (queue.length) {
            queue.sort((x, y) => x[0] - y[0]);
            const [du, u] = queue.shift();
            if (done.has(u))
                continue;
            done.add(u);
            if (u == to)
                break;
            if (u != from && BASE[u].t != 'junc' && BASE[u].t != 'entry')
                continue;
            for (const [v, i] of neighbours[u] || []) {
                const nd = du + start[i];
                if (nd < (d[v] ?? 1e9)) {
                    d[v] = nd;
                    prev[v] = [u, i];
                    queue.push([nd, v]);
                }
            }
        }
        const pieces = [];
        if (!(to in d))
            return pieces;
        for (let c = to; c != from; c = prev[c][0])
            pieces.push(prev[c][1]);
        return pieces;
    }
    const walks = M.map(([a, b, w]) => ({ w, pieces: walkPieces(a, b) }));
    const weights = [...start];
    for (let round = 0; round < 80; round++) {
        const logSum = new Array(BE.length).fill(0), count = new Array(BE.length).fill(0);
        for (const walk of walks) {
            if (!walk.pieces.length)
                continue;
            const cost = walk.pieces.reduce((sum, i) => sum + weights[i], 0);
            for (const i of walk.pieces) {
                logSum[i] += Math.log(walk.w / cost);
                count[i]++;
            }
        }
        for (let i = 0; i < weights.length; i++) {
            if (locked[i] || !count[i])
                continue;
            const stretched = weights[i] * Math.exp(0.4 * logSum[i] / count[i]);
            weights[i] = Math.min(start[i] * 5 + 10, Math.max(2, stretched));
        }
    }
    return weights.map(w => Math.max(2, Math.round(w)));
}
const calibrated = calibrateWeights();
for (let f = 0; f < 4; f++)
    BE.forEach(([a, b], i) => add(nid(a, f), nid(b, f), calibrated[i], 'est'));
for (const k in BASE)
    if (BASE[k].t == 'stair')
        for (let f = 0; f < 3; f++)
            add(nid(k, f), nid(k, f + 1), STAIR_COST, 'stair');

// ============================================================
// 4. DIJKSTRA: shortest path from s to t (ban/banE = blocked nodes/edges, ns = avoid stairs)
// ============================================================
function dij(s, t, ban = new Set(), banE = new Set(), ns = false) {
    const d = { [s]: 0 }, p = {}, vis = [], done = new Set(), q = [[
                0,
                s
            ]];
    while (q.length) {
        q.sort((a, b) => a[0] - b[0]);
        const [du, u] = q.shift();
        if (done.has(u))
            continue;
        done.add(u);
        vis.push(u);
        if (u == t)
            break;
        if (N[u].t == 'toilet' && u != s)
            continue;
        for (const e of adj[u]) {
            if (ban.has(e.to) || banE.has(u + '|' + e.to) || ns && e.st)
                continue;
            const nd = du + e.w;
            if (nd < (d[e.to] ?? 1000000000)) {
                d[e.to] = nd;
                p[e.to] = u;
                q.push([
                    nd,
                    e.to
                ]);
            }
        }
    }
    if (!(t in d))
        return null;
    const path = [t];
    while (path[0] != s)
        path.unshift(p[path[0]]);
    return {
        path,
        steps: d[t],
        visited: vis
    };
}
const cost = p => {
    let c = 0;
    for (let i = 1; i < p.length; i++)
        c += W[p[i - 1] + '|' + p[i]];
    return c;
};

// ============================================================
// YEN'S ALGORITHM: finds the K best different routes (we use K = 3)
// ============================================================
function yen(s, t, K, ns) {
    const A = [dij(s, t, new Set(), new Set(), ns)];
    if (!A[0])
        return [];
    const B = [];
    for (let i = 1; i < K; i++) {
        const last = A[i - 1].path;
        for (let j = 0; j < last.length - 1; j++) {
            const root = last.slice(0, j + 1), bE = new Set(), bN = new Set(root.slice(0, -1));
            for (const a of A)
                if (a.path.length > j + 1 && root.every((n, x) => a.path[x] == n))
                    bE.add(a.path[j] + '|' + a.path[j + 1]);
            const sp = dij(last[j], t, bN, bE, ns);
            if (sp) {
                const path = root.slice(0, -1).concat(sp.path);
                if (!B.some(b => b.path.join() == path.join()) && !A.some(a => a.path.join() == path.join()))
                    B.push({
                        path,
                        steps: cost(path),
                        visited: sp.visited
                    });
            }
        }
        if (!B.length)
            break;
        B.sort((a, b) => a.steps - b.steps);
        A.push(B.shift());
    }
    return A;
}

// ============================================================
// Adds stairs, turns, metres and walking time to a route
// ============================================================
function metrics(r) {
    const p = r.path;
    let st = 0, tu = 0;
    for (let i = 1; i < p.length; i++)
        if (N[p[i]].f != N[p[i - 1]].f)
            st++;
    const g = p, gi = p.map((x, i) => i);
    const isStub = n => ['room', 'stair', 'toilet'].includes(N[n].t);
    // count a turn only at real corridor corners (not where you step out of a room door)
    for (let k = 1; k < g.length - 1; k++) {
        const a = N[g[k - 1]], b = N[g[k]], c = N[g[k + 1]];
        if (a.f != b.f || b.f != c.f)
            continue;
        if (isStub(g[k - 1]) || isStub(g[k + 1]))
            continue;
        const x1 = b.x - a.x, y1 = b.y - a.y, x2 = c.x - b.x, y2 = c.y - b.y;
        if (!(x1 || y1) || !(x2 || y2))
            continue;
        if (Math.abs(Math.atan2(x1 * y2 - y1 * x2, x1 * x2 + y1 * y2) * 180 / Math.PI) > 40)
            tu++;
    }
    const m = r.steps * STEP_LENGTH_METERS;
    return {
        ...r,
        geo: g,
        gi,
        stairs: st,
        turns: tu,
        m,
        sec: Math.round(m / WALK_SPEED)
    };
}

// ============================================================
// 5. DIRECTIONS: works out left / right / straight from map coordinates
// ============================================================
function turnAt(p, i) {
    if (i < 1 || i >= p.length - 1)
        return null;
    const a = N[p[i - 1]], b = N[p[i]], c = N[p[i + 1]];
    if (a.f != b.f || b.f != c.f)
        return null;
    const x1 = b.x - a.x, y1 = b.y - a.y, x2 = c.x - b.x, y2 = c.y - b.y;
    if (!(x1 || y1) || !(x2 || y2))
        return null;
    return Math.atan2(x1 * y2 - y1 * x2, x1 * x2 + y1 * y2) * 180 / Math.PI;
}
const dirTxt = a => a == null ? 'Head toward' : Math.abs(a) < 30 ? 'Continue straight toward' : Math.abs(a) > 150 ? 'Turn around toward' : a > 0 != MIRROR ? 'Turn right toward' : 'Turn left toward';

// ============================================================
// Turns a route into readable steps like "Turn left toward A017"
// ============================================================
function steps(r) {
    const p = r.path, g = r.geo, gi = r.gi;
    const length = k => Math.hypot(N[g[k]].x - N[g[k - 1]].x, N[g[k]].y - N[g[k - 1]].y);
    const isStub = n => ['room', 'stair', 'toilet'].includes(N[n].t);
    // 1. Share each measured distance over the little corridor pieces it covers
    const pieceSteps = new Array(g.length).fill(0);
    let carry = 0;
    for (let i = 1; i < p.length; i++) {
        const w = W[p[i - 1] + '|' + p[i]];
        const from = gi[i - 1], to = gi[i];
        if (to == from) {
            carry += w;
            continue;
        }
        let total = 0;
        for (let k = from + 1; k <= to; k++)
            total += length(k);
        for (let k = from + 1; k <= to; k++)
            pieceSteps[k] += total ? w * length(k) / total : w / (to - from);
        pieceSteps[from + 1] += carry;
        carry = 0;
    }
    // 2. Landmarks: rooms, stairs, toilets and entries on the route
    const mark = {};
    for (let i = 1; i < p.length; i++)
        if (N[p[i]].t != 'junc')
            mark[gi[i]] = N[p[i]].label;
    const isCorner = k => {
        if (k >= g.length - 1)
            return false;
        const a = N[g[k - 1]], b = N[g[k]], c = N[g[k + 1]];
        if (a.f != b.f || b.f != c.f || isStub(g[k - 1]) || isStub(g[k + 1]))
            return false;
        const angle = turnAt(g, k);
        return angle != null && Math.abs(angle) > 40;
    };
    const nextLabel = k => {
        for (let j = k; j < g.length; j++)
            if (mark[j] !== undefined)
                return mark[j];
        return '';
    };
    // 3. A new step starts at every landmark, corridor corner and staircase
    const out = [];
    let start = 0, acc = 0, cum = 0, shown = 0;
    for (let k = 1; k < g.length; k++) {
        acc += pieceSteps[k];
        const stairs = N[g[k - 1]].f != N[g[k]].f;
        if (!(k == g.length - 1 || mark[k] !== undefined || stairs || isCorner(k)))
            continue;
        cum += acc;
        const n = Math.round(cum) - shown;
        shown += n;
        const text = stairs ? `Take the staircase to the ${ FL[N[g[k]].f] } floor` : `${ dirTxt(turnAt(g, start)) } ${ nextLabel(k) }${ k == g.length - 1 ? ' - you have arrived' : '' }`;
        out.push({
            txt: text,
            n,
            g0: start,
            g1: k,
            f: stairs ? N[g[k - 1]].f : N[g[k]].f
        });
        start = k;
        acc = 0;
    }
    return out;
}

// ============================================================
// 6. APP STATE (current floor, routes, navigation step, debug on/off)
// ============================================================
const st = {
    floor: 0,
    routes: [],
    ri: 0,
    nav: null,
    dev: false,
    hl: null
};
const labelOf = {};
const dl = [];
for (const id in N) {
    const n = N[id];
    if (n.t == 'junc')
        continue;
    const l = n.t == 'room' ? id : `${ n.label } — ${ FL[n.f] }`;
    labelOf[l.toLowerCase()] = id;
    dl.push(l);
}
$('#dl').innerHTML = dl.map(v => `<option value="${ v }">`).join('');
const resolve = v => labelOf[v.trim().toLowerCase()] || null;
const ico = {
    stair: '\u21C5',
    toilet: 'WC',
    entry: '\u2386'
};

// ============================================================
// 7. MAP DRAWING
// ============================================================
const sub = n => {
    const l = n.t == 'toilet' ? /Ladies/.test(n.label) ? 'Ladies' : 'Gents' : n.t == 'entry' ? n.k == 'CB' ? 'C Block' : /outside/.test(n.label) ? 'Entry' : 'C entry' : '';
    return l ? `<text x="${ n.x }" y="${ n.y + 27 }" font-size="9.5" text-anchor="middle" fill="var(--mu)" font-weight="700">${ l }</text>` : '';
};
function draw() {
    const f = st.floor;
    let h = `<g font-weight="800" fill="var(--cor)" text-anchor="middle" font-size="40" opacity=".55"><text x="265" y="250">BLOCK A</text><text x="730" y="510">BLOCK B</text><text x="430" y="650" font-size="26">C BLOCK</text></g>`;
    const rd = t => t == 'junc' || t == 'entry';
    for (const pass of [true, false])
        for (const e of EL) {
            if (e.kind != 'est' || N[e.a].f != f)
                continue;
            const a = N[e.a], b = N[e.b], r = rd(a.t) && rd(b.t);
            if (r != pass)
                continue;
            h += `<line x1="${ a.x }" y1="${ a.y }" x2="${ b.x }" y2="${ b.y }" stroke="${ r ? 'var(--cor)' : 'var(--mu)' }" stroke-width="${ r ? 9 : 2.5 }" stroke-linecap="round" ${ r ? '' : 'opacity=".55"' }/>`;
        }
    if (st.dev)
        for (const [ka, kb, w] of M) {
            const A = N[nid(ka, f)], B = N[nid(kb, f)];
            if (!A || !B)
                continue;
            h += `<line x1="${ A.x }" y1="${ A.y }" x2="${ B.x }" y2="${ B.y }" stroke="#e11d48" stroke-dasharray="4 3" opacity=".6"/><text x="${ (A.x + B.x) / 2 }" y="${ (A.y + B.y) / 2 }" font-size="9" font-weight="700" fill="#e11d48">${ w }</text>`;
        }
    for (const id in N) {
        const n = N[id];
        if (n.f != f)
            continue;
        if (n.t == 'junc') {
            if (st.dev)
                h += `<circle cx="${ n.x }" cy="${ n.y }" r="3" fill="#2563eb"/>`;
            continue;
        }
        const hl = st.hl && st.hl(n) ? ' class="pulse"' : '';
        if (n.t == 'room')
            h += `<g${ hl } data-id="${ n.id }" style="cursor:pointer"><title>${ n.id }</title><circle cx="${ n.x }" cy="${ n.y }" r="16" fill="var(--card)" stroke="${ hl ? 'var(--ac2)' : 'var(--tx)' }" stroke-width="${ hl ? 3.5 : 1.6 }"/><text x="${ n.x }" y="${ n.y + 3.5 }" font-size="9.5" text-anchor="middle" fill="var(--tx)" font-weight="700">${ n.id }</text></g>`;
        else
            h += `<g${ hl } data-id="${ n.id }" style="cursor:pointer"><title>${ n.label }</title><circle cx="${ n.x }" cy="${ n.y }" r="14" fill="${ n.t == 'stair' ? '#6366f1' : n.t == 'toilet' ? '#0891b2' : '#0b8f4d' }" stroke="${ hl ? 'var(--ac2)' : 'none' }" stroke-width="3"/><text x="${ n.x }" y="${ n.y + 4 }" font-size="${ n.t == 'toilet' ? 9 : 13 }" text-anchor="middle" fill="#fff" font-weight="700">${ n.t == 'stair' ? 'S' : ico[n.t] }</text>${ sub(n) }</g>`;
    }
    const r = st.routes[st.ri];
    if (r) {
        const p = r.path, g = r.geo, sg = st.nav != null ? steps(r)[st.nav] : null;
        const from = sg ? sg.g0 : 0, to = sg ? sg.g1 : 0;
        for (let i = 1; i < g.length; i++) {
            const a = N[g[i - 1]], b = N[g[i]];
            if (a.f != f || b.f != f)
                continue;
            const on = sg && i > from && i <= to;
            h += `<line x1="${ a.x }" y1="${ a.y }" x2="${ b.x }" y2="${ b.y }" class="flow" stroke="${ on || !sg ? 'var(--ac)' : 'var(--mu)' }" stroke-width="${ on ? 7 : 5 }" stroke-linecap="round" opacity="${ on || !sg ? 1 : 0.5 }"/>`;
        }
        if (sg) {
            const pts = g.slice(from, to + 1).map(x => N[x]).filter(n => n.f == f);
            if (pts.length > 1)
                h += `<circle r="8" fill="#f59e0b" stroke="#fff" stroke-width="3"><animateMotion dur="${ Math.max(1.5, sg.n / 12) }s" repeatCount="indefinite" path="M${ pts.map(n => n.x + ' ' + n.y).join(' L') }"/></circle>`;
        }
        const s = N[p[0]], e = N[p[p.length - 1]];
        if (s.f == f)
            h += `<circle cx="${ s.x }" cy="${ s.y }" r="9" fill="#2563eb" stroke="#fff" stroke-width="3"/>`;
        if (e.f == f)
            h += `<path d="M${ e.x } ${ e.y + 2 }l-9-22a10 10 0 1 1 18 0z" fill="#e11d48" stroke="#fff" stroke-width="2"/>`;
    }
    $('#svg').innerHTML = h;
    applyVb();
    const used = new Set(st.routes[st.ri]?.path.map(x => N[x].f) || []);
    $('#tabs').innerHTML = FL.map((n, i) => `<button class="${ i == f ? 'on' : '' } ${ used.has(i) ? 'dot' : '' }" data-f="${ i }">${ n }</button>`).join('');
}
$('#tabs').onclick = e => {
    const b = e.target.closest('button');
    if (b) {
        st.floor = +b.dataset.f;
        draw();
    }
};
const fmt = r => `${ r.steps } steps · ${ r.m.toFixed(1) } m · ${ r.sec } s`;

// ============================================================
// 8. RESULT PANEL (route summary and navigation mode)
// ============================================================
function panel() {
    const box = $('#res'), rs = st.routes, r = rs[st.ri];
    if (!r) {
        return;
    }
    if (st.nav != null) {
        const S = steps(r), s = S[st.nav];
        box.innerHTML = `<div class="card"><small class="dev">STEP ${ st.nav + 1 } OF ${ S.length }</small><div class="nav">${ s.txt }</div><div>${ s.n } steps · <span class="dev">${ S.slice(st.nav).reduce((a, x) => a + x.n, 0) } steps to go (~${ Math.round(S.slice(st.nav).reduce((a, x) => a + x.n, 0) * STEP_LENGTH_METERS / WALK_SPEED) }s)</span></div><div class="bar"><i style="width:${ (st.nav + 1) / S.length * 100 }%"></i></div><label class="dev"><input type="checkbox" id="vo" ${ st.voice ? 'checked' : '' }> 🔊 Read steps aloud</label><div class="nav-c"><button class="ib" id="pv">← PREVIOUS</button><button class="ib" id="nx">NEXT →</button><button class="ib" id="ex">EXIT</button></div></div>`;
        $('#vo').onchange = e => {
            st.voice = e.target.checked;
            if (st.voice)
                speak();
        };
        $('#pv').onclick = () => go(st.nav - 1);
        $('#nx').onclick = () => go(st.nav + 1);
        $('#ex').onclick = () => {
            st.nav = null;
            panel();
            draw();
        };
        return;
    }
    const a = N[r.path[0]], b = N[r.path[r.path.length - 1]];
    box.innerHTML = `<div class="card"><small class="dev">NAVIGATION RESULT</small><div style="font-size:18px;font-weight:700">${ a.label } → ${ b.label }</div>
 <div class="stats"><div><b>${ r.steps }</b><span>steps</span></div><div><b>${ r.m.toFixed(1) } m</b><span>approx.</span></div><div><b>~${ r.sec }s</b><span>est. time</span></div><div><b>${ r.stairs }</b><span>floor changes</span></div><div><b>${ r.turns }</b><span>turns</span></div><div><b>${ r.path.length }</b><span>nodes</span></div></div>
 <div class="row2"><button class="ib" id="cd">Copy directions</button><button class="ib" id="cl">Copy link</button></div><ol class="tl">${ steps(r).map(x => `<li><b>${ x.txt }</b><span>${ x.n } steps</span></li>`).join('') }</ol><button class="go" id="sn">START NAVIGATION</button>
 <div style="margin-top:12px;font-weight:700">Routes</div>${ rs.map((x, i) => `<div class="route ${ i == st.ri ? 'on' : '' }" data-i="${ i }"><div><b>${ i ? 'ALTERNATIVE ' + i : 'SHORTEST' }</b><br><small>${ fmt(x) }</small></div><small>${ x.stairs } stairs · ${ x.turns } turns</small></div>`).join('') }
 <p class="dev">Distances are estimates (blueprint ratio + your measured edges). Time assumes ${ WALK_SPEED } m/s, ${ STEP_LENGTH_METERS } m/step.</p></div>`;
    $('#sn').onclick = () => go(0);
    $('#cd').onclick = async e => {
        e.target.textContent = await copy(`${ a.label } → ${ b.label } (${ r.steps } steps)\n` + steps(r).map((x, i) => `${ i + 1 }. ${ x.txt } (${ x.n } steps)`).join('\n')) ? 'Copied \u2713' : 'Copy failed';
    };
    $('#cl').onclick = async e => {
        e.target.textContent = await copy(location.href) ? 'Copied \u2713' : 'Copy failed';
    };
    box.querySelectorAll('.route').forEach(el => el.onclick = () => {
        st.ri = +el.dataset.i;
        st.floor = N[st.routes[st.ri].path[0]].f;
        panel();
        draw();
    });
}

// ============================================================
// Go to a given navigation step
// ============================================================
function go(i) {
    const S = steps(st.routes[st.ri]);
    if (i < 0 || i >= S.length)
        return;
    st.nav = i;
    st.floor = S[i].f;
    panel();
    draw();
    if (st.voice)
        speak();
}

// ============================================================
// FIND SHORTEST PATH button
// ============================================================
$('#find').onclick = () => {
    const a = resolve($('#from').value), b = resolve($('#to').value);
    if (!a || !b) {
        $('#res').innerHTML = '<div class="card warn">Pick valid rooms from the suggestions.</div>';
        return;
    }
    let rs = yen(a, b, 3, $('#ns').checked).map(metrics);
    if (!rs.length) {
        st.routes = [];
        $('#res').innerHTML = `<div class="card warn">${ $('#ns').checked ? 'No stair-free route is available.' : 'No route found.' }</div>`;
        draw();
        return;
    }
    if ($('#ft').checked)
        rs.sort((x, y) => x.turns - y.turns || x.steps - y.steps);
    st.routes = rs;
    st.ri = 0;
    st.nav = null;
    st.floor = N[a].f;
    panel();
    fitRoute();
    draw();
    devPanel();
    try {
        history.replaceState(null, '', '#' + a + '>' + b);
    } catch (e) {
    }
    addRecent(a, b);
};
$('#q').oninput = e => {
    const v = e.target.value.trim().toLowerCase(), id = resolve(v);
    st.hl = null;
    if (id) {
        st.floor = N[id].f;
        st.hl = n => n.id == id;
    } else {
        const fi = [
            ['ground', 0],
            ['1st', 1],
            ['2nd', 2],
            ['3rd', 3]
        ].find(x => v.includes(x[0]));
        if (fi)
            st.floor = fi[1];
        const bl = v.match(/^block ([ab])$/);
        if (bl)
            st.hl = n => n.f == st.floor && n.k && (n.k[0] == bl[1].toUpperCase() && isRoom(n.k));
    }
    draw();
};

// ============================================================
// 9. DEBUG PANEL (graph checks)
// ============================================================
function devPanel() {
    const d = $('#dev');
    if (!st.dev) {
        d.innerHTML = '';
        return;
    }
    const seen = new Set(['A001_x']), start = nid('A001', 0), q = [start];
    seen.add(start);
    while (q.length) {
        const u = q.pop();
        for (const e of adj[u])
            if (!seen.has(e.to)) {
                seen.add(e.to);
                q.push(e.to);
            }
    }
    const dis = Object.keys(N).filter(x => !seen.has(x)), bad = Object.keys(N).filter(x => N[x].t == 'room' && !/^[AB][0-3]\d{2}$/.test(x)), dup = {};
    let dups = 0;
    for (const e of EL) {
        const k = [
            e.a,
            e.b
        ].sort().join();
        if (dup[k])
            dups++;
        dup[k] = 1;
    }
    const est = EL.filter(e => e.kind == 'est').length, sus = [];
    let errorSum = 0, errorCount = 0;
    for (const [ka, kb, w] of M) {
        const r = dij(nid(ka, 0), nid(kb, 0), new Set(), new Set(), true);
        if (!r)
            continue;
        errorSum += Math.abs(r.steps - w) / w;
        errorCount++;
        if (Math.abs(r.steps - w) / w > 0.35)
            sus.push(`${ ka } ↔ ${ kb }: measured ${ w }, map gives ${ r.steps }`);
    }
    d.innerHTML = `<div class="card dev"><b>Graph debug</b><br>Nodes: <b>${ Object.keys(N).length }</b> · Edges: <b>${ EL.length }</b> (corridor ${ est }, stairs ${ EL.filter(e => e.kind == 'stair').length })<br>Disconnected nodes: <b>${ dis.length }</b> · Invalid room IDs: <b>${ bad.length }</b> · Duplicate edges: <b>${ dups }</b><br>Unverified (estimated) connections: <b>${ est }</b><br><span class="warn">Measured distances the map cannot match within 35% (average error ${ Math.round(errorSum / errorCount * 100) }%):</span><br>${ sus.length ? sus.map(x => '\u2022 ' + x).join('<br>') : 'none' }<br><span class="warn">Conflicting / missing measurements:</span><br>${ CONFLICTS.map(c => '\u2022 ' + c).join('<br>') }<br>Corridor lengths are fitted to your measurements. Upper floors reuse the ground-floor layout &amp; distances (inferred). 6 stair edges + B011–toilet were mapped from your measurements by blueprint position (inferred). Stair cost = ${ STAIR_COST } steps (assumed). No lift/ramp data.</div>`;
}
$('#swap').onclick = () => {
    const a = $('#from').value;
    $('#from').value = $('#to').value;
    $('#to').value = a;
};
$('#devb').onclick = () => {
    st.dev = !st.dev;
    devPanel();
    draw();
};

// ============================================================
// 10. LIGHT / DARK THEME
// ============================================================
const TH = ['auto', 'light', 'dark'], TI = {
        auto: '\u25D0 Auto',
        light: '\u2600 Light',
        dark: '\uD83C\uDF19 Dark'
    };
let th = 'auto';
try {
    th = localStorage.getItem('kiit-th') || 'auto';
} catch (e) {
}
function setTh(t) {
    th = t;
    const r = document.documentElement;
    if (t == 'auto')
        delete r.dataset.theme;
    else
        r.dataset.theme = t;
    $('#thm').textContent = TI[t];
    try {
        localStorage.setItem('kiit-th', t);
    } catch (e) {
    }
}
$('#thm').onclick = () => setTh(TH[(TH.indexOf(th) + 1) % 3]);
setTh(th);

// ============================================================
// 11. RECENT ROUTES, VOICE, ZOOM, PAN, CLICK-TO-PICK, NEAREST FINDER
// ============================================================
let rec = [];
try {
    rec = JSON.parse(localStorage.getItem('kiit-rec') || '[]');
} catch (e) {
}
function renderRec() {
    $('#rec').innerHTML = rec.length ? '<span>Recent:</span>' + rec.map((r, i) => `<button class="chip" data-i="${ i }">${ r[0] } → ${ r[1] }</button>`).join('') : '';
    document.querySelectorAll('#rec .chip').forEach(c => c.onclick = () => {
        const r = rec[+c.dataset.i];
        $('#from').value = nameOf(r[0]);
        $('#to').value = nameOf(r[1]);
        $('#find').click();
    });
}
function addRecent(a, b) {
    rec = [
        [
            a,
            b
        ],
        ...rec.filter(r => r[0] != a || r[1] != b)
    ].slice(0, 4);
    try {
        localStorage.setItem('kiit-rec', JSON.stringify(rec));
    } catch (e) {
    }
    renderRec();
}
const speak = () => {
    try {
        speechSynthesis.cancel();
        const S = steps(st.routes[st.ri]), x = S[st.nav];
        speechSynthesis.speak(new SpeechSynthesisUtterance(`${ x.txt }. ${ x.n } steps.`));
    } catch (e) {
    }
};
let vb = [0, 0, 1000, 700];
const applyVb = () => $('#svg').setAttribute('viewBox', vb.join(' '));
function clampVb() {
    vb[2] = Math.min(1000, Math.max(220, vb[2]));
    vb[3] = vb[2] * 0.7;
    vb[0] = Math.min(1000 - vb[2], Math.max(0, vb[0]));
    vb[1] = Math.min(700 - vb[3], Math.max(0, vb[1]));
}
const svgPt = e => {
    const r = $('#svg').getBoundingClientRect();
    return [
        vb[0] + (e.clientX - r.left) / r.width * vb[2],
        vb[1] + (e.clientY - r.top) / r.height * vb[3]
    ];
};
function zoom(k, cx = vb[0] + vb[2] / 2, cy = vb[1] + vb[3] / 2) {
    const [x, y, w, h] = vb, nw = Math.min(1000, Math.max(220, w * k)), nh = nw * 0.7;
    vb = [
        cx - (cx - x) * nw / w,
        cy - (cy - y) * nh / h,
        nw,
        nh
    ];
    clampVb();
    applyVb();
}
function fitRoute() {
    const r = st.routes[st.ri];
    const ns = r ? r.geo.map(x => N[x]).filter(n => n.f == st.floor) : [];
    if (!ns.length) {
        vb = [0, 0, 1000, 700];
        return;
    }
    const x0 = Math.min(...ns.map(n => n.x)) - 110, x1 = Math.max(...ns.map(n => n.x)) + 110, y0 = Math.min(...ns.map(n => n.y)) - 90, y1 = Math.max(...ns.map(n => n.y)) + 90;
    let w = Math.max(x1 - x0, (y1 - y0) / 0.7, 300);
    vb = [
        (x0 + x1) / 2 - w / 2,
        (y0 + y1) / 2 - w * 0.35,
        w,
        w * 0.7
    ];
    clampVb();
}
$('#zi').onclick = () => zoom(0.8);
$('#zo').onclick = () => zoom(1.25);
$('#zr').onclick = () => {
    fitRoute();
    draw();
};
const sv = $('#svg');
let drag = null;
sv.addEventListener('wheel', e => {
    e.preventDefault();
    const [x, y] = svgPt(e);
    zoom(e.deltaY < 0 ? 0.85 : 1.18, x, y);
}, { passive: false });
sv.addEventListener('pointerdown', e => {
    drag = {
        x: e.clientX,
        y: e.clientY,
        vb: [...vb],
        m: 0
    };
});
sv.addEventListener('pointermove', e => {
    if (!drag)
        return;
    const r = sv.getBoundingClientRect(), dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5)
        drag.m = 1;
    if (drag.m) {
        vb[0] = drag.vb[0] - dx / r.width * vb[2];
        vb[1] = drag.vb[1] - dy / r.height * vb[3];
        clampVb();
        applyVb();
    }
});
sv.addEventListener('pointerup', e => {
    const d = drag;
    drag = null;
    if (d && !d.m) {
        const g = e.target.closest && e.target.closest('[data-id]');
        if (g)
            pick(g.dataset.id);
    }
});
sv.addEventListener('pointerleave', () => drag = null);
const nameOf = id => N[id].t == 'room' ? id : `${ N[id].label } — ${ FL[N[id].f] }`;
st.pk = 0;
function pick(id) {
    if (!st.pk) {
        $('#from').value = nameOf(id);
        st.pk = 1;
        st.routes = [];
        $('#res').innerHTML = `<div class="card dev">From set to <b>${ nameOf(id) }</b>. Now tap the destination.</div>`;
        draw();
    } else {
        $('#to').value = nameOf(id);
        st.pk = 0;
        $('#find').click();
    }
}
const copy = async t => {
    try {
        await navigator.clipboard.writeText(t);
        return 1;
    } catch (e) {
        return 0;
    }
};
document.querySelectorAll('.chip').forEach(c => c.onclick = () => {
    const a = resolve($('#from').value);
    if (!a) {
        $('#res').innerHTML = '<div class="card warn">Select a valid From location first.</div>';
        return;
    }
    const k = c.dataset.n, f = N[a].f, ok = n => n.f == f && n.id != a && (k == 'L' ? n.t == 'toilet' && /Ladies/.test(n.label) : k == 'G' ? n.t == 'toilet' && /Gents/.test(n.label) : k == 'S' ? n.t == 'stair' : n.t == 'entry' && n.k != 'CB');
    let best = null;
    for (const n of Object.values(N))
        if (ok(n)) {
            const r = dij(a, n.id, new Set(), new Set(), $('#ns').checked);
            if (r && (!best || r.steps < best.steps))
                best = {
                    id: n.id,
                    steps: r.steps
                };
        }
    if (!best) {
        $('#res').innerHTML = '<div class="card warn">None reachable on this floor.</div>';
        return;
    }
    $('#to').value = nameOf(best.id);
    $('#find').click();
});
const reCalc = () => {
    STEP_LENGTH_METERS = +$('#sl').value || 0.75;
    WALK_SPEED = +$('#sv').value || 1.4;
    if (st.routes.length) {
        st.routes = st.routes.map(metrics);
        panel();
    }
};
$('#mr').onchange = e => {
    MIRROR = e.target.checked;
    panel();
};
$('#sl').onchange = reCalc;
$('#sv').onchange = reCalc;
['from', 'to'].forEach(i => $('#' + i).addEventListener('keydown', e => {
    if (e.key == 'Enter')
        $('#find').click();
}));
addEventListener('keydown', e => {
    if (st.nav == null || /INPUT/.test(e.target.tagName))
        return;
    if (e.key == 'ArrowRight')
        go(st.nav + 1);
    if (e.key == 'ArrowLeft')
        go(st.nav - 1);
});
renderRec();
draw();
try {
    const [h1, h2] = decodeURIComponent(location.hash.slice(1)).split('>');
    if (N[h1] && N[h2]) {
        $('#from').value = nameOf(h1);
        $('#to').value = nameOf(h2);
        $('#find').click();
    }
} catch (e) {
}
