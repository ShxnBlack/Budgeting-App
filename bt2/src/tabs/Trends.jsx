import React from "react"
import { safeArr, safeObj, toNum, fmt, TIERS, TierTag } from "../utils.js"

export default function Trends({ T, D, currency, trendsData }) {
  const entries = Object.entries(safeObj(trendsData))
  const card = {background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}
  const hdr  = {padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.thBg}

  if(!entries.length) return (
    <div style={{...card,padding:28,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:12}}>📈</div>
      <div style={{fontSize:14,fontWeight:600,color:T.text,marginBottom:6}}>No trend data yet</div>
      <div style={{fontSize:12,color:T.textMuted}}>Click <strong>💾 Save Month</strong> on the Budget tab each month to build history.</div>
    </div>
  )

  return (
    <div>
      {entries.map(([catId, catData])=>{
        const months=safeArr(catData.months); if(!months.length) return null
        const maxV=Math.max(...months.map(m=>m.actual||0),1)
        const last=months[months.length-1], prev=months[months.length-2]
        const chg=prev?.actual>0?((last.actual-prev.actual)/prev.actual)*100:null
        const avg=months.reduce((s,m)=>s+(m.actual||0),0)/months.length
        const t=TIERS[catData.tier]||TIERS.want
        return (
          <div key={catId} style={card}>
            <div style={hdr}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text}}>{catData.name}</span>
                <TierTag tier={catData.tier} dark={D}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                {chg!==null&&<span style={{fontSize:12,fontWeight:700,color:chg>10?"#ef4444":chg<-10?"#22c55e":"#f59e0b"}}>{chg>0?"+":""}{chg.toFixed(1)}%</span>}
                <span style={{fontSize:14,fontWeight:700,color:T.text}}>{fmt(last.actual||0,currency)}</span>
              </div>
            </div>
            <div style={{padding:"14px 16px 10px"}}>
              <div style={{display:"flex",alignItems:"flex-end",gap:4,height:70}}>
                {months.map((m,i)=>{
                  const h=Math.max(4,(m.actual||0)/maxV*70), isLast=i===months.length-1
                  return (
                    <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <div style={{width:"100%",height:h,background:isLast?t.color:`${t.color}55`,borderRadius:"3px 3px 0 0"}}/>
                      <div style={{fontSize:8,color:isLast?T.text:T.textMuted,fontWeight:isLast?700:400}}>{m.label}</div>
                    </div>
                  )
                })}
              </div>
              <div style={{marginTop:10,display:"flex",gap:20,fontSize:11,color:T.textMuted}}>
                <span>Avg: <strong style={{color:T.text}}>{fmt(avg,currency)}</strong></span>
                <span>Peak: <strong style={{color:"#ef4444"}}>{fmt(Math.max(...months.map(m=>m.actual||0)),currency)}</strong></span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
