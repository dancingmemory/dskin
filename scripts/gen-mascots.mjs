// Generates inline pixel-art SVG strings for the DSKIN mascots:
//   - the DeepSeek pixel whale (titlebar icon + favicon companion)
//   - the cartoon pixel mouse mascot (bottom statusbar)
// Run: node scripts/gen-mascots.mjs
const WHALE = [
  '......WWW.W.......',
  '.....WWWWWWW......',
  '...WWWWWWWWWW.....',
  '.WWWWWWWWWWWWW....',
  'WWWWWWWWWWWWWWW...',
  'WWKBBBBBBBBWWWW...',
  'WWKBBBBBBBBWWWW...',
  'WWWBBBBBBBBWWW....',
  'WWWWWWWWWWWWWW....',
  '.WWWWWWWWWWWW.....',
  '..WWWWWWWWWW......',
  '..WWW...WWWW......',
  '..WWW....WWW......',
]
const MOUSE = [
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
]
const PALETTE = {
  W: '#4a90d9',   // whale body
  K: '#2e3a59',   // ink outline
  B: '#eef4ff',   // whale belly
  Y: '#ffd23f',   // mouse body
  E: '#2e3a59',   // eye dark
  w: '#ffffff',   // eye glint
  C: '#ff8c69',   // cheeks
  S: '#ffd23f',   // tail lightning
  s: '#9fd8ff',   // spout
}
function svg(name, map, cells) {
  const rects = []
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      const ch = map[y][x]
      if (ch === '.' || ch === undefined) continue
      const fill = PALETTE[ch] ?? '#fff'
      rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`)
    }
  }
  const width = Math.max(...map.map(r => r.length))
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${map.length}" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`
}
console.log('=== WHALE ===')
console.log(svg('whale', WHALE))
console.log('=== MOUSE ===')
console.log(svg('mouse', MOUSE))
