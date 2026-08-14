// Generates inline pixel-art SVG frames for the DSKIN pets:
// mice (idle/blink/walkA/walkB), whale (idle/blink/walkA/walkB), and
// 4 switchable kittens — 大橘 orange tabby, 小白 white, 玄猫 black,
// 花猫 tuxedo — each with idle/blink/walkA/walkB plus a face icon.
// Run: node scripts/gen-mascots.mjs
const check = (rows) => {
  const len = Math.max(...rows.map((r) => r.length))
  return rows.map((r) => r.padEnd(len, '.'))
}

/* ============================= mice + whale ============================== */
const MP = { K: '#2e3a59', Y: '#ffd23f', E: '#2e3a59', w: '#ffffff', C: '#ff8c69', S: '#ffd23f' }

const MOUSE_HEAD = check([
  '..KK........KK.......',
  '.KYYK......KYYK......',
  '.KYYYK....KYYYK......',
  'KYYYYK....KYYYYK.....',
  'KYYYYYYYYYYYYYYK.....',
  'KYYYYYYYYYYYYYYK.....',
  'KYYEYYYYYYYEYYK......',
  'KYYEwYYYYYYEwYK......',
  'KYYEYYYYYYYEYYK......',
  'KYYCYYYYYYCYYK.S.....',
  'KYYCCYYYYYCCYYK.S....',
  'KYYYYYYYYYYYYYK..S...',
  '.KKKKKKKKKKKKKK..SS..',
])
const MOUSE_BLINK = MOUSE_HEAD.map((row, i) => {
  if (i === 6) return 'KYYKYYYYYYYKYK......'
  if (i === 7) return 'KYYKYYYYYYYKYK......'
  return row
})
const MOUSE_WALK_A = check([...MOUSE_HEAD, '..KKKK......KKKK.....', '..KK..........KK.....'])
const MOUSE_WALK_B = check([...MOUSE_HEAD, '..KK..........KK.....', '..KKKK......KKKK.....'])

const WHALE_IDLE = check([
  '.....ss........',
  '.....ss........',
  '....ssss.......',
  '....KKKK.......',
  '..KKWWWWKK.....',
  '.KWWWWWWWWK....',
  'KWWWWWWWWWWK...',
  'KWEwBBBBKKWWK..',
  'KWWKBBBBKKWWK..',
  'KWWWWWWWWWWWK..',
  '.KWWWWWWWWWK...',
  '..KWWWWWWWK....',
  '..KKK...KKK....',
  '..K......K.....',
])
const WHALE_BLINK = WHALE_IDLE.map((row, i) => (i === 7 ? 'KWWKBBBBKKWWK..' : row))
const WHALE_WALK_A = WHALE_IDLE.map((row, i) => (i === 12 ? '..KKK....KK....' : row))
const WHALE_WALK_B = WHALE_IDLE.map((row, i) => (i === 12 ? '..KK...KKKK....' : row))

/* ============================ kitten design ================================
   Letters: K outline, F fur, E eye, w glint, A inner ear, N nose,
   M muzzle, W whisker, B chest patch, T stripe/mask (dark fur).             */
const SIT = check([
  '...KK........KK.....',
  '..KFFK......KFFK...',
  '.KFFAK....KAAFK....',
  '.KFAKKK..KKKAFK....',
  'KKKKKKKKKKKKKKKKKK.',
  'KFFFFFFFFFFFFFFFFK.',
  'KFFFFFFFFFFFFFFFFK.',
  'KFEwFFFFFFFwEFFFK..',
  'KFFFFFFFFFFFFFFFFK.',
  'WFFMMMNNNMMMFFFW...',
  'WFFMFMKKKMFMFFFW...',
  'KFFFFMMFFMMFFFFK...',
  'KKKFFFFFFFFFFFFKK..',
  '.KKKKKKKKKKKKKKKK..',
  '......KK....KK......',
])
const STAND = check([
  '...KK........KK.....',
  '..KFFK......KFFK...',
  '.KFFAK....KAAFK....',
  '.KFAKKK..KKKAFK....',
  'KKKKKKKKKKKKKKKKKK.',
  'KFFFFFFFFFFFFFFFFK.',
  'KFFFFFFFFFFFFFFFFK.',
  'KFEwFFFFFFFwEFFFK..',
  'KFFFFFFFFFFFFFFFFK.',
  'WFFMMMNNNMMMFFFW...',
  'WFFMFMKKKMFMFFFW...',
  'KFFMBBBBBBBMMFFK...',
  'KFFMBBBBBBBMMFFK...',
  'KKKFFBBBBBFFKKK....',
  '.KKKKKKKKKKKKKKKK..',
  '...KKK...KKK........',
  '...KKK...KKK........',
])
const WALK_A = check(STAND.map((r, i) => {
  if (i === 15) return '...KKKK..KKK........'
  if (i === 16) return '...KKK...KKK........'
  return r
}))
const WALK_B = check(STAND.map((r, i) => {
  if (i === 15) return '...KKK...KKKK.......'
  if (i === 16) return '...KKK...KKK........'
  return r
}))
/* tuxedo: dark ears + crown + mask band + dark torso with white chest */
const TUX_SIT = check(SIT.map((r, i) => {
  if (i <= 8) return r.replaceAll('F', 'T')            // ears + crown + mask
  if (i === 12) return 'KKKTTBBBBBBBTTKK..'            // black sides, white chest
  if (i === 14) return '......TT....TT......'
  return r
}))
const TUX_STAND = check(STAND.map((r, i) => {
  if (i <= 8) return r.replaceAll('F', 'T')
  if (i === 11 || i === 12) return 'KTTMBBBBBBBMTTK....'
  if (i === 13) return 'KKKTTBBBBBTTKK.....'
  if (i === 15 || i === 16) return '...TTT...TTT........'
  return r
}))
const TUX_WALK_A = check(TUX_STAND.map((r, i) => {
  if (i === 15) return '...TTTT..TTT........'
  return r
}))
const TUX_WALK_B = check(TUX_STAND.map((r, i) => {
  if (i === 15) return '...TTT...TTTT.......'
  return r
}))

