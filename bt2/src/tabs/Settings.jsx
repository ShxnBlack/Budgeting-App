import React, { useState, useRef } from "react"
import { safeArr, CURRENCIES, Toggle, Btn, DEFAULT_INCOME, makeDefaultCategories } from "../utils.js"

export default function Settings({ T, D,
  darkMode, setDarkMode, currency, setCurrency,
  bankBalance, setBankBalance, savingsTarget, setSavingsTarget,
  alertSensitivity, setAlertSensitivity,
  income, setIncome, categories, setCategories,
  transactions, setTransactions, quickBills, setQuickBills,
  subscriptions, setSubscriptions, yearlyData, setYearlyData,
  trendsData, setTrendsData, realismData, setRealismData,
}) {
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [importMsg,    setImportMsg]    = useState("")
  const importRef = useRef()

  const exportData = () => {
    const data = { income, categories, currency, transactions, quickBills, subscriptions, bankBalance, savingsTarget, yearlyData }
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}))
    a.download = "budget-export.json"; a.click()
  }

  const importData = e => {
    const file=e.target.files?.[0]; if(!file) return
    const reader=new FileReader()
    reader.onload = ev => {
      try {
        const d=JSON.parse(ev.target.result)
        if(Array.isArray(d.income))        setIncome(d.income)
        if(Array.isArray(d.categories))    setCategories(d.categories)
        if(typeof d.currency==="string")   setCurrency(d.currency)
        if(Array.isArray(d.transactions))  setTransactions(d.transactions)
        if(Array.isArray(d.quickBills))    setQuickBills(d.quickBills)
        if(Array.isArray(d.subscriptions)) setSubscriptions(d.subscriptions)
        if(typeof d.bankBalance==="string"||typeof d.bankBalance==="number") setBankBalance(String(d.bankBalance))
        if(typeof d.savingsTarget==="string"||typeof d.savingsTarget==="number") setSavingsTarget(String(d.savingsTarget))
        setImportMsg("✅ Imported!"); setTimeout(()=>setImportMsg(""),3000)
      } catch { setImportMsg("❌ Invalid file"); setTimeout(()=>setImportMsg(""),3000) }
    }
    reader.readAsText(file)
  }

  const card={background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}
  const inp={padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.input,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%"}

  const Section = ({title, children}) => (
    <div style={card}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.border}`,background:T.thBg,fontFamily:"'Outfit',sans-serif",fontSize:14,fontWeight:600,color:T.text}}>{title}</div>
      <div style={{padding:16}}>{children}</div>
    </div>
  )

  const Pills = ({options, active, onClick}) => (
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {options.map(o=>(
        <button key={o} onClick={()=>onClick(o)} style={{
          padding:"7px 14px",borderRadius:20,cursor:"pointer",fontFamily:"inherit",
          border:`1px solid ${active===o?"#4361EE":T.border}`,
          background:active===o?"#4361EE":"none",
          color:active===o?"#fff":T.textSub,fontSize:13,
        }}>{o}</button>
      ))}
    </div>
  )

  return (
    <div style={{maxWidth:560}}>
      <Section title="🎨 Appearance">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:T.text}}>Dark Mode</div>
            <div style={{fontSize:11,color:T.textMuted}}>Currently {D?"enabled":"disabled"}</div>
          </div>
          <Toggle on={D} onToggle={()=>setDarkMode(v=>!v)}/>
        </div>
      </Section>

      <Section title="💱 Currency">
        <Pills options={CURRENCIES} active={currency} onClick={setCurrency}/>
      </Section>

      <Section title="🏦 Bank Balance">
        <div style={{fontSize:12,color:T.textMuted,marginBottom:8}}>Used to show estimated balance after posted transactions.</div>
        <input style={inp} value={bankBalance} inputMode="decimal"
          onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setBankBalance(e.target.value)}}
          placeholder="e.g. 2341.00"/>
      </Section>

      <Section title="🎯 Savings Target">
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <input type="range" min={0} max={50} value={parseFloat(savingsTarget)||0}
            onChange={e=>setSavingsTarget(e.target.value)} style={{flex:1,accentColor:"#4361EE"}}/>
          <span style={{fontSize:20,fontWeight:800,color:"#22c55e",minWidth:50}}>{savingsTarget||"0"}%</span>
        </div>
      </Section>

      <Section title="🔔 Alert Sensitivity">
        <div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>Low = alerts later. High = earlier warnings.</div>
        <Pills options={["Low","Medium","High"]} active={alertSensitivity} onClick={setAlertSensitivity}/>
      </Section>

      <Section title="📦 Export / Import">
        <div style={{fontSize:12,color:T.textMuted,marginBottom:10}}>Back up your data or restore from a file.</div>
        <div style={{display:"flex",gap:8}}>
          <Btn onClick={exportData} color="#4361EE">⬇️ Export JSON</Btn>
          <Btn onClick={()=>importRef.current?.click()} color="#4361EE">⬆️ Import JSON</Btn>
          <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={importData}/>
        </div>
        {importMsg&&<div style={{fontSize:12,marginTop:8,color:importMsg.startsWith("✅")?"#22c55e":"#ef4444"}}>{importMsg}</div>}
      </Section>

      <Section title="⚠️ Danger Zone">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!confirmReset
            ?<Btn onClick={()=>setConfirmReset(true)} color="#f97316">🔄 Reset current month actuals</Btn>
            :<div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:T.textSub}}>Are you sure?</span>
              <Btn onClick={()=>{setCategories(cs=>safeArr(cs).map(c=>({...c,items:safeArr(c.items).map(i=>({...i,actual:"",notes:""}))})));setTransactions([]);setConfirmReset(false)}} color="#ef4444">Yes, reset</Btn>
              <Btn onClick={()=>setConfirmReset(false)} color={T.textMuted}>Cancel</Btn>
            </div>
          }
          {!confirmClear
            ?<Btn onClick={()=>setConfirmClear(true)} color="#ef4444">💣 Clear all data</Btn>
            :<div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span style={{fontSize:12,color:"#ef4444"}}>This cannot be undone!</span>
              <Btn onClick={()=>{
                setIncome(DEFAULT_INCOME); setCategories(makeDefaultCategories()); setTransactions([])
                setQuickBills([]); setSubscriptions([]); setYearlyData([]); setTrendsData({}); setRealismData({})
                setBankBalance(""); setSavingsTarget("20"); setConfirmClear(false)
              }} color="#ef4444">Yes, clear all</Btn>
              <Btn onClick={()=>setConfirmClear(false)} color={T.textMuted}>Cancel</Btn>
            </div>
          }
        </div>
      </Section>
    </div>
  )
}
