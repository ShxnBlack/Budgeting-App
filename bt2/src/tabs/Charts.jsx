import React, { useMemo } from "react"
import { safeArr, toNum, fmt, getPctColor, clamp, PctBar, TIERS, daysInMonth } from "../utils.js"

function Donut({ data, currency, size=180 }) {
  const tot = data.reduce((s,d)=>s+d.value,0)
  if(!tot) return <div style={{fontSize:12,opacity:.5,textAlign:"center",padding:20}}>No data</div>
  const r=68,cx=size/2,cy=size/2,ir=42; let cum=0
  const segs=data.map(d=>{const s={...d,pct:(d.value/tot)*100,start:cum};cum+=s.pct;return s})
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
      <svg width={size} height={size}>
        {segs.map((s,i)=>{
          if(s.pct<0.5) return null
          const a1=(s.start/100)*2*Math.PI-Math.PI/2, a2=((s.start+s.pct)/100)*2*Math.PI-Math.PI/2, lg=s.pct>50?1:0
          return <path key={i} fill={s.color} opacity={.9} d={`M${cx+ir*Math.cos(a1)} ${cy+ir*Math.sin(a1)} L${cx+r*Math.cos(a1)} ${cy+r*Math.sin(a1)} A${r} ${r} 0 ${lg} 1 ${cx+r*Math.cos(a2)} ${cy+r*Math.sin(a2)} L${cx+ir*Math.cos(a2)} ${cy+ir*Math.sin(a2)} A${ir} ${ir} 0 ${lg} 0 ${cx+ir*Math.cos(a1)} ${cy+ir*Math.sin(a1)}Z`}><title>{s.name}: {fmt(s.value,currency)}</title></path>
        })}
        <text x={cx} y={cy-4} textAnchor="middle" style={{fontSize:9,fill:"#94a3b8"}}>Total</text>
        <text x={cx} y={cy+11} textAnchor="middle" style={{fontSize:12,fontWeight:"bold",fill:"#e2e8f0"}}>{fmt(tot,currency)}</text>
      </svg>
      <div style={{display:"flex",flexWrap:"wrap",gap:5,justifyContent:"center",maxWidth:size+60}}>
        {segs.map((s,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,opacity:.8}}>
            <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
            {s.name} {s.pct.toFixed(0)}%
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Charts({ T, D, month, year, MONTH_NAMES, currency, categories, transactions, subscriptions }) {
  const now=new Date(), todayStr=now.toISOString().slice(0,10)

  const postedTx = useMemo(()=>{
    const subTx=safeArr(subscriptions).filter(s=>s.active!==false).map(s=>{
      const day=Math.min(parseInt(s.day)||1,28)
      return {id:`sub-${s.id}`,amount:s.amount,catId:s.catId,itemId:s.itemId,date:`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
    })
    return [...safeArr(transactions),...subTx].filter(t=>{
      const d=new Date(t.date+"T12:00:00")
      return d.getFullYear()===year&&d.getMonth()===month&&t.date<=todayStr
    })
  },[transactions,subscriptions,month,year,todayStr])

  const txByItem = useMemo(()=>{const m={};postedTx.forEach(t=>{if(t.itemId)m[t.itemId]=(m[t.itemId]||0)+toNum(t.amount)});return m},[postedTx])

  const catsD = useMemo(()=>safeArr(categories).map(c=>({...c,items:safeArr(c.items).map(i=>({...i,actual:String(toNum(i.actual)+(txByItem[i.id]||0))}))})
  ),[categories,txByItem])

  const catSum=(cat,f)=>safeArr(cat.items).reduce((s,i)=>s+toNum(i[f]),0)
  const allItems=catsD.flatMap(c=>safeArr(c.items))

  const catPie  = catsD.map(c=>({name:c.name.replace(/^\S+\s/,""),value:catSum(c,"actual"),color:TIERS[c.tier]?.color||"#94a3b8"})).filter(d=>d.value>0)
  const tierMap = {}; catsD.forEach(c=>{if(!tierMap[c.tier])tierMap[c.tier]=0;tierMap[c.tier]+=catSum(c,"actual")})
  const tierPie = Object.entries(TIERS).map(([k,t])=>({name:t.label,value:tierMap[k]||0,color:t.color})).filter(d=>d.value>0)

  const daysTotal=daysInMonth(month,year), dayPct=(now.getDate()/daysTotal)*100
  const paceItems=allItems.map(i=>{
    const b=toNum(i.budgeted),a=toNum(i.actual); if(!b) return null
    const expected=(dayPct/100)*b, pace=expected>0?(a/expected)*100:0
    return {...i,pace,expected}
  }).filter(Boolean).sort((a,b)=>b.pace-a.pace)

  const card={background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
        <div style={{...card,marginBottom:0,padding:14}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>By Category</div>
          <Donut data={catPie} currency={currency}/>
        </div>
        <div style={{...card,marginBottom:0,padding:14}}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:T.text,marginBottom:12}}>By Tier</div>
          <Donut data={tierPie} currency={currency}/>
        </div>
      </div>

      {/* Budget vs Actual */}
      <div style={{...card,padding:16}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:T.text,marginBottom:14}}>Budget vs Actual</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:6,height:140}}>
          {catsD.map((cat,i)=>{
            const bud=catSum(cat,"budgeted"),act=catSum(cat,"actual")
            const maxV=Math.max(...catsD.map(c=>Math.max(catSum(c,"budgeted"),catSum(c,"actual"))),1)
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <div style={{width:"100%",display:"flex",gap:2,alignItems:"flex-end",height:120}}>
                  <div style={{flex:1,height:`${Math.max(3,(bud/maxV)*120)}px`,background:"#60a5fa",borderRadius:"3px 3px 0 0"}}/>
                  <div style={{flex:1,height:`${Math.max(3,(act/maxV)*120)}px`,background:act>bud?"#ef4444":"#22c55e",borderRadius:"3px 3px 0 0"}}/>
                </div>
                <div style={{fontSize:8,color:T.textMuted,textAlign:"center",maxWidth:44,wordBreak:"break-word"}}>{cat.name.replace(/^\S+\s/,"").slice(0,8)}</div>
              </div>
            )
          })}
        </div>
        <div style={{display:"flex",gap:14,justifyContent:"center",marginTop:10}}>
          {[{c:"#60a5fa",l:"Budgeted"},{c:"#22c55e",l:"Under"},{c:"#ef4444",l:"Over"}].map(({c,l})=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:4,fontSize:11,color:T.textSub}}>
              <div style={{width:10,height:10,background:c,borderRadius:2}}/>{l}
            </div>
          ))}
        </div>
      </div>

      {/* Pace */}
      <div style={{...card,padding:16}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600,color:T.text,marginBottom:4}}>
          ⏱️ Pace — Day {now.getDate()} of {daysTotal}
        </div>
        <div style={{fontSize:12,color:T.textMuted,marginBottom:12}}>Are you spending faster or slower than expected?</div>
        {!paceItems.length
          ?<div style={{fontSize:12,color:T.textMuted}}>Add budgeted amounts to see pace.</div>
          :paceItems.slice(0,10).map((item,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <span style={{flex:1,fontSize:12,color:T.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span>
              <span style={{fontSize:11,color:T.textMuted,width:90,textAlign:"right",flexShrink:0}}>{fmt(toNum(item.actual),currency)}/{fmt(toNum(item.budgeted),currency)}</span>
              <div style={{width:130,flexShrink:0}}>
                <div style={{fontSize:10,fontWeight:700,marginBottom:2,color:item.pace>130?"#ef4444":item.pace>100?"#f59e0b":"#22c55e"}}>
                  {item.pace>130?"🔥 Fast":item.pace>100?"⚠️ Ahead":"✅ On track"}
                </div>
                <PctBar pct={item.pace} height={4}/>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