/* Palette per cat: fur, eye, glint, ear, nose, muzzle, whisker, chest, stripe/mask, outline */
const CATS = {
  bigorange: {
    name: '大橘',
    fur: '#f5a35c', eye: '#3d2b1f', glint: '#ffffff', ear: '#ffb39a',
    nose: '#ff8a80', muzzle: '#fff1de', whisker: '#fff1de', chest: '#fff1de',
    stripe: '#d97f2b', outline: '#4a3323',
  },
  white: {
    name: '小白',
    fur: '#ffffff', eye: '#3d475e', glint: '#ffffff', ear: '#ffc9c2',
    nose: '#ffb3ab', muzzle: '#ffffff', whisker: '#eef0f6', chest: '#ffffff',
    stripe: '#c9cfda', outline: '#7c8598',
  },
  black: {
    name: '玄猫',
    fur: '#33323d', eye: '#ffcf5e', glint: '#fff8e0', ear: '#8b8a9a',
    nose: '#6e6d7d', muzzle: '#4a4956', whisker: '#6e6d7d', chest: '#4a4956',
    stripe: '#23222c', outline: '#12121a',
  },
  tuxedo: {
    name: '花猫',
    fur: '#f4f4f4', eye: '#5a6a8c', glint: '#ffffff', ear: '#3a3944',
    nose: '#ff9d92', muzzle: '#ffffff', whisker: '#d9dce6', chest: '#ffffff',
    stripe: '#2c2b35', outline: '#2c2b35',
  },
}

function recolor(map, p) {
  const pal = {
    K: p.outline, F: p.fur, E: p.eye, w: p.glint, A: p.ear, N: p.nose,
    M: p.muzzle, W: p.whisker, B: p.chest, T: p.stripe,
  }
  // rows become arrays of color strings (or null for empty cells)
  return map.map((row) => [...row].map((c) => pal[c] ?? null))
}

function blinkOf(sit, p) {
  return sit.map((row, i) => {
    if (i === 7) return row.map((c) => (c === p.eye || c === p.glint ? p.fur : c))
    return row
  })
}

function svg(map) {
  const rects = []
  for (let y = 0; y < map.length; y++) {
    const row = map[y]
    const len = Array.isArray(row) ? row.length : row.length
    for (let x = 0; x < len; x++) {
      const ch = row[x]
      if (ch === '.' || ch === null || ch === undefined) continue
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${ch}"/>`)
    }
  }
  const width = Math.max(...map.map((r) => r.length))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${map.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`
}

function svgP(map) {
  const rects = []
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x]
      if (ch === '.' || ch === undefined || !MP[ch]) continue
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${MP[ch]}"/>`)
    }
  }
  const width = Math.max(...map.map((r) => r.length))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${map.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`
}

const out = {
  MOUSE_IDLE: svgP(MOUSE_HEAD),
  MOUSE_BLINK: svgP(MOUSE_BLINK),
  MOUSE_WALK_A: svgP(MOUSE_WALK_A),
  MOUSE_WALK_B: svgP(MOUSE_WALK_B),
  WHALE_IDLE: svgP(WHALE_IDLE),
  WHALE_BLINK: svgP(WHALE_BLINK),
  WHALE_WALK_A: svgP(WHALE_WALK_A),
  WHALE_WALK_B: svgP(WHALE_WALK_B),
}
const KIT_KEYS = []
for (const [key, p] of Object.entries(CATS)) {
  const tux = key === 'tuxedo'
  const sit = recolor(tux ? TUX_SIT : SIT, p)
  const stand = recolor(tux ? TUX_STAND : STAND, p)
  const walkA = recolor(tux ? TUX_WALK_A : WALK_A, p)
  const walkB = recolor(tux ? TUX_WALK_B : WALK_B, p)
  const blink = blinkOf(sit, p)
  const prefix = key.toUpperCase()
  out[`KIT_${prefix}_IDLE`] = svg(sit)
  out[`KIT_${prefix}_BLINK`] = svg(blink)
  out[`KIT_${prefix}_WALK_A`] = svg(walkA)
  out[`KIT_${prefix}_WALK_B`] = svg(walkB)
  out[`KIT_${prefix}_FACE`] = svg(sit.slice(0, 11))
  out[`KIT_${prefix}_NAME`] = p.name
  KIT_KEYS.push(key)
}
out.KIT_KEYS = KIT_KEYS
const ts = `// GENERATED by scripts/gen-mascots.mjs — do not edit by hand.\n\n` +
  Object.entries(out).map(([k, v]) => `export const ${k} = ${JSON.stringify(v)}`).join('\n\n') + '\n'
console.log(ts)
