import React, { useEffect, useState } from "react"
import { load, save } from "./storage.jsx"
import {
  MONTH_NAMES, DARK, LIGHT,
  DEFAULT_INCOME, makeDefaultCategories,
} from "./utils.jsx"
import Budget       from "./tabs/Budget.jsx"
import Transactions from "./tabs/Transactions.jsx"
import Trends       from "./tabs/Trends.jsx"
import Yearly       from "./tabs/Yearly.jsx"
import Charts       from "./tabs/Charts.jsx"
import Loan         from "./tabs/Loan.jsx"
import Settings     from "./tabs/Settings.jsx"

const TABS = [
  { id:"budget", icon:"💰", label:"Budget" },
  { id:"tx",     icon:"📋", label:"Transactions" },
  { id:"trends", icon:"📈", label:"Trends" },
  { id:"yearly", icon:"📅", label:"Yearly" },
  { id:"charts", icon:"🥧", label:"Charts" },
  { id:"loan",   icon:"🎓", label:"Loan" },
  { id:"settings",icon:"⚙️", label:"Settings" },
]

// Helper: load from localStorage with a fallback, then auto-save on every change
function usePersisted(key, fallback) {
  const [value, setValue] = useState(() => {
    const stored = load(key, null)
    return stored !== null ? stored : fallback
  })
  useEffect(() => { save(key, value) }, [key, value])
  return [value, setValue]
}

