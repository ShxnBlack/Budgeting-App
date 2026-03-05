import React, { useState } from "react"
import { safeArr, toNum, fmt, getPctColor, PctBar, Btn, MONTH_NAMES as MN, TH, TD } from "../utils.js"

export default function Yearly({ T, D, month, year, setMonth, setYear, setTab, MONTH_NAMES, currency,
  categories, setCategories, yearlyData, savingsTarget,
}) {
  const now = new Date()
  const [copyM, setCopyM] = useState(MONTH_NAMES[now.getMonth()])
  const [copyY, setCopyY] = useState(String(now.getFullYear()))
  const [msg,   setMsg]   = useState("")
  const yd = safeArr(yearlyData)

  const rates = {
    now:   (() => { const m=yd.find(m=>m.month===month&&m.year===year); return m?.income>0?((m.income-m.actual)/m.income)*100:null })(),
    mo3:   (() => { const r=yd.slice(-3).filter(m=>m.income>0); return r.length?r.reduce((s,m)=>s+((m.income-m.actual)/m.income)*100,0)/r.length:null })(),
    ytd:   (() => { const r=yd.filter(m=>m.income>0); if(!r.length) return null; const tI=r.reduce((s,m)=>s+m.income,0),tA=r.reduce((s,m)=>s+m.actual,0); return tI>0?((tI-tA)/tI)*100:null })(),
  }

  const copyMonth = () => {
    const cy=parseInt(copyY), cm=MONTH_NAMES.indexOf(copyM)
    if(yd.find(m=>m.month===cm&&m.year===cy)){setMsg("Data already exists for that month.");setTimeout(()=>setMsg(""),3000);return}
    setMonth(cm); setYear(cy)
    setCategories(cs=>safeArr(cs).map(c=>({...c,items:safeArr(c.items).map(i=>({...i,actual:"",notes:""}))})))
    setTab("budget")
  }

  const maxV = Math.max(...yd.map(m=>Math.max(m.income||0,m.actual||0)),1)
  const card = {background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}
  const hdr  = {padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.thBg}
  const inp  = {padding:"7px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.input,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}

  return (
    <div>
      {/* Savings rates */}
      <div style={{...card,padding:16,marginBottom:12}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text,marginBottom:12}}>📊 Savings Rates</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
          {[{l:"This Month",v:rates.now,c:"#4361EE"},{l:"3-Mo Avg",v:rates.mo3,c:"#8b5cf6"},{l:"YTD",v:rates.ytd,c:"#06b6d4"},{l:"Target",v:parseFloat(savingsTarget)||null,c:"#22c55e"}].map(({l,v,c})=>(
            <div key={l} style={{textAlign:"center",padding:"12px 8px",background:T.thBg,borderRadius:10}}>
              <div style={{fontSize:10,color:T.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,marginBottom:4}}>{l}</div>
              <div style={{fontSize:22,fontWeight:800,color:c,fontFamily:"'Outfit',sans-serif"}}>{v!=null?`${v.toFixed(1)}%`:"—"}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={card}>
        <div style={hdr}><span style={{fontSize:13,fontWeight:600,color:T.text}}>📅 All Months</span></div>
        {!yd.length
          ?<div style={{padding:24,textAlign:"center",fontSize:13,color:T.textMuted}}>No saved months yet. Click 💾 Save Month on the Budget tab.</div>
          :<table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={TH}>Month</th>
              <th style={{...TH,textAlign:"right"}}>Income</th>
              <th style={{...TH,textAlign:"right"}}>Actual</th>
              <th style={{...TH,textAlign:"right"}}>Saved</th>
              <th style={{...TH,textAlign:"center",width:100}}>Health</th>
            </tr></thead>
            <tbody>
              {yd.map((m,i)=>{
                const rem=m.income-m.actual, pct=m.income>0?(m.actual/m.income)*100:0
                const isCur=m.month===month&&m.year===year
                return (
                  <tr key={i} style={{cursor:"pointer",background:isCur?D?"rgba(67,97,238,.1)":"rgba(67,97,238,.05)":undefined}}
                    onClick={()=>{setMonth(m.month);setYear(m.year);setTab("budget")}}>
                    <td style={{...TD,fontWeight:isCur?700:400,color:isCur?"#7B9EFF":T.text}}>{isCur?"▶ ":""}{MONTH_NAMES[m.month]} {m.year}</td>
                    <td style={{...TD,textAlign:"right",color:"#22c55e"}}>{fmt(m.income,currency)}</td>
                    <td style={{...TD,textAlign:"right",color:"#f87171"}}>{fmt(m.actual,currency)}</td>
                    <td style={{...TD,textAlign:"right",fontWeight:600,color:rem>=0?"#22c55e":"#ef4444"}}>{rem>=0?"+":""}{fmt(rem,currency)}</td>
                    <td style={{...TD,textAlign:"center"}}>
                      <div style={{fontSize:10,fontWeight:700,color:getPctColor(pct)}}>{pct.toFixed(0)}%</div>
                      <PctBar pct={pct} height={4}/>
                    </td>
                  </tr>
                )
              })}
              {(()=>{ const tI=yd.reduce((s,m)=>s+m.income,0),tA=yd.reduce((s,m)=>s+m.actual,0); return (
                <tr style={{background:T.thBg}}>
                  <td style={{...TD,fontWeight:700,color:T.text}}>Totals</td>
                  <td style={{...TD,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{fmt(tI,currency)}</td>
                  <td style={{...TD,textAlign:"right",fontWeight:700,color:"#f87171"}}>{fmt(tA,currency)}</td>
                  <td style={{...TD,textAlign:"right",fontWeight:700,color:tI-tA>=0?"#22c55e":"#ef4444"}}>{fmt(tI-tA,currency)}</td>
                  <td style={TD}/>
                </tr>
              )})()}
            </tbody>
          </table>
        }
      </div>

      {/* Bar chart */}
      {yd.length>0&&(
        <div style={{...card,padding:16}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text,marginBottom:14}}>Monthly at a Glance</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:120}}>
            {yd.map((m,i)=>{
              const isCur=m.month===month&&m.year===year
              return (
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer"}}
                  onClick={()=>{setMonth(m.month);setYear(m.year);setTab("budget")}}>
                  <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:100}}>
                    {[{v:m.income,c:"#22c55e"},{v:m.actual,c:m.actual>m.income?"#ef4444":"#f87171"}].map((b,bi)=>(
                      <div key={bi} style={{flex:1,height:`${Math.max(3,(b.v/maxV)*100)}px`,background:b.c,opacity:isCur?1:.5,borderRadius:"3px 3px 0 0"}}/>
                    ))}
                  </div>
                  <div style={{fontSize:8,color:isCur?T.text:T.textMuted,fontWeight:isCur?700:400}}>{MONTH_NAMES[m.month].slice(0,3)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Copy month */}
      <div style={{...card,padding:16}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>📋 Copy Budget to New Month</div>
        <div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>Copies categories & budgeted amounts, clears actuals.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <select style={{...inp,flex:1}} value={copyM} onChange={e=>setCopyM(e.target.value)}>
            {MONTH_NAMES.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select style={{...inp,width:90}} value={copyY} onChange={e=>setCopyY(e.target.value)}>
            {[now.getFullYear()-1,now.getFullYear(),now.getFullYear()+1].map(y=><option key={y} value={y}>{y}</option>)}
          </select>
          <Btn onClick={copyMonth} color="#4361EE">Copy →</Btn>
        </div>
        {msg&&<div style={{fontSize:12,color:"#ef4444",marginTop:6}}>{msg}</div>}
      </div>
    </div>
  )
}
