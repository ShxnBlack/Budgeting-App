import React, { useState } from "react"
import { safeArr, toNum, fmt, ACADEMIC_MONTHS, Btn } from "../utils.js"

export default function Loan({ T, D, month, MONTH_NAMES, year, currency,
  income, setIncome, loanInstallments, setLoanInstallments, loanLeftover, setLoanLeftover,
}) {
  const totalLoan     = safeArr(loanInstallments).reduce((s,i)=>s+toNum(i.amount),0)
  const loanSpendable = totalLoan - toNum(loanLeftover)
  const monthly       = loanSpendable > 0 ? loanSpendable / 9 : 0
  const monthName     = MONTH_NAMES[month]
  const acaIdx        = ACADEMIC_MONTHS.indexOf(monthName)
  const [applied, setApplied] = useState(false)

  const loanReceived = safeArr(loanInstallments)
    .filter(i=>ACADEMIC_MONTHS.indexOf(i.month)<=(acaIdx>=0?acaIdx:999)&&toNum(i.amount)>0)
    .reduce((s,i)=>s+toNum(i.amount),0)
  const projLeftover = loanReceived - monthly * (acaIdx+1)

  const applyLoan = () => {
    if(monthly<=0) return
    setIncome(inc=>safeArr(inc).map(r=>r.source==="Loan Allowance"?{...r,amount:monthly.toFixed(2)}:r))
    setApplied(true); setTimeout(()=>setApplied(false),3000)
  }

  const card={background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}
  const inp={padding:"7px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.input,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none"}
  const TH={padding:"8px 10px",fontWeight:700,fontSize:11,textTransform:"uppercase",letterSpacing:.8,color:"#64748b",textAlign:"left"}
  const TD={padding:"7px 9px",fontSize:13,borderTop:"1px solid rgba(128,128,128,.08)"}

  return (
    <div>
      <div style={{...card,padding:"10px 14px",marginBottom:12,background:D?"rgba(67,97,238,.08)":"#eff6ff",border:`1px solid ${D?"rgba(67,97,238,.2)":"#bfdbfe"}`}}>
        <div style={{fontSize:13,fontWeight:600,color:D?"#7B9EFF":"#1e40af"}}>🎓 Student Loan Calculator</div>
        <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>Enter your 3 installments and target leftover. App calculates your monthly allowance across 9 academic months (Sep → May).</div>
      </div>

      <div style={card}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,background:T.thBg,fontSize:13,fontWeight:600,color:T.text}}>📆 Installments</div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr><th style={TH}>Month</th><th style={{...TH,textAlign:"right"}}>Amount</th></tr></thead>
          <tbody>
            {safeArr(loanInstallments).map(inst=>(
              <tr key={inst.id}>
                <td style={{...TD,fontWeight:500,color:T.text}}>{inst.month}</td>
                <td style={{...TD,textAlign:"right"}}>
                  <input value={inst.amount}
                    onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setLoanInstallments(ls=>safeArr(ls).map(l=>l.id===inst.id?{...l,amount:e.target.value}:l))}}
                    style={{...inp,border:"none",background:"none",textAlign:"right",width:100,fontWeight:600,color:"#22c55e"}} placeholder="0.00"/>
                </td>
              </tr>
            ))}
            <tr style={{background:T.thBg}}>
              <td style={{...TD,fontWeight:700,color:T.text}}>Total</td>
              <td style={{...TD,textAlign:"right",fontWeight:800,color:"#22c55e",fontSize:15}}>{fmt(totalLoan,currency)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{...card,padding:18}}>
        <div style={{fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>🧮 Monthly Allowance</div>
        <div style={{background:T.thBg,borderRadius:10,padding:14,marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:.8,marginBottom:8}}>Target leftover at end of May</div>
          <input value={loanLeftover}
            onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setLoanLeftover(e.target.value)}}
            style={{...inp,width:"100%",fontWeight:700,fontSize:16,textAlign:"center",color:"#f59e0b"}} placeholder="e.g. 500.00"/>
          <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:8}}>
            {[["Total loan",fmt(totalLoan,currency)],["− Target leftover",fmt(toNum(loanLeftover),currency)],["= Spendable",fmt(loanSpendable,currency)]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                <span style={{color:T.textSub}}>{l}</span><span style={{fontWeight:600,color:T.text}}>{v}</span>
              </div>
            ))}
            <div style={{borderTop:`2px solid ${T.border}`,paddingTop:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,fontSize:14,color:T.text}}>📅 Monthly allowance</span>
              <span style={{fontWeight:800,fontSize:28,color:"#22c55e",fontFamily:"'Outfit',sans-serif"}}>{fmt(monthly,currency)}</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:.8,marginBottom:10}}>Academic Year</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:4}}>
            {ACADEMIC_MONTHS.map((m,idx)=>{
              const hasPay=safeArr(loanInstallments).some(i=>i.month===m&&toNum(i.amount)>0)
              const isCur=m===monthName, isPast=acaIdx>=0&&idx<acaIdx
              return (
                <div key={m} style={{textAlign:"center"}}>
                  <div style={{borderRadius:7,padding:"7px 2px",position:"relative",
                    background:isCur?"#4361EE":isPast?D?"rgba(34,197,94,.12)":"#dcfce7":T.thBg,
                    border:isCur?"2px solid #7B9EFF":hasPay?`2px solid #22c55e`:`2px solid ${T.border}`}}>
                    {hasPay&&<div style={{position:"absolute",top:-7,right:-3,background:"#22c55e",color:"#fff",fontSize:8,borderRadius:99,padding:"1px 5px",fontWeight:700}}>£</div>}
                    <div style={{fontSize:8,fontWeight:700,color:isCur?"#fff":isPast?"#16a34a":T.textMuted}}>{m.slice(0,3).toUpperCase()}</div>
                    {monthly>0&&<div style={{fontSize:7,color:isCur?"rgba(255,255,255,.7)":T.textMuted,marginTop:1}}>{fmt(monthly,currency).replace(".00","")}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {monthly>0&&(
          <div style={{background:D?"rgba(34,197,94,.08)":"#f0fdf4",borderRadius:10,padding:"12px 14px",marginBottom:14,border:`1px solid ${D?"rgba(34,197,94,.2)":"#86efac"}`}}>
            <div style={{fontWeight:700,fontSize:13,color:T.text,marginBottom:8}}>📊 Projection — {monthName}</div>
            <div style={{fontSize:12,color:T.textSub,lineHeight:2}}>
              Received so far: <strong style={{color:"#22c55e"}}>{fmt(loanReceived,currency)}</strong><br/>
              Expected spent: <strong style={{color:"#ef4444"}}>{fmt(monthly*(acaIdx+1),currency)}</strong><br/>
              Projected remaining: <strong style={{color:projLeftover>=0?"#22c55e":"#ef4444",fontSize:14}}>{fmt(projLeftover,currency)}</strong> {projLeftover>=0?"✅":"⚠️"}
            </div>
          </div>
        )}

        <button onClick={applyLoan} disabled={monthly<=0} style={{
          width:"100%",padding:13,borderRadius:10,border:"none",cursor:monthly>0?"pointer":"not-allowed",
          background:applied?"#22c55e":"#4361EE",color:"#fff",fontWeight:700,fontSize:14,fontFamily:"inherit",
          transition:"background .3s",opacity:monthly>0?1:.5,
        }}>
          {applied?`✅ Applied!`:`Apply ${fmt(monthly,currency)}/month → Loan Allowance`}
        </button>
      </div>
    </div>
  )
}