export default function App() {
  const now = new Date()

  // ── All persisted state ──────────────────────────────────────────────────────
  const [darkMode,         setDarkMode]         = usePersisted("darkMode",         true)
  const [currency,         setCurrency]         = usePersisted("currency",         "£")
  const [month,            setMonth]            = usePersisted("month",            now.getMonth())
  const [year,             setYear]             = usePersisted("year",             now.getFullYear())
  const [income,           setIncome]           = usePersisted("income",           DEFAULT_INCOME)
  const [categories,       setCategories]       = usePersisted("categories",       makeDefaultCategories())
  const [transactions,     setTransactions]     = usePersisted("transactions",     [])
  const [quickBills,       setQuickBills]       = usePersisted("quickBills",       [])
  const [subscriptions,    setSubscriptions]    = usePersisted("subscriptions",    [])
  const [bankBalance,      setBankBalance]      = usePersisted("bankBalance",      "")
  const [savingsTarget,    setSavingsTarget]    = usePersisted("savingsTarget",    "20")
  const [loanInstallments, setLoanInstallments] = usePersisted("loanInstallments", [
    { id:"l1", month:"September", amount:"" },
    { id:"l2", month:"January",   amount:"" },
    { id:"l3", month:"April",     amount:"" },
  ])
  const [loanLeftover,    setLoanLeftover]    = usePersisted("loanLeftover",    "")
  const [yearlyData,      setYearlyData]      = usePersisted("yearlyData",      [])
  const [trendsData,      setTrendsData]      = usePersisted("trendsData",      {})
  const [realismData,     setRealismData]     = usePersisted("realismData",     {})
  const [alertSensitivity,setAlertSensitivity]= usePersisted("alertSensitivity","Medium")

  const [tab, setTab] = useState("budget")

  // ── Theme ────────────────────────────────────────────────────────────────────
  const T = darkMode ? DARK : LIGHT
  const D = darkMode

  // ── CSS ──────────────────────────────────────────────────────────────────────
  const css = `
    :root { --card:${T.card}; --border:${T.border}; --text:${T.text}; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { height: 100%; }
    body { background: ${T.bg}; color: ${T.text}; font-family: 'DM Sans', system-ui, sans-serif; }
    button, input, select, textarea { font: inherit; }
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-thumb { background: rgba(128,128,128,.2); border-radius: 99px; }
    .nav-btn {
      width: 100%; display: flex; align-items: center; gap: 10px; padding: 9px 11px;
      border-radius: 9px; border: 1px solid transparent; background: none;
      color: ${T.textSub}; cursor: pointer; font-size: 13px; font-family: inherit; font-weight: 500;
      transition: all .13s;
    }
    .nav-btn:hover { background: rgba(67,97,238,.09); color: ${T.text}; }
    .nav-btn.on    { background: rgba(67,97,238,.16); color: #7B9EFF; font-weight: 700; }
    .mob-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0;
      background: ${T.card}; border-top: 1px solid ${T.border}; z-index: 100; padding: 4px; }
    .mob-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px;
      padding: 5px 2px; border: 1px solid transparent; border-radius: 8px;
      background: none; cursor: pointer; color: ${T.textSub}; font-size: 9px; font-weight: 600; font-family: inherit; }
    .mob-btn.on { color: #7B9EFF; background: rgba(67,97,238,.12); }
    .fade { animation: fi .15s ease; }
    @keyframes fi { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
    @media (max-width: 700px) {
      .sidebar { display: none !important; }
      .main-pad { padding-bottom: 70px !important; }
      .mob-nav { display: flex !important; }
    }
  `

  const common = { T, D, month, year, MONTH_NAMES, currency }

  return (
    <>
      <style>{css}</style>
      <div style={{display:"flex", height:"100%", minHeight:"100vh", background:T.bg}}>

        {/* Sidebar */}
        <aside className="sidebar" style={{
          width:210, minHeight:"100vh", background:T.card, borderRight:`1px solid ${T.border}`,
          display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", flexShrink:0,
        }}>
          <div style={{padding:"16px 14px 10px", borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontFamily:"'Outfit',sans-serif", fontSize:16, fontWeight:800, color:T.text}}>💸 BudgetTracker</div>
            <div style={{fontSize:11, color:T.textMuted, marginTop:2}}>{MONTH_NAMES[month]} {year}</div>
          </div>
          <div style={{padding:"8px 6px", flex:1, display:"flex", flexDirection:"column", gap:2, overflowY:"auto"}}>
            {TABS.map(t=>(
              <button key={t.id} className={`nav-btn${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
                <span style={{fontSize:15, width:20, textAlign:"center"}}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>
          {/* Month/year bar */}
          <div style={{
            padding:"8px 14px", borderBottom:`1px solid ${T.border}`, background:T.card,
            display:"flex", alignItems:"center", gap:5, flexWrap:"wrap",
            position:"sticky", top:0, zIndex:10,
          }}>
            {MONTH_NAMES.map((m,i)=>(
              <button key={m} onClick={()=>setMonth(i)} style={{
                padding:"3px 9px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
                border:`1px solid ${i===month?"#4361EE":T.border}`,
                background:i===month?"#4361EE":"none",
                color:i===month?"#fff":T.textSub, fontSize:11,
              }}>{m.slice(0,3)}</button>
            ))}
            <div style={{width:1, height:16, background:T.border, margin:"0 2px"}}/>
            {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(y=>(
              <button key={y} onClick={()=>setYear(y)} style={{
                padding:"3px 9px", borderRadius:20, cursor:"pointer", fontFamily:"inherit",
                border:`1px solid ${y===year?"#4361EE":T.border}`,
                background:y===year?"#4361EE":"none",
                color:y===year?"#fff":T.textSub, fontSize:11,
              }}>{y}</button>
            ))}
            <div style={{marginLeft:"auto"}}>
              <button onClick={()=>setDarkMode(v=>!v)} style={{
                padding:"4px 10px", borderRadius:8, border:`1px solid ${T.border}`,
                background:"none", color:T.textSub, cursor:"pointer", fontSize:14,
              }}>{D?"☀️":"🌙"}</button>
            </div>
          </div>

          {/* Tab content */}
          <div className="main-pad" style={{padding:"14px 16px 40px", flex:1, overflowY:"auto"}}>
            <div className="fade" key={tab}>
              {tab==="budget" && <Budget {...common}
                income={income} setIncome={setIncome}
                categories={categories} setCategories={setCategories}
                transactions={transactions} subscriptions={subscriptions}
                bankBalance={bankBalance} savingsTarget={savingsTarget}
                yearlyData={yearlyData} setYearlyData={setYearlyData}
                trendsData={trendsData} setTrendsData={setTrendsData}
                realismData={realismData} setRealismData={setRealismData}
                alertSensitivity={alertSensitivity}
              />}
              {tab==="tx" && <Transactions {...common}
                categories={categories}
                transactions={transactions} setTransactions={setTransactions}
                quickBills={quickBills} setQuickBills={setQuickBills}
                subscriptions={subscriptions} setSubscriptions={setSubscriptions}
              />}
              {tab==="trends" && <Trends {...common} trendsData={trendsData}/>}
              {tab==="yearly" && <Yearly {...common}
                setMonth={setMonth} setYear={setYear} setTab={setTab}
                categories={categories} setCategories={setCategories}
                yearlyData={yearlyData} savingsTarget={savingsTarget}
              />}
              {tab==="charts" && <Charts {...common}
                categories={categories} transactions={transactions} subscriptions={subscriptions}
              />}
              {tab==="loan" && <Loan {...common}
                income={income} setIncome={setIncome}
                loanInstallments={loanInstallments} setLoanInstallments={setLoanInstallments}
                loanLeftover={loanLeftover} setLoanLeftover={setLoanLeftover}
              />}
              {tab==="settings" && <Settings {...common}
                darkMode={darkMode} setDarkMode={setDarkMode}
                currency={currency} setCurrency={setCurrency}
                bankBalance={bankBalance} setBankBalance={setBankBalance}
                savingsTarget={savingsTarget} setSavingsTarget={setSavingsTarget}
                alertSensitivity={alertSensitivity} setAlertSensitivity={setAlertSensitivity}
                income={income} setIncome={setIncome}
                categories={categories} setCategories={setCategories}
                transactions={transactions} setTransactions={setTransactions}
                quickBills={quickBills} setQuickBills={setQuickBills}
                subscriptions={subscriptions} setSubscriptions={setSubscriptions}
                yearlyData={yearlyData} setYearlyData={setYearlyData}
                trendsData={trendsData} setTrendsData={setTrendsData}
                realismData={realismData} setRealismData={setRealismData}
              />}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <nav className="mob-nav">
          {TABS.map(t=>(
            <button key={t.id} className={`mob-btn${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
              <span style={{fontSize:18}}>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}
