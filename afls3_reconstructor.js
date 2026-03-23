export function reconstructAFLS(aflsCsvText, heatmapCsvText) {

  const parse = t =>
    t.trim().split(/\r?\n/).map(r => r.split(',').map(v => v.trim()))

  /* ===== Heatmap ===== */
  const hRaw = parse(heatmapCsvText)
  const h = hRaw.slice(1).map(r => r.slice(1).map(Number))

  if (h.length !== 5 || h.some(r => r.length !== 7)) {
    throw new Error("Heatmapは5x7必須")
  }

  let cells = []
  for (let y=0;y<5;y++){
    for (let x=0;x<7;x++){
      cells.push({x,y,value:h[y][x]})
    }
  }

  cells.sort((a,b)=>b.value-a.value)
  cells.forEach((c,i)=>{
    c.rank=i+1
    c.zone = i<21?"HOT":"COLD"
  })

  /* ===== AFLS ===== */
  const aRaw = parse(aflsCsvText)
  const rows = aRaw.slice(1)

  let mapped = []

  rows.forEach((row,y)=>{
    row.slice(1).forEach((v,x)=>{
      const n = Number(v)
      if (!Number.isFinite(n)) return

      const cell = cells.find(c=>c.x===x && c.y===y)

      // ★ここが超重要（クラッシュ防止）
      if (!cell) return

      mapped.push({
        number:n,
        rank:cell.rank,
        zone:cell.zone
      })
    })
  })

  if (mapped.length !== 35) {
    throw new Error("AFLSデータが35個ではありません")
  }

  /* ===== 再構築 ===== */
  const shuffle = a => [...a].sort(()=>Math.random()-0.5)
  const pick = (a,n)=>shuffle(a).slice(0,n)

  const hot = mapped.filter(x=>x.zone==="HOT").sort((a,b)=>a.rank-b.rank)
  const cold = mapped.filter(x=>x.zone==="COLD")

  const g1 = pick(hot.slice(0,9),7)
  const remain = hot.filter(x=>!g1.includes(x))

  const g2 = pick(remain,7)
  const g3 = pick(remain.filter(x=>!g2.includes(x)),7)

  const g4 = pick(cold,7)
  const g5 = pick(cold.filter(x=>!g4.includes(x)),7)

  return {
    groups:[
      g1.map(x=>x.number),
      g2.map(x=>x.number),
      g3.map(x=>x.number),
      g4.map(x=>x.number),
      g5.map(x=>x.number)
    ],
    heatmap: cells   //
  }
}
