export function reconstructAFLS(aflsCsvText, heatmapCsvText) {

  const parse = t =>
    t.trim().split(/\r?\n/).map(r => r.split(',').map(v => v.trim()))

  const hRaw = parse(heatmapCsvText)
  const h = hRaw.slice(1).map(r => r.slice(1).map(Number))

  let cells = []
  for (let y=0;y<5;y++){
    for (let x=0;x<7;x++){
      cells.push({x,y,value:h[y][x]})
    }
  }

  // ヒートマップ順位付け
  cells.sort((a,b)=>b.value-a.value)
  cells.forEach((c,i)=>{
    c.rank=i+1
    c.zone = i<21?"HOT":"COLD"
  })

  const aRaw = parse(aflsCsvText)
  const rows = aRaw.slice(1)

  let mapped = []

  rows.forEach((row,y)=>{
    row.slice(1).forEach((v,x)=>{
      const n = Number(v)
      if (!Number.isFinite(n)) return

      const cell = cells.find(c=>c.x===x && c.y===y)
      if (!cell) return

      mapped.push({
        number:n,
        rank:cell.rank,
        zone:cell.zone
      })
    })
  })

  const shuffle = a => [...a].sort(()=>Math.random()-0.5)
  const pick = (a,n)=>shuffle(a).slice(0,n)

  const hot = mapped.filter(x=>x.zone==="HOT").sort((a,b)=>a.rank-b.rank)
  const cold = mapped.filter(x=>x.zone==="COLD")

  // =========================
  // 🔥 G1（分層抽選）
  // =========================

  const top1_7   = hot.filter(x => x.rank >= 1  && x.rank <= 7)
  const top8_14  = hot.filter(x => x.rank >= 8  && x.rank <= 14)
  const top15_21 = hot.filter(x => x.rank >= 15 && x.rank <= 21)

  const g1 = [
    ...pick(top1_7, 4),
    ...pick(top8_14, 2),
    ...pick(top15_21, 1)
  ]

  // =========================
  // 🔥 G2（取りこぼし＋中位補完）
  // =========================

  const g1Set = new Set(g1)

  // 上位1～7位でG1に選ばれなかったもの
  const remainTop1_7 = top1_7.filter(x => !g1Set.has(x))

  // 8～21位（G1除外）
  const mid8_21 = hot.filter(x =>
    x.rank >= 8 && x.rank <= 21 && !g1Set.has(x)
  )

  const g2 = [
    ...remainTop1_7,
    ...pick(mid8_21, 7 - remainTop1_7.length)
  ]

  // =========================
  // 残りHOT
  // =========================

  const used = new Set([...g1, ...g2])

  const remainHot = hot.filter(x => !used.has(x))

  const g3 = pick(remainHot,7)

  // =========================
  // COLD
  // =========================

  const g4 = pick(cold,7)
  const g5 = pick(cold.filter(x=>!g4.includes(x)),7)

  // =========================
  // 🔧 昇順ソート
  // =========================

  const sortAsc = arr => arr.map(x=>x.number).sort((a,b)=>a-b)

  return {
    groups:[
      sortAsc(g1),
      sortAsc(g2),
      sortAsc(g3),
      sortAsc(g4),
      sortAsc(g5)
    ],
    heatmap: cells
  }
}
