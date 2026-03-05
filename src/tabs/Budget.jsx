import React, { useState, useMemo, useRef } from "react"
import { safeArr, safeObj, uid, toNum, fmt, fmtSigned, getPctColor, clamp,
  TIERS, Btn, PctBar, TierTag, Modal, TH, TD } from "../utils.js"

export default function Budget({ T, D, month, year, MONTH_NAMES, currency,
  income, setIncome, categories, setCategories,
  transactions, subscriptions,
  bankBalance, savingsTarget,
  yearlyData, setYearlyData, trendsData, setTrendsData, realismData, setRealismData,
  alertSensitivity,
}) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0,10)
  const monthName = MONTH_NAMES[month]

  const [search,        setSearch]       = useState("")
  const [filter,        setFilter]       = useState("all")
  const [showNotes,     setShowNotes]    = useState(false)
  const [showReview,    setShowReview]   = useState(false)
  const [showCuts,      setShowCuts]     = useState(false)
  const [cutSims,       setCutSims]      = useState({})
  const [alertsOpen,    setAlertsOpen]   = useState(false)
  const [snoozed,       setSnoozed]      = useState(new Set())
  const [acked,         setAcked]        = useState(new Set())
  const [saveMsg,       setSaveMsg]      = useState("")
  const [dragOver,      setDragOver]     = useState(null)
  const [catModal,      setCatModal]     = useState(null)
  const [itemModal,     setItemModal]    = useState(null)
  const [incomeModal,   setIncomeModal]  = useState(null)
  const dragRef = useRef(null)

  // ── Virtual sub transactions for this month ───────────────────────────────
  const subTx = useMemo(() => safeArr(subscriptions).filter(s=>s.active!==false).map(s => {
    const day = Math.min(parseInt(s.day)||1, 28)
    return { id:`sub-${s.id}`, amount:s.amount, catId:s.catId, itemId:s.itemId,
      date:`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` }
  }), [subscriptions, month, year])

  const postedTx = useMemo(() =>
    [...safeArr(transactions), ...subTx].filter(t => {
      const d = new Date(t.date+"T12:00:00")
      return d.getFullYear()===year && d.getMonth()===month && t.date<=todayStr
    })
  , [transactions, subTx, month, year, todayStr])

  const txByItem = useMemo(() => {
    const m = {}
    postedTx.forEach(t => { if (t.itemId) m[t.itemId] = (m[t.itemId]||0) + toNum(t.amount) })
    return m
  }, [postedTx])

  const catsDisplay = useMemo(() => safeArr(categories).map(c => ({
    ...c, items: safeArr(c.items).map(i => ({ ...i, actual: String(toNum(i.actual)+(txByItem[i.id]||0)) }))
  })), [categories, txByItem])

  const catSum = (cat, f) => safeArr(cat.items).reduce((s,i)=>s+toNum(i[f]),0)
  const allItems = catsDisplay.flatMap(c=>safeArr(c.items))
  const totalIncome   = safeArr(income).reduce((s,r)=>s+toNum(r.amount),0)
  const totalBudgeted = allItems.reduce((s,i)=>s+toNum(i.budgeted),0)
  const totalActual   = allItems.reduce((s,i)=>s+toNum(i.actual),0)
  const remaining     = totalIncome - totalActual
  const globalPct     = totalIncome > 0 ? (totalActual/totalIncome)*100 : 0
  const savingsRate   = totalIncome > 0 ? ((totalIncome-totalActual)/totalIncome)*100 : 0
  const totalPostedTx = postedTx.reduce((s,t)=>s+toNum(t.amount),0)
  const estBalance    = toNum(bankBalance) - totalPostedTx

  // Tier totals
  const tierTotals = useMemo(() => {
    const t = { essential:{b:0,a:0}, need:{b:0,a:0}, want:{b:0,a:0} }
    catsDisplay.forEach(c => { if(t[c.tier]){ t[c.tier].b+=catSum(c,"budgeted"); t[c.tier].a+=catSum(c,"actual") } })
    return t
  }, [catsDisplay])

  // Alerts
  const alerts = useMemo(() => {
    const list = []
    const thresh = { Low:{w:90,c:110}, Medium:{w:75,c:100}, High:{w:60,c:85} }
    const {w,c} = thresh[alertSensitivity]||thresh.Medium
    allItems.forEach(i => {
      const b=toNum(i.budgeted), a=toNum(i.actual); if(!b) return
      const p=(a/b)*100
      if(p>=c) list.push({id:`c-${i.id}`,type:"critical",msg:`${i.label} is over budget (${p.toFixed(0)}%)`})
      else if(p>=w) list.push({id:`w-${i.id}`,type:"warning",msg:`${i.label} approaching limit (${p.toFixed(0)}%)`})
    })
    return list
  }, [allItems, alertSensitivity])
  const visAlerts = alerts.filter(a=>!snoozed.has(a.id)&&!acked.has(a.id))

  // Filter
  const filteredCats = useMemo(() => {
    let cats = catsDisplay
    if(["essential","need","want"].includes(filter)) cats = cats.filter(c=>c.tier===filter)
    else if(filter==="over") cats = cats.filter(c=>safeArr(c.items).some(i=>toNum(i.actual)>toNum(i.budgeted)&&toNum(i.budgeted)>0))
    if(search.trim()) { const q=search.toLowerCase(); cats=cats.filter(c=>c.name.toLowerCase().includes(q)||safeArr(c.items).some(i=>i.label.toLowerCase().includes(q))) }
    return cats
  }, [catsDisplay, filter, search])

  // Review score
  const reviewData = useMemo(() => {
    const scored = allItems.filter(i=>toNum(i.budgeted)||toNum(i.actual)).map(i => {
      const b=toNum(i.budgeted), a=toNum(i.actual)
      const pct = b>0?(a/b)*100:a>0?999:0
      return { label:i.label, b, a, pct }
    })
    const max = scored.length||1
    const earned = scored.reduce((s,i)=>s+(i.pct<=80?1:i.pct<=100?.7:i.pct<=120?.3:0),0)
    return { items:scored, score:Math.round((earned/max)*100) }
  }, [allItems])

  // Cut simulator
  const cutItems = useMemo(() => allItems.filter(i=>toNum(i.actual)>0), [allItems])
  const cutTotal  = cutItems.reduce((s,i)=>s+(toNum(i.actual)*((cutSims[i.id]||0)/100)),0)

  // Mutations
  const updateItem = (catId, itemId, f, v) =>
    setCategories(cs=>safeArr(cs).map(c=>c.id!==catId?c:{...c,items:safeArr(c.items).map(i=>i.id!==itemId?i:{...i,[f]:v})}))

  const addItem = (catId, item) =>
    setCategories(cs=>safeArr(cs).map(c=>c.id!==catId?c:{...c,items:[...safeArr(c.items),{id:uid(),...item}]}))

  const deleteItem = (catId, itemId) =>
    setCategories(cs=>safeArr(cs).map(c=>c.id!==catId?c:{...c,items:safeArr(c.items).filter(i=>i.id!==itemId)}))

  const toggleCollapse = id =>
    setCategories(cs=>safeArr(cs).map(c=>c.id===id?{...c,collapsed:!c.collapsed}:c))

  // Drag
  const onDragStart = id => { dragRef.current = id }
  const onDragOver  = (e, id) => { e.preventDefault(); setDragOver(id) }
  const onDrop = id => {
    if(!dragRef.current||dragRef.current===id){setDragOver(null);return}
    setCategories(cs=>{
      const next=[...safeArr(cs)]
      const from=next.findIndex(c=>c.id===dragRef.current), to=next.findIndex(c=>c.id===id)
      const [mv]=next.splice(from,1); next.splice(to,0,mv); return next
    })
    dragRef.current=null; setDragOver(null)
  }

  // Save snapshot
  const saveSnapshot = () => {
    const snap = { month, year, income:totalIncome, budgeted:totalBudgeted, actual:totalActual,
      categories:safeArr(categories).map(c=>({...c})) }
    setYearlyData(prev=>{
      const arr=[...safeArr(prev)]
      const idx=arr.findIndex(m=>m.month===month&&m.year===year)
      if(idx>=0) arr[idx]=snap; else arr.push(snap)
      return arr.sort((a,b)=>(a.year*12+a.month)-(b.year*12+b.month))
    })
    const lbl=`${MONTH_NAMES[month].slice(0,3)} ${year}`
    setTrendsData(prev=>{
      const t={...safeObj(prev)}
      safeArr(categories).forEach(cat=>{
        if(!t[cat.id]) t[cat.id]={name:cat.name,tier:cat.tier,months:[]}
        const entry={label:lbl,actual:catSum(cat,"actual"),budgeted:catSum(cat,"budgeted")}
        const mi=t[cat.id].months.findIndex(m=>m.label===lbl)
        if(mi>=0) t[cat.id].months[mi]=entry; else t[cat.id].months.push(entry)
        if(t[cat.id].months.length>6) t[cat.id].months=t[cat.id].months.slice(-6)
      })
      return t
    })
    setRealismData(prev=>{
      const r={...safeObj(prev)}
      safeArr(categories).forEach(cat=>safeArr(cat.items).forEach(item=>{
        const a=toNum(item.actual); if(!a) return
        if(!r[item.id]) r[item.id]={months:[],avg:0}
        const mi=r[item.id].months.findIndex(m=>m.label===lbl)
        if(mi>=0) r[item.id].months[mi].actual=a; else r[item.id].months.push({label:lbl,actual:a})
        if(r[item.id].months.length>6) r[item.id].months=r[item.id].months.slice(-6)
        r[item.id].avg=r[item.id].months.reduce((s,m)=>s+m.actual,0)/r[item.id].months.length
      }))
      return r
    })
    setSaveMsg("✅ Month saved!"); setTimeout(()=>setSaveMsg(""),2500)
  }

  const card = { background:T.card, border:`1px solid ${T.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }
  const hdr  = { padding:"10px 14px", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:T.thBg }
  const inp  = { padding:"8px 10px", border:`1px solid ${T.border}`, borderRadius:8, background:T.input, color:T.text, fontSize:13, fontFamily:"inherit", outline:"none", width:"100%" }

  return (
    <div>
      {/* Alerts */}
      {visAlerts.length>0 && (
        <div style={{...card,marginBottom:12}}>
          <div style={{...hdr,cursor:"pointer"}} onClick={()=>setAlertsOpen(o=>!o)}>
            <span style={{fontSize:13,fontWeight:600,color:"#ef4444"}}>🔔 {visAlerts.length} alert{visAlerts.length>1?"s":""}</span>
            <Btn color="#ef4444">{alertsOpen?"Hide":"Show"}</Btn>
          </div>
          {alertsOpen && visAlerts.map(a=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderBottom:`1px solid ${T.border}`}}>
              <span>{a.type==="critical"?"🔴":"⚠️"}</span>
              <span style={{flex:1,fontSize:12,color:T.text}}>{a.msg}</span>
              <Btn onClick={()=>setSnoozed(s=>new Set([...s,a.id]))} color={T.textMuted}>Snooze</Btn>
              <Btn onClick={()=>setAcked(s=>new Set([...s,a.id]))} color={T.textMuted}>✕</Btn>
            </div>
          ))}
        </div>
      )}

      {/* Income */}
      <div style={card}>
        <div style={hdr}>
          <span style={{fontSize:13,fontWeight:600,color:T.text}}>💵 Income — {monthName} {year}</span>
          <Btn onClick={()=>setIncomeModal({mode:"add",source:"",amount:"",isPrimary:false})} color="#22c55e">+ Add</Btn>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={TH}>Source</th>
            <th style={{...TH,textAlign:"right"}}>Amount</th>
            <th style={{...TH,width:30}}/>
          </tr></thead>
          <tbody>
            {safeArr(income).map(r=>(
              <tr key={r.id} style={{cursor:"pointer"}}
                onClick={()=>setIncomeModal({mode:"edit",id:r.id,source:r.source,amount:r.amount,isPrimary:r.isPrimary||false})}>
                <td style={TD}>
                  <span style={{color:T.text}}>{r.source||<span style={{color:T.textMuted}}>Unnamed</span>}</span>
                  {r.isPrimary&&<span style={{fontSize:9,background:"#fef3c7",color:"#d97706",borderRadius:4,padding:"1px 5px",fontWeight:700,marginLeft:6}}>★ primary</span>}
                </td>
                <td style={{...TD,textAlign:"right",fontWeight:600,color:"#22c55e"}}>{toNum(r.amount)>0?fmt(toNum(r.amount),currency):"—"}</td>
                <td style={{...TD,textAlign:"center",fontSize:11,color:T.textMuted}}>✏️</td>
              </tr>
            ))}
            <tr style={{background:T.thBg}}>
              <td style={{...TD,fontWeight:700,color:T.text}}>Total</td>
              <td style={{...TD,textAlign:"right",fontWeight:800,color:"#22c55e",fontSize:15}}>{fmt(totalIncome,currency)}</td>
              <td style={TD}/>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
        {[
          {l:"Income",    v:fmt(totalIncome,currency),     c:"#22c55e"},
          {l:"Budgeted",  v:fmt(totalBudgeted,currency),   c:"#60a5fa"},
          {l:"Spent",     v:fmt(totalActual,currency),     c:"#f97316"},
          {l:"Remaining", v:fmtSigned(remaining,currency), c:remaining>=0?"#22c55e":"#ef4444"},
        ].map(({l,v,c})=>(
          <div key={l} style={{...card,marginBottom:0,padding:"14px 16px",borderTop:`3px solid ${c}`}}>
            <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"'Outfit',sans-serif"}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{...card,padding:"12px 14px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:13}}>
          <span style={{color:T.textSub}}>Overall spending</span>
          <span style={{fontWeight:700,color:getPctColor(globalPct)}}>{globalPct.toFixed(1)}%</span>
        </div>
        <PctBar pct={globalPct} height={10}/>
        <div style={{marginTop:8,display:"flex",gap:20,fontSize:12,color:T.textMuted,flexWrap:"wrap"}}>
          {bankBalance&&<span>Bank: <strong style={{color:T.text}}>{fmt(toNum(bankBalance),currency)}</strong> → After tx: <strong style={{color:estBalance>=0?"#22c55e":"#ef4444"}}>{fmt(estBalance,currency)}</strong></span>}
          <span>Savings rate: <strong style={{color:"#4361EE"}}>{savingsRate.toFixed(1)}%</strong>{savingsTarget?` (target ${savingsTarget}%)`:""}</span>
        </div>
      </div>

      {/* Tier cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
        {Object.entries(TIERS).map(([k,t])=>{
          const tt=tierTotals[k]||{b:0,a:0}; const p=tt.b>0?(tt.a/tt.b)*100:0
          return (
            <div key={k} style={{...card,marginBottom:0,padding:"12px 14px",borderLeft:`4px solid ${t.color}`}}>
              <TierTag tier={k} dark={D}/>
              <div style={{fontSize:18,fontWeight:700,color:T.text,marginTop:6}}>{fmt(tt.a,currency)}</div>
              <div style={{fontSize:11,color:T.textMuted}}>of {fmt(tt.b,currency)}</div>
              {tt.b>0&&<PctBar pct={p} height={4}/>}
            </div>
          )
        })}
      </div>

      {/* Search/filter */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          style={{...inp,width:160,padding:"5px 10px"}} placeholder="🔍 Search…"/>
        {["all","essential","need","want","over"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            padding:"4px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
            border:`1px solid ${filter===f?"#4361EE":T.border}`,
            background:filter===f?"#4361EE":"none",
            color:filter===f?"#fff":T.textSub,fontSize:11,textTransform:"capitalize",
          }}>{f}</button>
        ))}
        <button onClick={()=>setShowNotes(v=>!v)} style={{
          padding:"4px 10px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
          border:`1px solid ${showNotes?"#7c3aed":T.border}`,background:showNotes?"#7c3aed":"none",
          color:showNotes?"#fff":T.textSub,fontSize:11,
        }}>Notes</button>
      </div>

      {/* Category cards */}
      {filteredCats.map(cat=>{
        const t=TIERS[cat.tier]||TIERS.want
        const cA=catSum(cat,"actual"), cB=catSum(cat,"budgeted"), cPct=cB>0?(cA/cB)*100:0
        return (
          <div key={cat.id} style={{...card,borderLeft:`4px solid ${cat.colour||t.color}`,outline:dragOver===cat.id?`2px dashed ${t.color}`:"none"}}
            draggable onDragStart={()=>onDragStart(cat.id)} onDragOver={e=>onDragOver(e,cat.id)} onDrop={()=>onDrop(cat.id)}>
            <div style={hdr}>
              <div style={{display:"flex",alignItems:"center",gap:8,flex:1,cursor:"pointer"}} onClick={()=>toggleCollapse(cat.id)}>
                <span style={{color:T.textMuted,fontSize:11}}>{cat.collapsed?"▶":"▼"}</span>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text}}>{cat.name}</span>
                <TierTag tier={cat.tier} dark={D}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:15,fontWeight:700,color:cPct>100?"#ef4444":T.text}}>{fmt(cA,currency)}</div>
                  <div style={{fontSize:11,color:T.textMuted}}>of {fmt(cB,currency)}</div>
                </div>
                <Btn onClick={e=>{e.stopPropagation();setCatModal({mode:"edit",id:cat.id,name:cat.name,tier:cat.tier,colour:cat.colour||""})}} color={T.textMuted}>✏️</Btn>
                <Btn onClick={e=>{e.stopPropagation();setCategories(cs=>safeArr(cs).filter(c=>c.id!==cat.id))}} color="#ef4444">✕</Btn>
              </div>
            </div>
            {cB>0&&<div style={{padding:"2px 14px 5px"}}><PctBar pct={cPct} height={3}/></div>}
            {!cat.collapsed&&(
              <>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead><tr>
                    <th style={{...TH,paddingLeft:28}}>Item</th>
                    <th style={{...TH,textAlign:"right"}}>Budget</th>
                    <th style={{...TH,textAlign:"right"}}>Actual</th>
                    <th style={{...TH,textAlign:"center",width:90}}>%</th>
                    {showNotes&&<th style={TH}>Notes</th>}
                    <th style={{...TH,width:30}}/>
                  </tr></thead>
                  <tbody>
                    {safeArr(cat.items).map(item=>{
                      const bv=toNum(item.budgeted), av=toNum(item.actual)
                      const ip=bv>0?(av/bv)*100:av>0?999:0
                      return (
                        <tr key={item.id} style={{cursor:"pointer",background:ip>100?D?"rgba(239,68,68,.06)":"#fff5f5":undefined}}
                          onClick={()=>{
                            const raw=safeArr(categories).find(c=>c.id===cat.id)
                            const ri=safeArr(raw?.items).find(i=>i.id===item.id)
                            if(ri) setItemModal({mode:"edit",catId:cat.id,id:item.id,label:ri.label,budgeted:ri.budgeted,actual:ri.actual,notes:ri.notes||""})
                          }}>
                          <td style={{...TD,paddingLeft:28,color:T.text}}>
                            {item.label}
                            {txByItem[item.id]>0&&<span title="Has transactions" style={{fontSize:9,color:"#3b82f6",marginLeft:4}}>●</span>}
                          </td>
                          <td style={{...TD,textAlign:"right",color:T.textSub}}>{bv?fmt(bv,currency):"—"}</td>
                          <td style={{...TD,textAlign:"right",fontWeight:600,color:ip>100?"#ef4444":av>0?T.text:T.textMuted}}>{av?fmt(av,currency):"—"}</td>
                          <td style={{...TD,textAlign:"center"}}>
                            {bv>0?<><div style={{fontSize:10,fontWeight:700,color:getPctColor(ip)}}>{Math.min(ip,999).toFixed(0)}%</div><PctBar pct={ip} height={3}/></>:"—"}
                          </td>
                          {showNotes&&<td style={{...TD,fontSize:11,color:T.textMuted}}>{item.notes||"—"}</td>}
                          <td style={{...TD,textAlign:"center"}}>
                            <button onClick={e=>{e.stopPropagation();deleteItem(cat.id,item.id)}}
                              style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:13}}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{padding:"7px 12px",borderTop:`1px solid ${T.border}`}}>
                  <Btn onClick={()=>setItemModal({mode:"add",catId:cat.id,label:"",budgeted:"",actual:"",notes:""})} color={t.color}>+ Item</Btn>
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Actions */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
        <Btn onClick={()=>setCatModal({mode:"add",name:"",tier:"essential",colour:""})} color="#4361EE">+ Category</Btn>
        <Btn onClick={saveSnapshot} color="#22c55e">💾 Save Month</Btn>
        <Btn onClick={()=>setShowReview(v=>!v)} color="#7c3aed">📊 Review</Btn>
        <Btn onClick={()=>setShowCuts(v=>!v)} color="#f97316">✂️ Cut List</Btn>
      </div>
      {saveMsg&&<div style={{marginTop:8,fontSize:12,color:"#22c55e"}}>{saveMsg}</div>}

      {/* Review */}
      {showReview&&(
        <div style={{...card,marginTop:12,padding:16}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:15,fontWeight:700,marginBottom:12,color:T.text}}>
            📊 Review — Score: <span style={{color:reviewData.score>=80?"#22c55e":reviewData.score>=60?"#f59e0b":"#ef4444"}}>{reviewData.score}/100</span>
          </div>
          {reviewData.items.map((i,idx)=>(
            <div key={idx} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <span style={{flex:1,fontSize:12,color:T.textSub}}>{i.label}</span>
              <span style={{fontSize:11,color:T.textMuted,width:100,textAlign:"right"}}>{fmt(i.a,currency)}/{fmt(i.b,currency)}</span>
              <div style={{width:100}}><div style={{fontSize:10,fontWeight:700,color:getPctColor(i.pct)}}>{Math.min(i.pct,999).toFixed(0)}%</div><PctBar pct={i.pct} height={4}/></div>
            </div>
          ))}
        </div>
      )}

      {/* Cut list */}
      {showCuts&&(
        <div style={{...card,marginTop:12,padding:16}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,marginBottom:10,color:T.text}}>✂️ Cut Simulator</div>
          {cutItems.map(item=>(
            <div key={item.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{flex:1,fontSize:12,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
              <span style={{fontSize:11,color:T.textMuted,width:55,textAlign:"right"}}>{fmt(toNum(item.actual),currency)}</span>
              <input type="range" min={0} max={100} value={cutSims[item.id]||0}
                onChange={e=>setCutSims(s=>({...s,[item.id]:parseInt(e.target.value)}))}
                style={{width:90,accentColor:"#f97316"}}/>
              <span style={{fontSize:11,fontWeight:700,color:"#f97316",width:32}}>{cutSims[item.id]||0}%</span>
            </div>
          ))}
          <div style={{marginTop:8,paddingTop:8,borderTop:`1px solid ${T.border}`,fontSize:13,fontWeight:700,color:"#22c55e"}}>
            Saving: {fmt(cutTotal,currency)}/mo
          </div>
        </div>
      )}

      {/* ── INCOME MODAL ─────────────────────────────────────────────────── */}
      {incomeModal&&(
        <Modal onClose={()=>setIncomeModal(null)}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>
            {incomeModal.mode==="add"?"➕ Add Income Source":"✏️ Edit Income Source"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input autoFocus style={inp} placeholder="Source name e.g. Part-time job"
              value={incomeModal.source} onChange={e=>setIncomeModal(m=>({...m,source:e.target.value}))}/>
            <input style={inp} placeholder={`Amount (${currency})`} inputMode="decimal"
              value={incomeModal.amount}
              onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setIncomeModal(m=>({...m,amount:e.target.value}))}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",background:T.thBg,borderRadius:8}}>
              <span style={{fontSize:13,color:T.text}}>Primary income</span>
              <div onClick={()=>setIncomeModal(m=>({...m,isPrimary:!m.isPrimary}))} style={{
                width:40,height:22,borderRadius:99,position:"relative",cursor:"pointer",
                background:incomeModal.isPrimary?"#4361EE":"#cbd5e1",transition:"background .2s",flexShrink:0,
              }}>
                <div style={{position:"absolute",top:3,left:incomeModal.isPrimary?19:3,width:16,height:16,
                  borderRadius:99,background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              {incomeModal.mode==="edit"
                ?<Btn onClick={()=>{setIncome(i=>safeArr(i).filter(x=>x.id!==incomeModal.id));setIncomeModal(null)}} color="#ef4444">Delete</Btn>
                :<div/>}
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setIncomeModal(null)} color={T.textMuted}>Cancel</Btn>
                <button onClick={()=>{
                  if(!incomeModal.source.trim()) return
                  if(incomeModal.mode==="add") setIncome(i=>[...safeArr(i),{id:uid(),source:incomeModal.source,amount:incomeModal.amount,isPrimary:incomeModal.isPrimary}])
                  else setIncome(i=>safeArr(i).map(r=>r.id===incomeModal.id?{...r,source:incomeModal.source,amount:incomeModal.amount,isPrimary:incomeModal.isPrimary}:r))
                  setIncomeModal(null)
                }} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#22c55e",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  {incomeModal.mode==="add"?"Add":"Save"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── CATEGORY MODAL ───────────────────────────────────────────────── */}
      {catModal&&(
        <Modal onClose={()=>setCatModal(null)}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>
            {catModal.mode==="add"?"➕ New Category":"✏️ Edit Category"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input autoFocus style={inp} placeholder="Name (include emoji e.g. 🚗 Transport)"
              value={catModal.name} onChange={e=>setCatModal(m=>({...m,name:e.target.value}))}/>
            <div style={{display:"flex",gap:8}}>
              {Object.entries(TIERS).map(([k,t])=>(
                <button key={k} onClick={()=>setCatModal(m=>({...m,tier:k}))} style={{
                  flex:1,padding:"9px 6px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",
                  fontSize:12,fontWeight:700,
                  border:`1px solid ${catModal.tier===k?t.color:T.border}`,
                  background:catModal.tier===k?`${t.color}22`:"none",
                  color:catModal.tier===k?t.color:T.textMuted,
                }}>{t.label}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              {catModal.mode==="edit"
                ?<Btn onClick={()=>{setCategories(cs=>safeArr(cs).filter(c=>c.id!==catModal.id));setCatModal(null)}} color="#ef4444">Delete</Btn>
                :<div/>}
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setCatModal(null)} color={T.textMuted}>Cancel</Btn>
                <button onClick={()=>{
                  if(!catModal.name.trim()) return
                  if(catModal.mode==="add") setCategories(cs=>[...safeArr(cs),{id:uid(),name:catModal.name,tier:catModal.tier,colour:"",collapsed:false,items:[]}])
                  else setCategories(cs=>safeArr(cs).map(c=>c.id===catModal.id?{...c,name:catModal.name,tier:catModal.tier}:c))
                  setCatModal(null)
                }} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#4361EE",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  {catModal.mode==="add"?"Add":"Save"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── ITEM MODAL ───────────────────────────────────────────────────── */}
      {itemModal&&(
        <Modal onClose={()=>setItemModal(null)}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>
            {itemModal.mode==="add"?"➕ Add Item":"✏️ Edit Item"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <input autoFocus style={inp} placeholder="Label (e.g. ⛽ Fuel)"
              value={itemModal.label} onChange={e=>setItemModal(m=>({...m,label:e.target.value}))}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Budgeted</div>
                <input style={inp} placeholder="0.00" inputMode="decimal" value={itemModal.budgeted}
                  onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setItemModal(m=>({...m,budgeted:e.target.value}))}}/>
              </div>
              <div>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:4}}>Actual spent</div>
                <input style={inp} placeholder="0.00" inputMode="decimal" value={itemModal.actual}
                  onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setItemModal(m=>({...m,actual:e.target.value}))}}/>
              </div>
            </div>
            {toNum(itemModal.budgeted)>0&&(
              <PctBar pct={toNum(itemModal.actual)/toNum(itemModal.budgeted)*100} height={6}/>
            )}
            <input style={inp} placeholder="Notes (optional)" value={itemModal.notes||""}
              onChange={e=>setItemModal(m=>({...m,notes:e.target.value}))}/>
            <div style={{display:"flex",gap:8,justifyContent:"space-between",borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              {itemModal.mode==="edit"
                ?<Btn onClick={()=>{deleteItem(itemModal.catId,itemModal.id);setItemModal(null)}} color="#ef4444">Delete</Btn>
                :<div/>}
              <div style={{display:"flex",gap:8}}>
                <Btn onClick={()=>setItemModal(null)} color={T.textMuted}>Cancel</Btn>
                <button onClick={()=>{
                  if(!itemModal.label.trim()) return
                  if(itemModal.mode==="add") addItem(itemModal.catId,{label:itemModal.label,budgeted:itemModal.budgeted,actual:itemModal.actual,notes:itemModal.notes})
                  else {
                    updateItem(itemModal.catId,itemModal.id,"label",itemModal.label)
                    updateItem(itemModal.catId,itemModal.id,"budgeted",itemModal.budgeted)
                    updateItem(itemModal.catId,itemModal.id,"actual",itemModal.actual)
                    updateItem(itemModal.catId,itemModal.id,"notes",itemModal.notes)
                  }
                  setItemModal(null)
                }} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#4361EE",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  {itemModal.mode==="add"?"Add Item":"Save"}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
