/* STEAMSPACE Shape Words → STL engine.
 * Turns student sentences into primitive solids, checks them, and writes binary STL.
 * Units are millimeters everywhere. World axes: X = left→right, Y = front→back, Z = up.
 * Runs in the browser and in Node (for tests). No network, no dependencies.
 */
(function (root) {
  'use strict';

  var SHAPE_WORDS = {
    box: ['rectangular prism', 'rectangle prism', 'prism', 'box', 'block', 'brick', 'rectangle', 'cuboid'],
    cube: ['cube', 'square'],
    cylinder: ['cylinder', 'tube', 'post', 'rod', 'pole', 'disc', 'disk', 'coin'],
    cone: ['cone'],
    sphere: ['sphere', 'ball', 'orb', 'circle'],
    hemisphere: ['hemisphere', 'half sphere', 'half-sphere', 'dome'],
    pyramid: ['square pyramid', 'pyramid'],
    torus: ['torus', 'ring', 'donut', 'doughnut']
  };
  var SHAPE_LABEL = {
    box: 'box', cube: 'cube', cylinder: 'cylinder', cone: 'cone', sphere: 'sphere',
    hemisphere: 'dome', pyramid: 'pyramid', torus: 'ring'
  };
  // Students say "cube" or "square" for a box, and "box" for a cube. Same family when naming a target.
  var SHAPE_FAMILY = {
    box: ['box', 'cube'], cube: ['box', 'cube'],
    sphere: ['sphere'], hemisphere: ['hemisphere', 'sphere'],
    cylinder: ['cylinder'], cone: ['cone'], pyramid: ['pyramid'], torus: ['torus']
  };
  var SHAPE_PHRASES = [];
  Object.keys(SHAPE_WORDS).forEach(function (type) {
    SHAPE_WORDS[type].forEach(function (p) { SHAPE_PHRASES.push({ phrase: p, type: type }); });
  });
  SHAPE_PHRASES.sort(function (a, b) { return b.phrase.length - a.phrase.length; });

  var RELATIONS = [
    ['to the left of', 'left'], ['on the left side of', 'left'], ['on the left of', 'left'], ['left of', 'left'],
    ['to the right of', 'right'], ['on the right side of', 'right'], ['on the right of', 'right'], ['right of', 'right'],
    ['in front of', 'front'], ['in back of', 'back'], ['behind', 'back'],
    ['on top of', 'top'], ['at the top of', 'top'], ['sitting on', 'top'], ['above', 'top'], ['atop', 'top'], ['over', 'top'], ['on', 'top'],
    ['underneath', 'bottom'], ['beneath', 'bottom'], ['below', 'bottom'], ['under', 'bottom'],
    ['in the middle of', 'center'], ['centered on', 'center'], ['centred on', 'center'], ['inside', 'center'],
    ['attached to', 'attach'], ['next to', 'attach'], ['beside', 'attach'], ['touching', 'attach'], ['connected to', 'attach']
  ].sort(function (a, b) { return b[0].length - a[0].length; });

  var TARGET_STOPWORDS = { each: 1, its: 1, top: 1, side: 1, all: 1, every: 1, both: 1, bottom: 1, left: 1, right: 1 };
  var PRONOUNS = { it: 1, this: 1, that: 1, them: 1, they: 1 };
  var FILLER = { very: 1, same: 1, main: 1, whole: 1, other: 1, one: 1, part: 1, shape: 1, piece: 1, robot: 1, character: 1, figure: 1, guy: 1, figurine: 1 };
  var NAME_MODIFIERS = 'left|right|front|back|upper|lower|top|bottom|middle|first|second|third|big|little|small';
  // Words that can follow a shape word without being its name ("a cylinder tall…", "a sphere on top…").
  var NOT_A_NAME = {};
  ('that which who with without and or but is are was will would should can could has have goes go sits sit ' +
   'on onto at near in inside into under below above over atop underneath beneath left right front back behind beside next ' +
   'touching attached connected centered centred sitting stacked resting placed put set stuck glued of for to from then as ' +
   'wide tall high deep long thick across diameter radius width height depth length thickness side sides edge edges each every ' +
   'rotated turned spun twisted tilted tipped lying laying upside sideways colored coloured painted moved shifted slid nudged ' +
   'shape shaped part piece one mm cm millimeters millimetres centimeters centimetres inch inches about around exactly the a an my there here this these those what'
  ).split(' ').forEach(function (w) { NOT_A_NAME[w] = 1; });
  var REL_TEXT = { top: 'on top of', bottom: 'below', left: 'left of', right: 'right of', front: 'in front of', back: 'behind', center: 'centered on' };

  var NUMBER_WORDS = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50
  };

  var COLORS = {
    red: '#e36b4a', orange: '#f08a3c', yellow: '#f0b429', green: '#1f6b4a', blue: '#2f6fb3', teal: '#1a8a8a',
    purple: '#7a4fb3', pink: '#e27aa8', brown: '#8a5a3c', black: '#333333', white: '#f4f4f4', gray: '#9aa3a0', grey: '#9aa3a0'
  };
  var PALETTE = ['#1a8a8a', '#f0b429', '#e36b4a', '#1f6b4a', '#7a4fb3', '#2f6fb3', '#e27aa8', '#8a5a3c'];

  var VAGUE = ['big', 'bigger', 'small', 'smaller', 'little', 'tiny', 'huge', 'large', 'giant', 'medium', 'kinda', 'kind of', 'sort of', 'normal size', 'long-ish', 'skinny', 'fat', 'chunky'];

  var NUM = '(\\d+(?:\\.\\d+)?)';
  var UNIT = '(mm|millimeters?|millimetres?|cm|centimeters?|centimetres?|inches|inch|in\\.)?';

  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function normalize(raw) {
    var t = String(raw || '').toLowerCase();
    t = t.replace(/[\u2018\u2019\u201c\u201d"]/g, ' ').replace(/\u00d7/g, ' x ').replace(/\u00b0/g, ' degrees ');
    t = t.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)\b/g,
      function (w) { return String(NUMBER_WORDS[w]); });
    t = t.replace(/(\d)\s*(mm|cm)\b/g, '$1 $2');
    t = t.replace(/(\d)x(\d)/g, '$1 x $2');
    // Possessives and the many ways students write "on top of".
    t = t.replace(/([a-z])'s\b/g, '$1').replace(/'/g, '');
    t = t.replace(/\bon[- ]?top\b/g, 'on top');
    t = t.replace(/\b(?:on|in) (?:the )?(?:very )?top of\b/g, 'on top of');
    t = t.replace(/\bon (?:the )?very top\b/g, 'on top').replace(/\bon the top\b/g, 'on top');
    t = t.replace(/\bon top (?=(?:the|my|a|an|his|her)\s)/g, 'on top of ');
    t = t.replace(/\bon to\b/g, 'onto').replace(/\bonto\b/g, 'on');
    t = t.replace(/[;!?]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\.$/, '');
    return t;
  }

  function toMM(value, unit, warnings) {
    var v = parseFloat(value);
    if (!unit) return { mm: v, guessed: true };
    if (/^c/.test(unit)) return { mm: v * 10, guessed: false };
    if (/^in/.test(unit)) {
      warnings.push('You used inches. STEAMSPACE uses millimeters (1 inch = 25.4 mm). I converted it for you.');
      return { mm: v * 25.4, guessed: false };
    }
    return { mm: v, guessed: false };
  }

  function findShape(text) {
    var best = null;
    SHAPE_PHRASES.forEach(function (sp) {
      var re = new RegExp('\\b' + escapeRe(sp.phrase) + '(?:e?s)?\\b');
      var m = re.exec(text);
      if (m && (best === null || m.index < best.index || (m.index === best.index && sp.phrase.length > best.phrase.length))) {
        best = { index: m.index, phrase: sp.phrase, type: sp.type, length: m[0].length };
      }
    });
    return best;
  }

  function shapeTypeAtStart(words) {
    for (var i = 0; i < SHAPE_PHRASES.length; i++) {
      var p = SHAPE_PHRASES[i].phrase;
      if (words === p || words.indexOf(p + ' ') === 0 || words === p + 's') return SHAPE_PHRASES[i];
    }
    return null;
  }

  /* Typo distance where swapping two neighbouring letters ("bdoy" → "body") counts as one mistake. */
  function editDistance(a, b) {
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (j = 0; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) {
      for (j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  /* Find an existing part by name: exact, "left arm" = "left-arm"/"leftarm", plurals, then (if allowed) a close typo. */
  function findPart(word, ctx, fuzzy) {
    if (!word) return null;
    var w = word.trim().replace(/\s+/g, ' '), keys = [w, w.replace(/ /g, '-'), w.replace(/ /g, '')];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (ctx.byName[k]) return ctx.byName[k];
      var stem = k.replace(/(?:es|s)$/, '');
      if (stem !== k && ctx.byName[stem]) return ctx.byName[stem];
      if (ctx.byName[k.replace(/s$/, '')]) return ctx.byName[k.replace(/s$/, '')];
    }
    if (!fuzzy || w.indexOf(' ') >= 0 || w.length < 3) return null;
    var best = null, bestD = 99, tie = false;
    Object.keys(ctx.byName).forEach(function (n) {
      var d = editDistance(w, n);
      if (d < bestD) { bestD = d; best = n; tie = false; } else if (d === bestD) tie = true;
    });
    var maxD = w.length >= 5 ? 2 : 1;
    return (best && !tie && bestD <= maxD) ? ctx.byName[best] : null;
  }

  /* The part named in the words after a relation ("the teal body", "it", "the left arm", "the box"). */
  function resolveTarget(words, ctx) {
    var ws = words.split(' '), i, len = function (k) { return ws.slice(0, k).join(' ').length; };
    for (i = 0; i < ws.length; i++) {
      if (i + 1 < ws.length && findPart(ws[i] + ' ' + ws[i + 1], ctx)) return { target: findPart(ws[i] + ' ' + ws[i + 1], ctx), used: len(i + 2) };
      if (findPart(ws[i], ctx)) return { target: findPart(ws[i], ctx), used: len(i + 1) };
    }
    if (PRONOUNS[ws[0]]) return ctx.parts.length ? { target: ctx.parts[ctx.parts.length - 1], used: len(1), pronoun: ws[0] } : { unresolved: ws[0] };
    // "on" + the word "top" is not a target. A longer phrase ("bottom shape") still is.
    if (ws.length === 1 && TARGET_STOPWORDS[ws[0]]) return { skip: true };
    var ordinal = words.trim();
    if (/^(?:first|bottom)(?:\s+(?:one|shape|part|piece))?$/.test(ordinal) && ctx.parts.length) return { target: ctx.parts[0], used: words.length };
    if (/^(?:other|last|previous)(?:\s+(?:one|shape|part|piece))?$/.test(ordinal) && ctx.parts.length) return { target: ctx.parts[ctx.parts.length - 1], used: words.length };
    for (i = 0; i < ws.length; i++) {
      var sp = shapeTypeAtStart(ws.slice(i).join(' '));
      if (sp) {
        var used = len(i) + (i ? 1 : 0) + sp.phrase.length, k;
        for (k = ctx.parts.length - 1; k >= 0; k--) if (ctx.parts[k].type === sp.type) return { target: ctx.parts[k], used: used };
        var fam = SHAPE_FAMILY[sp.type] || [sp.type];
        for (k = ctx.parts.length - 1; k >= 0; k--) if (fam.indexOf(ctx.parts[k].type) >= 0) return { target: ctx.parts[k], used: used, guessed: sp.phrase };
        return { unresolved: ws.slice(i).join(' ') };
      }
      if (!FILLER[ws[i]]) break;
    }
    for (i = 0; i < ws.length; i++) {
      if (FILLER[ws[i]]) continue;
      var f = findPart(ws[i], ctx, true);
      if (f) return { target: f, used: len(i + 1), guessed: ws[i] };
      return { unresolved: ws[i] };
    }
    return { unresolved: ws[0] };
  }

  /* Parse one sentence into a part spec (no geometry yet). */
  function parseSentence(raw, ctx) {
    var warnings = [], notes = [];
    var text = normalize(raw);
    var spec = {
      raw: raw, type: null, name: null, dims: {}, relation: null, target: null, align: null,
      rotZ: 0, rotX: 0, offset: [0, 0, 0], color: null
    };
    if (!text || text.charAt(0) === '#') return { skip: true };
    var work = ' ' + text + ' ';

    function cut(re, fn) {
      work = work.replace(re, function () {
        var r = fn.apply(null, arguments);
        return r === false ? arguments[0] : ' ';
      });
    }

    // Rotation and orientation
    cut(new RegExp('\\b(?:rotated|turned|spun|twisted|rotate|turn)\\s+' + NUM + '\\s*(?:degrees?|deg)?', 'g'), function (_, n) { spec.rotZ += parseFloat(n); });
    cut(new RegExp('\\b(?:tilted|tipped|leaning|tilt|tip)\\s+(?:over\\s+)?' + NUM + '\\s*(?:degrees?|deg)?', 'g'), function (_, n) { spec.rotX += parseFloat(n); });
    cut(/\b(?:lying on its side|laying on its side|on its side|sideways|lying down|laying down)\b/g, function () { spec.rotX += 90; });
    cut(/\bupside[- ]down\b/g, function () { spec.rotX += 180; });

    // Movement nudges
    cut(new RegExp('\\b(?:moved|shifted|slid|nudged|move|shift|slide|nudge)\\s+' + NUM + '\\s*' + UNIT + '\\s+(?:to the\\s+)?(left|right|forward|forwards|backward|backwards|back|up|down|higher|lower)\\b', 'g'),
      function (_, n, u, dir) {
        var mm = toMM(n, u, warnings).mm;
        var map = { left: [-1, 0, 0], right: [1, 0, 0], forward: [0, -1, 0], forwards: [0, -1, 0], backward: [0, 1, 0], backwards: [0, 1, 0], back: [0, 1, 0], up: [0, 0, 1], higher: [0, 0, 1], down: [0, 0, -1], lower: [0, 0, -1] };
        var v = map[dir];
        spec.offset = [spec.offset[0] + v[0] * mm, spec.offset[1] + v[1] * mm, spec.offset[2] + v[2] * mm];
      });

    // Vertical alignment modifiers for side attachments
    cut(/\b(?:near|at|toward|towards) the (top|bottom)\b(?!\s+of)/g, function (_, w) { spec.align = w; });
    cut(/\b(?:down low|up high)\b/g, function (m) { spec.align = /low/.test(m) ? 'bottom' : 'top'; });

    // Color (preview only)
    cut(/\b(?:(?:colou?red|painted|in)\s+)?(red|orange|yellow|green|blue|teal|purple|pink|brown|black|white|gray|grey)\b/g, function (_, c) {
      spec.color = COLORS[c]; notes.push('Color "' + c + '" is for the preview only. The printer uses whatever filament is loaded.');
    });

    // Name
    var NAME_RE = '((?:(?:' + NAME_MODIFIERS + ')\\s+)?[a-z][a-z0-9-]*)';
    function cleanName(n) { return n.replace(/\s+/g, '-'); }
    cut(new RegExp('\\b(?:named|called)\\s+(?:the\\s+)?' + NAME_RE, 'g'), function (_, n) { if (!spec.name) spec.name = cleanName(n); });
    if (!spec.name) {
      var mFor = new RegExp('\\b(?:for|as) (?:the|my|its|his|her|a|an)\\s+' + NAME_RE).exec(work);
      if (mFor && !shapeTypeAtStart(mFor[1]) && !findPart(mFor[1], ctx)) { spec.name = cleanName(mFor[1]); work = work.replace(mFor[0], ' '); }
    }
    if (!spec.name) {
      var mSubj = new RegExp('^\\s*(?:(?:the|my|a|an|his|her|its)\\s+)?' + NAME_RE + '\\s*(?::|\\s(?:is|are|will be|should be)\\s)').exec(work);
      if (mSubj && !NOT_A_NAME[mSubj[1]] && !shapeTypeAtStart(mSubj[1]) && !PRONOUNS[mSubj[1]] && !findPart(mSubj[1], ctx)) { spec.name = cleanName(mSubj[1]); work = work.replace(mSubj[0], ' '); }
    }
    // Who a shape-less sentence is about ("It is on top of the body.", "The hat goes on the head.")
    var mover = null, moverName = null, mMover = /^\s*(?:(?:put|place|move|set|stick|add|attach|glue)\s+)?(?:the|my|his|her|its)?\s*([a-z][a-z0-9-]*)(?:\s+([a-z][a-z0-9-]*))?/.exec(work);
    if (mMover) {
      if (PRONOUNS[mMover[1]]) mover = ctx.parts[ctx.parts.length - 1] || null;
      else {
        mover = (mMover[2] && findPart(mMover[1] + ' ' + mMover[2], ctx)) || findPart(mMover[1], ctx, true);
        var candidate = mMover[1];
        if (!mover && candidate.length > 2 && !NOT_A_NAME[candidate] && !shapeTypeAtStart(candidate) && !PRONOUNS[candidate]) moverName = candidate;
      }
    }

    // Relation to an earlier part
    var relAlt = RELATIONS.map(function (r) { return escapeRe(r[0]); }).join('|');
    var relRe = new RegExp('\\b(' + relAlt + ')\\s+(?:the\\s+|my\\s+|a\\s+|an\\s+|its\\s+)?([a-z][a-z0-9-]*(?:\\s+[a-z][a-z0-9-]*){0,2})', 'g');
    var m, unresolved = null;
    while ((m = relRe.exec(work)) !== null) {
      var relName = null;
      for (var ri = 0; ri < RELATIONS.length; ri++) if (RELATIONS[ri][0] === m[1]) { relName = RELATIONS[ri][1]; break; }
      var res = resolveTarget(m[2], ctx);
      // Step one character on (not past the phrase) so "sitting on top of" can still match "on top of".
      if (res.skip) { relRe.lastIndex = m.index + 1; continue; }
      if (!res.target) { unresolved = unresolved || res.unresolved; relRe.lastIndex = m.index + 1; continue; }
      if (res.guessed) notes.push('I guessed "' + res.guessed + '" means your part "' + res.target.name + '". Check the spelling.');
      if (res.pronoun) notes.push('"' + res.pronoun + '" means the last part you described, "' + res.target.name + '".');
      spec.relation = relName; spec.target = res.target;
      var start = m.index, end = m.index + m[0].length - m[2].length + res.used;
      work = work.slice(0, start) + ' ' + work.slice(end);
      break;
    }
    // "…goes on top." / "on it" with no part named: the last part described.
    if (!spec.relation && !unresolved && ctx.parts.length) {
      var mBare = /\b(?:on top|on it|on its top|above it|over it)\b/.exec(work);
      if (mBare) {
        spec.relation = 'top';
        spec.target = ctx.parts[ctx.parts.length - 1];
        if (mover && spec.target === mover && ctx.parts.length > 1) spec.target = ctx.parts[ctx.parts.length - 2];
        notes.push('You didn\'t name a part, so I put it on top of "' + spec.target.name + '". Write "on top of the ' + spec.target.name + '" to be sure.');
        work = work.slice(0, mBare.index) + ' ' + work.slice(mBare.index + mBare[0].length);
      }
    }
    if (!spec.relation && unresolved) {
      spec.unresolved = unresolved;
      warnings.push('I don\'t know which part "' + unresolved + '" is. Use a name you gave earlier' +
        (ctx.parts.length ? ' (' + ctx.parts.map(function (p) { return p.name; }).join(', ') + ').' : '. Describe that part first.'));
    }
    if (spec.relation === 'attach') {
      spec.relation = 'right';
      notes.push('"Attached/next to" doesn\'t say which side, so I put it on the right. Say left of, right of, on top of, below, in front of or behind to be exact.');
    }

    // Shape word
    var shape = findShape(work);
    if (!shape && spec.relation) {
      // "The head goes on top of the body" before the head exists: read this line again after that part.
      if (!mover && moverName) return { spec: null, unresolved: moverName, warnings: warnings, notes: notes };
      return { spec: null, relocate: { relation: spec.relation, target: spec.target, align: spec.align, offset: spec.offset, mover: mover }, warnings: warnings, notes: notes };
    }
    if (!shape) {
      if (!unresolved) warnings.push('I couldn\'t find a shape word. Try: cube, box, cylinder, cone, sphere, dome, pyramid or ring.');
      return { spec: null, unresolved: unresolved, warnings: warnings, notes: notes };
    }
    spec.type = shape.type;
    var afterShape = work.slice(shape.index + shape.length);
    work = work.slice(0, shape.index) + ' ' + afterShape;
    // Free-write naming: "a box body", "a sphere head", "a cylinder left arm".
    if (!spec.name) {
      var mNoun = new RegExp('^\\s+(?:(' + NAME_MODIFIERS + ')\\s+)?([a-z][a-z0-9-]*)\\b').exec(afterShape);
      if (mNoun && !NOT_A_NAME[mNoun[2]] && !shapeTypeAtStart(mNoun[2]) && !PRONOUNS[mNoun[2]] && VAGUE.indexOf(mNoun[2]) < 0) {
        spec.name = cleanName((mNoun[1] ? mNoun[1] + ' ' : '') + mNoun[2]);
        work = work.replace(mNoun[0], ' ');
      }
    }

    // Dimensions
    var d = spec.dims, guessedUnit = false;
    function mm(n, u) { var r = toMM(n, u, warnings); if (r.guessed) guessedUnit = true; return r.mm; }
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:by|x)\\s*' + NUM + '\\s*' + UNIT + '\\s*(?:by|x)\\s*' + NUM + '\\s*' + UNIT, 'g'),
      function (_, a, ua, b, ub, c, uc) { var u = uc || ub || ua; d.w = mm(a, ua || u); d.d = mm(b, ub || u); d.h = mm(c, uc || u); });
    cut(new RegExp('\\bradius\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.dia = 2 * mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*radius\\b', 'g'), function (_, n, u) { d.dia = 2 * mm(n, u); });
    cut(new RegExp('\\bdiameter\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.dia = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:in\\s+)?(?:diameter|across)\\b', 'g'), function (_, n, u) { d.across = mm(n, u); });
    cut(new RegExp('\\b(?:sides?|edges?)\\s*(?:of|are|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.side = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:on each side|on every side|each side|sides?|edges?|cube)\\b', 'g'), function (_, n, u) { d.side = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:wide|in width|side to side)\\b', 'g'), function (_, n, u) { d.w = mm(n, u); });
    cut(new RegExp('\\b(?:width|wide)\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.w = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:tall|high|in height)\\b', 'g'), function (_, n, u) { d.h = mm(n, u); });
    cut(new RegExp('\\b(?:height|tall|high)\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.h = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:deep|long|in depth|in length|front to back)\\b', 'g'), function (_, n, u) { d.d = mm(n, u); });
    cut(new RegExp('\\b(?:depth|length|deep|long)\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.d = mm(n, u); });
    cut(new RegExp(NUM + '\\s*' + UNIT + '\\s*(?:thick)\\b', 'g'), function (_, n, u) { d.t = mm(n, u); });
    cut(new RegExp('\\bthickness\\s*(?:of|is|=)?\\s*' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { d.t = mm(n, u); });
    var bare = [];
    cut(new RegExp('\\b' + NUM + '\\s*' + UNIT, 'g'), function (_, n, u) { bare.push(mm(n, u)); });
    if (guessedUnit) notes.push('I guessed millimeters for a number with no unit. Write "mm" to be sure.');

    VAGUE.forEach(function (v) {
      if (new RegExp('\\b' + escapeRe(v) + '\\b').test(text)) {
        warnings.push('The computer doesn\'t know how big "' + v + '" is. Give a number in mm instead.');
      }
    });

    resolveDims(spec, bare, warnings, notes);
    if (spec.rotX % 360 !== 0 || spec.rotZ % 360 !== 0) {
      notes.push('Rotation: ' + (spec.rotZ ? spec.rotZ + '° turn' : '') + (spec.rotZ && spec.rotX ? ', ' : '') + (spec.rotX ? spec.rotX + '° tip' : '') + '.');
    }
    return { spec: spec, warnings: warnings, notes: notes };
  }

  function resolveDims(spec, bare, warnings, notes) {
    var d = spec.dims, t = spec.type, DEF = 10;
    function need(label) { warnings.push('No ' + label + ' given. I used ' + DEF + ' mm. Add a number so it\'s really your design.'); return DEF; }
    function takeBare() { return bare.length ? bare.shift() : null; }
    var dia = d.dia || d.across || null;
    var out = {};
    if (t === 'cube') {
      var s = d.side || d.w || d.h || d.d || dia || takeBare();
      if (d.w && d.h && d.d && (d.w !== d.h || d.w !== d.d)) {
        spec.type = 'box'; notes.push('Those sides aren\'t all equal, so this is a box (rectangular prism), not a cube.');
        out = { w: d.w, d: d.d, h: d.h };
      } else { if (!s) s = need('side length'); out = { w: s, d: s, h: s }; }
    } else if (t === 'box') {
      var w = d.w || d.across || d.side || takeBare(), dd = d.d || d.side || takeBare(), h = d.h || d.side || takeBare();
      out = { w: w || need('width (side to side)'), d: dd || need('depth (front to back)'), h: h || need('height (tall)') };
    } else if (t === 'cylinder' || t === 'cone') {
      var cd = dia || d.w || takeBare(), ch = d.h || d.d || takeBare();
      out = { w: cd || need('diameter (across)'), h: ch || need('height (tall)') };
      out.d = out.w;
    } else if (t === 'sphere') {
      var sd = dia || d.w || d.side || d.h || takeBare();
      if (!sd) sd = need('diameter (across)');
      out = { w: sd, d: sd, h: sd };
    } else if (t === 'hemisphere') {
      var hd = dia || d.w || takeBare();
      if (!hd) hd = need('diameter (across)');
      out = { w: hd, d: hd, h: d.h || hd / 2 };
    } else if (t === 'pyramid') {
      var pw = d.w || d.side || dia || takeBare(), ph = d.h || takeBare();
      out = { w: pw || need('base width'), h: ph || need('height (tall)') };
      out.d = d.d || out.w;
    } else if (t === 'torus') {
      var td = dia || d.w || takeBare();
      if (!td) td = need('diameter (across)');
      var tt = d.t || d.h || takeBare() || td / 4;
      if (!d.t && !d.h) notes.push('No thickness given for the ring, so I made it ' + round1(tt) + ' mm thick.');
      if (tt * 2 >= td) { warnings.push('That ring is too thick for its size, so the hole would close up. I made it thinner.'); tt = td / 3; }
      out = { w: td, d: td, h: tt, t: tt };
    }
    if (bare.length) notes.push('I didn\'t use these numbers: ' + bare.map(round1).join(', ') + ' mm. Say what each one measures (wide, deep, tall, across).');
    spec.size = out;
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  /* ---------- geometry ---------- */

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }

  function meshFor(type, s, segs) {
    segs = segs || 32;
    var tris = [], w = s.w / 2, dd = s.d / 2, h = s.h / 2, i, j;
    function quad(a, b, c, e) { tris.push([a, b, c], [a, c, e]); }
    if (type === 'box' || type === 'cube') {
      var v = [[-w, -dd, -h], [w, -dd, -h], [w, dd, -h], [-w, dd, -h], [-w, -dd, h], [w, -dd, h], [w, dd, h], [-w, dd, h]];
      quad(v[0], v[3], v[2], v[1]); quad(v[4], v[5], v[6], v[7]); quad(v[0], v[1], v[5], v[4]);
      quad(v[1], v[2], v[6], v[5]); quad(v[2], v[3], v[7], v[6]); quad(v[3], v[0], v[4], v[7]);
    } else if (type === 'cylinder' || type === 'cone') {
      var top = type === 'cone' ? 0 : 1;
      for (i = 0; i < segs; i++) {
        var a0 = 2 * Math.PI * i / segs, a1 = 2 * Math.PI * ((i + 1) % segs) / segs;
        var b0 = [w * Math.cos(a0), dd * Math.sin(a0), -h], b1 = [w * Math.cos(a1), dd * Math.sin(a1), -h];
        tris.push([[0, 0, -h], b1, b0]);
        if (top) {
          var t0 = [b0[0], b0[1], h], t1 = [b1[0], b1[1], h];
          tris.push([[0, 0, h], t0, t1]); quad(b0, b1, t1, t0);
        } else tris.push([b0, b1, [0, 0, h]]);
      }
    } else if (type === 'sphere' || type === 'hemisphere') {
      var hemi = type === 'hemisphere', rings = hemi ? segs / 4 : segs / 2;
      var zc = hemi ? -h : 0, rz = hemi ? s.h : h;
      var pt = function (ri, si) {
        // Polar angle from +Z. Hemisphere: ri = 0 is the base rim, ri = rings is the top pole.
        var phi = hemi ? (Math.PI / 2) * (1 - ri / rings) : Math.PI * ri / rings;
        var th = 2 * Math.PI * (si % segs) / segs;
        return [w * Math.sin(phi) * Math.cos(th), dd * Math.sin(phi) * Math.sin(th), zc + rz * Math.cos(phi)];
      };
      for (i = 0; i < rings; i++) for (j = 0; j < segs; j++) {
        quad(pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j));
      }
      if (hemi) for (j = 0; j < segs; j++) tris.push([[0, 0, zc], pt(0, j + 1), pt(0, j)]);
    } else if (type === 'pyramid') {
      var p = [[-w, -dd, -h], [w, -dd, -h], [w, dd, -h], [-w, dd, -h]], apex = [0, 0, h];
      quad(p[0], p[3], p[2], p[1]);
      for (i = 0; i < 4; i++) tris.push([p[i], p[(i + 1) % 4], apex]);
    } else if (type === 'torus') {
      var r = s.t / 2, R = w - r, tube = 16;
      var tp = function (i2, j2) {
        var u = 2 * Math.PI * (i2 % segs) / segs, vv = 2 * Math.PI * (j2 % tube) / tube;
        return [(R + r * Math.cos(vv)) * Math.cos(u), (R + r * Math.cos(vv)) * Math.sin(u), r * Math.sin(vv)];
      };
      for (i = 0; i < segs; i++) for (j = 0; j < tube; j++) quad(tp(i, j), tp(i + 1, j), tp(i + 1, j + 1), tp(i, j + 1));
    }
    // Snap coordinates so seam and pole vertices are bit-identical (keeps the mesh watertight).
    tris = tris.map(function (tr) { return tr.map(function (p) { return p.map(function (v) { return Math.round(v * 1e6) / 1e6 + 0; }); }); });
    // Orient every triangle outward: compare its normal with the direction from an interior reference point.
    var torusR = type === 'torus' ? (s.w / 2 - s.t / 2) : 0;
    return tris.filter(function (tr) {
      var n = cross(sub(tr[1], tr[0]), sub(tr[2], tr[0]));
      return dot(n, n) > 1e-12;
    }).map(function (tr) {
      var c = [(tr[0][0] + tr[1][0] + tr[2][0]) / 3, (tr[0][1] + tr[1][1] + tr[2][1]) / 3, (tr[0][2] + tr[1][2] + tr[2][2]) / 3];
      var ref = [0, 0, 0];
      if (type === 'torus') { var ang = Math.atan2(c[1], c[0]); ref = [torusR * Math.cos(ang), torusR * Math.sin(ang), 0]; }
      var n = cross(sub(tr[1], tr[0]), sub(tr[2], tr[0]));
      return dot(n, sub(c, ref)) < 0 ? [tr[0], tr[2], tr[1]] : tr;
    });
  }

  function rotate(p, rotX, rotZ) {
    var x = p[0], y = p[1], z = p[2];
    if (rotX) { var a = rotX * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a); var y2 = y * ca - z * sa; z = y * sa + z * ca; y = y2; }
    if (rotZ) { var b = rotZ * Math.PI / 180, cb = Math.cos(b), sb = Math.sin(b); var x2 = x * cb - y * sb; y = x * sb + y * cb; x = x2; }
    return [x, y, z];
  }

  function bboxOf(tris) {
    var mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    tris.forEach(function (tr) { tr.forEach(function (p) { for (var k = 0; k < 3; k++) { if (p[k] < mn[k]) mn[k] = p[k]; if (p[k] > mx[k]) mx[k] = p[k]; } }); });
    return { min: mn, max: mx };
  }
  function centerOf(b) { return [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2]; }
  function translate(tris, v) { return tris.map(function (tr) { return tr.map(function (p) { return [p[0] + v[0], p[1] + v[1], p[2] + v[2]]; }); }); }

  function placeOffset(spec, own, overlap) {
    var oc = centerOf(own);
    if (!spec.target) return null;
    var tb = spec.target.bbox, tc = centerOf(tb), x = tc[0] - oc[0], y = tc[1] - oc[1], z = tc[2] - oc[2];
    function alignZ() {
      if (spec.align === 'top') z = tb.max[2] - own.max[2];
      else if (spec.align === 'bottom') z = tb.min[2] - own.min[2];
    }
    switch (spec.relation) {
      case 'top': z = tb.max[2] - overlap - own.min[2]; break;
      case 'bottom': z = tb.min[2] + overlap - own.max[2]; break;
      case 'left': x = tb.min[0] + overlap - own.max[0]; alignZ(); break;
      case 'right': x = tb.max[0] - overlap - own.min[0]; alignZ(); break;
      case 'front': y = tb.min[1] + overlap - own.max[1]; alignZ(); break;
      case 'back': y = tb.max[1] - overlap - own.min[1]; alignZ(); break;
      default: break; // center
    }
    return [x, y, z];
  }

  var FLAT_BOTTOM = { box: 1, cube: 1, cylinder: 1, cone: 1, hemisphere: 1, pyramid: 1 };

  /* Build the whole model from a multi-line description. */
  function buildModel(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\n|(?<=[.!?])\s+(?=[A-Za-z])/)
      .filter(function (l) { return l.trim(); }).map(function (l) { return { text: l, note: null }; });
    // A sentence may point at a part described further down. Read it right after that part instead.
    for (var pass = 0; pass <= lines.length; pass++) {
      var model = buildOnce(lines, opts), moved = false;
      for (var i = 0; i < model.feedback.length && !moved; i++) {
        var fb = model.feedback[i];
        if (!fb.unresolved) continue;
        var later = { byName: {} };
        model.parts.forEach(function (p) { if (p.lineIndex > fb.lineIndex) later.byName[p.name] = p; });
        var dep = findPart(fb.unresolved, later, true);
        if (!dep) continue;
        var item = lines.splice(fb.lineIndex, 1)[0];
        item.note = 'This sentence talks about "' + dep.name + '", which you describe later, so I read it after that sentence.';
        lines.splice(dep.lineIndex, 0, item); // dep.lineIndex shifted down by one after the splice
        moved = true;
      }
      if (!moved) return model;
    }
    return model;
  }

  function buildOnce(lines, opts) {
    var overlap = opts.overlap == null ? 1 : opts.overlap;
    var limitCm3 = opts.limitCm3 || 20;
    var ctx = { parts: [], byName: {} };
    var feedback = [];
    lines.forEach(function (item, li) {
      var line = item.text;
      var r = parseSentence(line, ctx);
      if (r.skip) return;
      var fb = { line: line.trim(), lineIndex: li, warnings: r.warnings || [], notes: (item.note ? [item.note] : []).concat(r.notes || []), part: null,
        unresolved: r.spec ? r.spec.unresolved : (r.unresolved || null) };
      feedback.push(fb);
      if (r.relocate) { relocatePart(ctx, r.relocate, fb, overlap); return; }
      if (!r.spec) return;
      var spec = r.spec;
      var idx = ctx.parts.length;
      var baseName = spec.name || (SHAPE_LABEL[spec.type] + (idx + 1));
      var name = baseName, n = 2;
      while (ctx.byName[name]) name = baseName + n++;
      if (spec.name && name !== spec.name) fb.warnings.push('You already have a part called "' + spec.name + '", so this one is "' + name + '".');
      var local = meshFor(spec.type, spec.size).map(function (tr) { return tr.map(function (p) { return rotate(p, spec.rotX, spec.rotZ); }); });
      var own = bboxOf(local), move;
      if (idx === 0) {
        var oc = centerOf(own); move = [-oc[0], -oc[1], -own.min[2]];
        if (spec.relation) fb.notes.push('This is the first part, so it becomes the anchor.');
      } else if (spec.target) {
        move = placeOffset(spec, own, overlap);
      } else {
        var prev = ctx.parts[idx - 1].bbox, oc2 = centerOf(own);
        move = [prev.max[0] + 6 - own.min[0], centerOf(prev)[1] - oc2[1], -own.min[2]];
        fb.warnings.push('You didn\'t say where this part goes, so it\'s floating next to the last part. Add "on top of", "left of", "below"…');
      }
      move = [move[0] + spec.offset[0], move[1] + spec.offset[1], move[2] + spec.offset[2]];
      var tris = translate(local, move);
      var part = {
        id: idx, name: name, type: spec.type, label: SHAPE_LABEL[spec.type], size: spec.size, tris: tris, bbox: bboxOf(tris),
        color: spec.color || PALETTE[idx % PALETTE.length], relation: spec.relation, targetName: spec.target ? spec.target.name : null,
        align: spec.align, rotX: spec.rotX, rotZ: spec.rotZ, upright: (spec.rotX % 360 === 0),
        local: local, offset: spec.offset, lineIndex: li, fb: fb
      };
      ctx.parts.push(part); ctx.byName[name] = part; fb.part = part;
      fb.summary = describePart(part);
    });
    ctx.parts.forEach(function (p) { delete p.fb; });

    // Drop the whole figure onto the build plate and center it.
    if (ctx.parts.length) {
      var all = bboxOf([].concat.apply([], ctx.parts.map(function (p) { return p.tris; })));
      var c = centerOf(all), shift = [-c[0], -c[1], -all.min[2]];
      ctx.parts.forEach(function (p) { p.tris = translate(p.tris, shift); p.bbox = bboxOf(p.tris); });
    }
    var checks = runChecks(ctx.parts, limitCm3);
    return { parts: ctx.parts, feedback: feedback, checks: checks };
  }

  /* "It is on top of the body." — move an earlier part (and everything stacked on it). */
  function relocatePart(ctx, rel, fb, overlap) {
    var p = rel.mover, t = rel.target;
    if (!p) { fb.warnings.push('I couldn\'t tell which part this sentence moves. Start with its name, like "The head is on top of the body."'); return; }
    if (p === t) { fb.warnings.push('A part can\'t go on top of itself. Name two different parts.'); return; }
    function dependsOn(q, root) { var seen = 0; while (q && q.targetName && seen++ < 50) { if (q.targetName === root.name) return true; q = ctx.byName[q.targetName]; } return false; }
    if (dependsOn(t, p)) { fb.warnings.push('"' + t.name + '" is already placed on "' + p.name + '", so I can\'t also put "' + p.name + '" on "' + t.name + '".'); return; }
    if (p.id === 0 && rel.relation === 'top') {
      // "The body is on top of the feet" and body was written first: same picture as feet under the body.
      var under = t;
      var moveU = placeOffset({ relation: 'bottom', target: p, align: rel.align }, bboxOf(under.local), overlap);
      moveU = [moveU[0] + under.offset[0], moveU[1] + under.offset[1], moveU[2] + under.offset[2]];
      var nbU = bboxOf(translate(under.local, moveU));
      var deltaU = [nbU.min[0] - under.bbox.min[0], nbU.min[1] - under.bbox.min[1], nbU.min[2] - under.bbox.min[2]];
      ctx.parts.forEach(function (q) {
        if (q === under || dependsOn(q, under)) { q.tris = translate(q.tris, deltaU); q.bbox = bboxOf(q.tris); }
      });
      under.relation = 'bottom'; under.targetName = p.name; under.align = rel.align;
      if (under.fb) {
        under.fb.warnings = under.fb.warnings.filter(function (w) { return !/floating next to the last part/.test(w); });
        under.fb.summary = describePart(under);
      }
      fb.notes.push('"' + p.name + '" stays on the build plate. I put "' + under.name + '" under it. That is the same as "' + p.name + '" on top of "' + under.name + '".');
      return;
    }
    if (p.id === 0) { fb.warnings.push('"' + p.name + '" is your first part, so it stays on the build plate. Describe where "' + t.name + '" goes instead, like "The ' + t.name + ' is ' + ({ top: 'below', bottom: 'on top of', left: 'right of', right: 'left of', front: 'behind', back: 'in front of' }[rel.relation] || 'on top of') + ' the ' + p.name + '."'); return; }
    var move = placeOffset({ relation: rel.relation, target: t, align: rel.align }, bboxOf(p.local), overlap);
    move = [move[0] + p.offset[0] + rel.offset[0], move[1] + p.offset[1] + rel.offset[1], move[2] + p.offset[2] + rel.offset[2]];
    var nb = bboxOf(translate(p.local, move)), delta = [nb.min[0] - p.bbox.min[0], nb.min[1] - p.bbox.min[1], nb.min[2] - p.bbox.min[2]];
    ctx.parts.forEach(function (q) {
      if (q === p || dependsOn(q, p)) { q.tris = translate(q.tris, delta); q.bbox = bboxOf(q.tris); }
    });
    p.relation = rel.relation; p.targetName = t.name; p.align = rel.align;
    if (p.fb) {
      p.fb.warnings = p.fb.warnings.filter(function (w) { return !/floating next to the last part/.test(w); });
      p.fb.summary = describePart(p);
    }
    fb.notes.push('Moved "' + p.name + '": ' + REL_TEXT[rel.relation] + ' ' + t.name + '.');
  }

  function describePart(p) {
    var s = p.size, mm = function (v) { return round1(v) + ' mm'; }, dims;
    if (p.type === 'box') dims = mm(s.w) + ' wide × ' + mm(s.d) + ' deep × ' + mm(s.h) + ' tall';
    else if (p.type === 'cube') dims = mm(s.w) + ' on each side';
    else if (p.type === 'sphere') dims = mm(s.w) + ' across';
    else if (p.type === 'hemisphere') dims = mm(s.w) + ' across, ' + mm(s.h) + ' tall';
    else if (p.type === 'pyramid') dims = mm(s.w) + ' wide × ' + mm(s.h) + ' tall';
    else if (p.type === 'torus') dims = mm(s.w) + ' across, ' + mm(s.t) + ' thick';
    else dims = mm(s.w) + ' across × ' + mm(s.h) + ' tall';
    var where = p.targetName ? (' — ' + ({ top: 'on top of', bottom: 'below', left: 'left of', right: 'right of', front: 'in front of', back: 'behind', center: 'centered on' }[p.relation] || '') + ' ' + p.targetName + (p.align ? ' (' + p.align + ')' : '')) : (p.id === 0 ? ' — anchor part on the build plate' : '');
    return p.label + ' "' + p.name + '": ' + dims + where;
  }

  function overlapAmount(a, b) {
    var m = Infinity;
    for (var k = 0; k < 3; k++) m = Math.min(m, Math.min(a.max[k], b.max[k]) - Math.max(a.min[k], b.min[k]));
    return m;
  }

  function runChecks(parts, limitCm3) {
    var checks = [];
    if (!parts.length) return [{ id: 'empty', ok: false, level: 'info', text: 'Describe your first shape to start.' }];
    var all = bboxOf([].concat.apply([], parts.map(function (p) { return p.tris; })));
    var L = all.max[0] - all.min[0], W = all.max[1] - all.min[1], H = all.max[2] - all.min[2];
    var cm3 = (L * W * H) / 1000;
    checks.push({
      id: 'size', ok: cm3 <= limitCm3 + 1e-9, level: cm3 <= limitCm3 ? 'pass' : 'fail',
      text: 'Size box: ' + round1(L) + ' × ' + round1(W) + ' × ' + round1(H) + ' mm = ' + round1(cm3) + ' cm³ (limit ' + limitCm3 + ' cm³)',
      value: { L: L, W: W, H: H, cm3: cm3 }
    });
    // Connectivity by bounding-box overlap (a prototype approximation).
    var parent = parts.map(function (_, i) { return i; });
    function find(i) { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; }
    var justTouching = [];
    for (var i = 0; i < parts.length; i++) for (var j = i + 1; j < parts.length; j++) {
      var o = overlapAmount(parts[i].bbox, parts[j].bbox);
      if (o > 0.2) parent[find(i)] = find(j);
      else if (o > -0.05) justTouching.push(parts[i].name + ' / ' + parts[j].name);
    }
    var groups = {};
    parts.forEach(function (p, idx) { var r = find(idx); (groups[r] = groups[r] || []).push(p.name); });
    var gl = Object.keys(groups).map(function (k) { return groups[k]; });
    if (gl.length === 1) checks.push({ id: 'connected', ok: true, level: 'pass', text: 'All parts overlap, so it will print as one figure.' });
    else {
      gl.sort(function (a, b) { return b.length - a.length; });
      checks.push({ id: 'connected', ok: false, level: 'fail', text: 'Floating parts: ' + gl.slice(1).map(function (g) { return g.join(', '); }).join('; ') + '. Connect them to the rest of the figure.' });
    }
    if (justTouching.length) checks.push({ id: 'touching', ok: false, level: 'warn', text: 'Only just touching: ' + justTouching.join('; ') + '. Overlap them a little so they stick together.' });
    // Flat base
    var onPlate = parts.filter(function (p) { return p.bbox.min[2] < 0.5; });
    var flat = onPlate.filter(function (p) { return FLAT_BOTTOM[p.type] && p.upright && p.rotX % 360 === 0; });
    var coneTipDown = onPlate.filter(function (p) { return p.type === 'cone' && Math.abs(p.rotX % 360) === 180; });
    if (flat.length) checks.push({ id: 'base', ok: true, level: 'pass', text: 'Flat base on the plate: ' + flat.map(function (p) { return p.name; }).join(', ') + '.' });
    else checks.push({ id: 'base', ok: false, level: 'warn', text: 'No flat bottom on the build plate' + (coneTipDown.length ? ' (a cone is balancing on its point)' : '') + '. Add a box or cylinder under your figure, or it will need supports.' });
    // Thin features
    var thin = parts.filter(function (p) { var s = p.size; return Math.min(s.w, s.d, s.h, s.t || Infinity) < 2; });
    if (thin.length) checks.push({ id: 'thin', ok: false, level: 'warn', text: 'Too thin to print well (under 2 mm): ' + thin.map(function (p) { return p.name; }).join(', ') + '.' });
    else checks.push({ id: 'thin', ok: true, level: 'pass', text: 'Every part is at least 2 mm thick.' });
    // Overhangs: parts starting well above the plate with nothing directly under their footprint
    var hanging = parts.filter(function (p) {
      if (p.bbox.min[2] < 0.5) return false;
      return !parts.some(function (q) {
        return q !== p && q.bbox.max[2] >= p.bbox.min[2] - 0.5 && q.bbox.min[2] < p.bbox.min[2] &&
          q.bbox.min[0] < p.bbox.max[0] && q.bbox.max[0] > p.bbox.min[0] && q.bbox.min[1] < p.bbox.max[1] && q.bbox.max[1] > p.bbox.min[1];
      });
    });
    if (hanging.length) checks.push({ id: 'overhang', ok: false, level: 'info', text: 'Hanging in the air (the slicer may add supports): ' + hanging.map(function (p) { return p.name; }).join(', ') + '.' });
    var triCount = parts.reduce(function (s, p) { return s + p.tris.length; }, 0);
    checks.push({ id: 'tris', ok: true, level: 'pass', text: triCount + ' triangles (Tinkercad import limit is about 300,000).' });
    return checks;
  }

  /* Binary STL, millimeters. */
  function toSTL(parts, header) {
    var tris = [].concat.apply([], parts.map(function (p) { return p.tris; }));
    var buf = new ArrayBuffer(84 + tris.length * 50), dv = new DataView(buf);
    var h = String(header || 'STEAMSPACE Shape Words to STL (mm)').slice(0, 79);
    for (var i = 0; i < h.length; i++) dv.setUint8(i, h.charCodeAt(i) & 0x7f);
    dv.setUint32(80, tris.length, true);
    var off = 84;
    tris.forEach(function (tr) {
      var n = norm(cross(sub(tr[1], tr[0]), sub(tr[2], tr[0])));
      [n, tr[0], tr[1], tr[2]].forEach(function (v) { for (var k = 0; k < 3; k++) { dv.setFloat32(off, v[k], true); off += 4; } });
      dv.setUint16(off, 0, true); off += 2;
    });
    return buf;
  }

  /* Tinkercad welds everything in one imported file into a single shape, and re-centers every import.
   * So each part gets its own STL, plus the numbers to put it back in place (or rebuild it natively). */
  var TINKERCAD_SHAPE = { box: 'Box', cube: 'Box', cylinder: 'Cylinder', cone: 'Cone', sphere: 'Sphere', hemisphere: 'Half Sphere', pyramid: 'Pyramid', torus: 'Torus' };

  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'part'; }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* Positions are measured from the center of part 1 (the anchor), which goes at the center of the workplane. */
  function buildCard(parts) {
    var a = parts.length ? centerOf(parts[0].bbox) : [0, 0, 0];
    return parts.map(function (p, i) {
      var b = p.bbox, c0 = centerOf(b), c = [c0[0] - a[0], c0[1] - a[1]], r1 = function (v) { var x = round1(v); return x === 0 ? 0 : x; };
      return {
        n: i + 1, name: p.name, file: pad2(i + 1) + '-' + slug(p.name) + '.stl', shape: TINKERCAD_SHAPE[p.type] || p.label,
        sizeX: r1(p.size.w), sizeY: r1(p.size.d), sizeZ: r1(p.size.h),
        turn: r1(((p.rotZ % 360) + 360) % 360), tip: r1(((p.rotX % 360) + 360) % 360),
        x: r1(c[0]), y: r1(c[1]), lift: r1(b.min[2]),
        on: p.targetName ? ((REL_TEXT[p.relation] || '') + ' ' + p.targetName) : 'anchor (sits on the workplane)'
      };
    });
  }

  function cardText(parts, title) {
    var rows = buildCard(parts), out = [];
    out.push((title || 'My figure') + ' — separate shapes for Tinkercad (millimeters)', '');
    out.push('Tinkercad turns ONE .stl file into ONE shape you cannot pull apart.');
    out.push('This zip has one file per shape so you can move each one.');
    out.push('');
    out.push('How to stack them:');
    out.push('  1. Import 01-….stl first. Units: Millimeters. Scale: 100%. Leave it in the middle.');
    out.push('  2. Import the next file. It also lands in the middle.');
    out.push('     Put the Ruler on the workplane and set it to measure from the center.');
    out.push('     Move the shape so its center is at the X and Y below. Negative X = left. Negative Y = front.');
    out.push('  3. Lift it with the black cone on top by the "lift" number.');
    out.push('  4. Repeat for every file. Do NOT click Group until you are done moving shapes.');
    out.push('     Group sticks them together. Then Export → STL for the printer.');
    out.push('');
    rows.forEach(function (r) {
      out.push(r.n + '. ' + r.name + ' — ' + r.shape + '   (file ' + r.file + ')');
      out.push('   size: X ' + r.sizeX + ' × Y ' + r.sizeY + ' × Z ' + r.sizeZ +
        (r.turn ? '   turn ' + r.turn + '°' : '') + (r.tip ? '   tip ' + r.tip + '°' + (r.tip === 90 ? ' (lay it on its side, pointing front to back)' : r.tip === 180 ? ' (upside down)' : ' (tilt it toward the front)') : ''));
      out.push('   center: X ' + r.x + ', Y ' + r.y + '   lift: ' + r.lift + '   — ' + r.on);
    });
    return out.join('\n') + '\n';
  }

  function partSTLs(parts) {
    var rows = buildCard(parts);
    return parts.map(function (p, i) { return { name: rows[i].file, data: toSTL([p], 'STEAMSPACE part ' + p.name + ' (mm)') }; });
  }

  var CRC_TABLE = null;
  function crc32(u8) {
    if (!CRC_TABLE) {
      CRC_TABLE = [];
      for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TABLE[n] = c >>> 0; }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < u8.length; i++) crc = CRC_TABLE[(crc ^ u8[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function utf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    return new Uint8Array(Buffer.from(s, 'utf8'));
  }

  /* Uncompressed (stored) .zip — every OS and Chromebook can open it. files: [{ name, data: string|ArrayBuffer|Uint8Array }] */
  function toZip(files) {
    var entries = files.map(function (f) {
      var data = typeof f.data === 'string' ? utf8(f.data) : new Uint8Array(f.data);
      return { name: utf8(f.name), data: data, crc: crc32(data) };
    });
    var size = 22;
    entries.forEach(function (e) { size += 30 + e.name.length + e.data.length + 46 + e.name.length; });
    var buf = new ArrayBuffer(size), dv = new DataView(buf), u8 = new Uint8Array(buf), off = 0;
    var DOS_TIME = 0, DOS_DATE = (46 << 9) | (9 << 5) | 29; // 2026-09-29
    entries.forEach(function (e) {
      e.offset = off;
      dv.setUint32(off, 0x04034b50, true); dv.setUint16(off + 4, 20, true); dv.setUint16(off + 6, 0x0800, true); dv.setUint16(off + 8, 0, true);
      dv.setUint16(off + 10, DOS_TIME, true); dv.setUint16(off + 12, DOS_DATE, true); dv.setUint32(off + 14, e.crc, true);
      dv.setUint32(off + 18, e.data.length, true); dv.setUint32(off + 22, e.data.length, true);
      dv.setUint16(off + 26, e.name.length, true); dv.setUint16(off + 28, 0, true);
      u8.set(e.name, off + 30); u8.set(e.data, off + 30 + e.name.length);
      off += 30 + e.name.length + e.data.length;
    });
    var cdStart = off;
    entries.forEach(function (e) {
      dv.setUint32(off, 0x02014b50, true); dv.setUint16(off + 4, 20, true); dv.setUint16(off + 6, 20, true); dv.setUint16(off + 8, 0x0800, true);
      dv.setUint16(off + 10, 0, true); dv.setUint16(off + 12, DOS_TIME, true); dv.setUint16(off + 14, DOS_DATE, true);
      dv.setUint32(off + 16, e.crc, true); dv.setUint32(off + 20, e.data.length, true); dv.setUint32(off + 24, e.data.length, true);
      dv.setUint16(off + 28, e.name.length, true); dv.setUint16(off + 30, 0, true); dv.setUint16(off + 32, 0, true);
      dv.setUint16(off + 34, 0, true); dv.setUint16(off + 36, 0, true); dv.setUint32(off + 38, 0, true); dv.setUint32(off + 42, e.offset, true);
      u8.set(e.name, off + 46); off += 46 + e.name.length;
    });
    dv.setUint32(off, 0x06054b50, true); dv.setUint16(off + 8, entries.length, true); dv.setUint16(off + 10, entries.length, true);
    dv.setUint32(off + 12, off - cdStart, true); dv.setUint32(off + 16, cdStart, true);
    return buf;
  }

  /* Rebuild a sentence from structured frame choices (used by the frame builder). */
  function frameSentence(f) {
    var n = f.name ? ' called ' + f.name.replace(/[^a-zA-Z0-9-]/g, '') : '';
    var s;
    switch (f.shape) {
      case 'box': s = 'A box' + n + ', ' + f.w + ' mm wide, ' + f.d + ' mm deep, ' + f.h + ' mm tall'; break;
      case 'cube': s = 'A cube' + n + ', ' + f.w + ' mm on each side'; break;
      case 'cylinder': s = 'A cylinder' + n + ', ' + f.w + ' mm across, ' + f.h + ' mm tall'; break;
      case 'cone': s = 'A cone' + n + ', ' + f.w + ' mm across, ' + f.h + ' mm tall'; break;
      case 'sphere': s = 'A sphere' + n + ', ' + f.w + ' mm across'; break;
      case 'hemisphere': s = 'A dome' + n + ', ' + f.w + ' mm across'; break;
      case 'pyramid': s = 'A pyramid' + n + ', ' + f.w + ' mm wide, ' + f.h + ' mm tall'; break;
      case 'torus': s = 'A ring' + n + ', ' + f.w + ' mm across, ' + f.t + ' mm thick'; break;
      default: s = 'A ' + f.shape + n;
    }
    var rel = { top: 'on top of', bottom: 'below', left: 'left of', right: 'right of', front: 'in front of', back: 'behind', center: 'centered on' };
    if (f.relation && f.target) s += ', ' + rel[f.relation] + ' the ' + f.target;
    if (f.align && (f.relation === 'left' || f.relation === 'right' || f.relation === 'front' || f.relation === 'back')) s += ' near the ' + f.align;
    if (f.rotZ) s += ', rotated ' + f.rotZ + ' degrees';
    if (f.tip) s += ', lying on its side';
    if (f.color) s += ', colored ' + f.color;
    return s + '.';
  }

  var api = {
    normalize: normalize, parseSentence: parseSentence, buildModel: buildModel, toSTL: toSTL, frameSentence: frameSentence,
    buildCard: buildCard, cardText: cardText, partSTLs: partSTLs, toZip: toZip,
    meshFor: meshFor, bboxOf: bboxOf, SHAPE_WORDS: SHAPE_WORDS, SHAPE_LABEL: SHAPE_LABEL, COLORS: COLORS, VAGUE: VAGUE
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WordShape = api;
})(this);
