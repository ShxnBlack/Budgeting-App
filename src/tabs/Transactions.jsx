import React, { useState, useMemo } from "react"
import { safeArr, uid, toNum, fmt, Btn, Modal, TH, TD } from "../utils.js"

export default function Transactions({ T, D, month, year, MONTH_NAMES, currency,
  categories, transactions, setTransactions, quickBills, setQuickBills, subscriptions, setSubscriptions,
}) {
  const todayStr = new Date().toISOString().slice(0,10)
  const monthName = MONTH_NAMES[month]

  const [place,  setPlace]  = useState("")
  const [desc,   setDesc]   = useState("")
  const [amount, setAmount] = useState("")
  const [catId,  setCatId]  = useState("")
  const [itemId, setItemId] = useState("")
  const [date,   setDate]   = useState(todayStr)
  const [msg,    setMsg]    = useState("")
  const [qbModal,  setQbModal]  = useState(null)
  const [subModal, setSubModal] = useState(null)
  const [qbFlash,  setQbFlash]  = useState(null)

  const subTx = useMemo(() => safeArr(subscriptions).filter(s=>s.active!==false).map(s=>{
    const day=Math.min(parseInt(s.day)||1,28)
    return { id:`sub-${s.id}`, place:s.name, desc:s.notes||"", amount:s.amount,
      catId:s.catId, itemId:s.itemId, isSub:true,
      date:`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` }
  }), [subscriptions, month, year])

  const allTx = useMemo(() =>
    [...safeArr(transactions), ...subTx].filter(t=>{
      const d=new Date(t.date+"T12:00:00")
      return d.getFullYear()===year && d.getMonth()===month
    })
  , [transactions, subTx, month, year])

  const postedTx  = allTx.filter(t=>t.date<=todayStr)
  const pendingTx = allTx.filter(t=>t.date>todayStr)
  const totalPosted = postedTx.reduce((s,t)=>s+toNum(t.amount),0)

  const addTx = () => {
    if(!amount||!catId){setMsg("Amount and category required.");return}
    setTransactions(ts=>[{id:uid(),place,desc,amount,catId,itemId,date},...safeArr(ts)])
    setPlace(""); setDesc(""); setAmount(""); setMsg("✅ Added!")
    setTimeout(()=>setMsg(""),2000)
  }

  const fireQb = bill => {
    setTransactions(ts=>[{id:uid(),place:bill.name,desc:bill.notes||"",amount:bill.amount,catId:bill.catId,itemId:bill.itemId,date:todayStr},...safeArr(ts)])
    setQbFlash(bill.id); setTimeout(()=>setQbFlash(null),1200)
  }

  const card = {background:T.card,border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden",marginBottom:12}
  const hdr  = {padding:"10px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",background:T.thBg}
  const inp  = {padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,background:T.input,color:T.text,fontSize:13,fontFamily:"inherit",outline:"none",width:"100%"}
  const catItems = safeArr(categories).find(c=>c.id===catId)?.items||[]

  return (
    <div>
      {/* Add form */}
      <div style={card}>
        <div style={hdr}><span style={{fontSize:13,fontWeight:600,color:T.text}}>➕ Add Transaction</span></div>
        <div style={{padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <input style={inp} placeholder="Place / merchant" value={place} onChange={e=>setPlace(e.target.value)}/>
          <input style={inp} placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
          <input style={inp} placeholder="Amount" inputMode="decimal" value={amount}
            onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setAmount(e.target.value)}}/>
          <input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <select style={inp} value={catId} onChange={e=>{setCatId(e.target.value);setItemId("")}}>
            <option value="">— Category —</option>
            {safeArr(categories).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={inp} value={itemId} onChange={e=>setItemId(e.target.value)}>
            <option value="">— Item (optional) —</option>
            {safeArr(catItems).map(i=><option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
          <button onClick={addTx} style={{gridColumn:"span 2",padding:11,borderRadius:9,border:"none",
            background:"#4361EE",color:"#fff",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            Add Transaction
          </button>
        </div>
        {msg&&<div style={{padding:"0 14px 12px",fontSize:12,color:msg.startsWith("✅")?"#22c55e":"#ef4444"}}>{msg}</div>}
      </div>

      {/* Posted */}
      {postedTx.length>0&&(
        <div style={card}>
          <div style={hdr}>
            <span style={{fontSize:13,fontWeight:600,color:T.text}}>✅ Posted — {monthName} {year}</span>
            <span style={{fontSize:12,color:T.textMuted}}>{fmt(totalPosted,currency)}</span>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={TH}>Date</th><th style={TH}>Place</th><th style={TH}>Category</th>
              <th style={{...TH,textAlign:"right"}}>Amount</th><th style={{...TH,width:32}}/>
            </tr></thead>
            <tbody>
              {postedTx.map(tx=>{
                const cat=safeArr(categories).find(c=>c.id===tx.catId)
                return (
                  <tr key={tx.id} style={{opacity:tx.isSub?.8:1}}>
                    <td style={{...TD,fontSize:11,color:T.textMuted,whiteSpace:"nowrap"}}>{tx.date}</td>
                    <td style={TD}>
                      <div style={{fontWeight:500,color:T.text}}>{tx.place}</div>
                      {tx.desc&&<div style={{fontSize:11,color:T.textMuted}}>{tx.desc}</div>}
                      {tx.isSub&&<span style={{fontSize:9,background:"rgba(139,92,246,.15)",color:"#7c3aed",borderRadius:4,padding:"1px 5px"}}>AUTO-SUB</span>}
                    </td>
                    <td style={{...TD,fontSize:11,color:T.textMuted}}>{cat?.name||"—"}</td>
                    <td style={{...TD,textAlign:"right",fontWeight:700,color:"#ef4444"}}>−{fmt(tx.amount,currency)}</td>
                    <td style={{...TD,textAlign:"center"}}>
                      {!tx.isSub&&<button onClick={()=>setTransactions(ts=>safeArr(ts).filter(t=>t.id!==tx.id))}
                        style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:13}}>✕</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending */}
      {pendingTx.length>0&&(
        <div style={card}>
          <div style={hdr}><span style={{fontSize:13,fontWeight:600,color:T.text}}>⏳ Pending</span></div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>
              <th style={TH}>Date</th><th style={TH}>Place</th>
              <th style={{...TH,textAlign:"right"}}>Amount</th><th style={{...TH,width:32}}/>
            </tr></thead>
            <tbody>
              {pendingTx.map(tx=>(
                <tr key={tx.id} style={{opacity:.7}}>
                  <td style={{...TD,fontSize:11,color:T.textMuted}}>{tx.date}</td>
                  <td style={{...TD,color:T.text}}>{tx.place}</td>
                  <td style={{...TD,textAlign:"right",fontWeight:700,color:"#f59e0b"}}>−{fmt(tx.amount,currency)}</td>
                  <td style={{...TD,textAlign:"center"}}>
                    <button onClick={()=>setTransactions(ts=>safeArr(ts).filter(t=>t.id!==tx.id))}
                      style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer",fontSize:13}}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {postedTx.length===0&&pendingTx.length===0&&(
        <div style={{...card,padding:20,textAlign:"center"}}>
          <div style={{fontSize:13,color:T.textMuted}}>No transactions for {monthName} {year} yet.</div>
        </div>
      )}

      {/* Quick Bills */}
      <div style={card}>
        <div style={hdr}>
          <span style={{fontSize:13,fontWeight:600,color:T.text}}>⚡ Quick Bills</span>
          <Btn onClick={()=>setQbModal({mode:"add",name:"",amount:"",catId:"",itemId:"",notes:""})} color="#3b82f6">+ Add</Btn>
        </div>
        <div style={{padding:12,display:"flex",flexWrap:"wrap",gap:8}}>
          {safeArr(quickBills).map(b=>(
            <button key={b.id} onClick={()=>fireQb(b)} style={{
              padding:"8px 14px",borderRadius:9,cursor:"pointer",fontFamily:"inherit",
              border:`1px solid ${qbFlash===b.id?"#22c55e":T.border}`,
              background:qbFlash===b.id?"rgba(34,197,94,.1)":"none",
              color:T.text,display:"flex",gap:8,alignItems:"center",transition:"all .2s",
            }}>
              <span style={{fontWeight:500}}>{b.name}</span>
              <span style={{color:"#ef4444",fontWeight:700}}>−{fmt(b.amount,currency)}</span>
              <span onClick={e=>{e.stopPropagation();setQbModal({mode:"edit",...b})}} style={{fontSize:10,color:T.textMuted,cursor:"pointer"}}>✏️</span>
              {qbFlash===b.id&&<span style={{color:"#22c55e"}}>✓</span>}
            </button>
          ))}
          {!safeArr(quickBills).length&&<span style={{fontSize:12,color:T.textMuted}}>No quick bills yet.</span>}
        </div>
      </div>

      {/* Subscriptions */}
      <div style={card}>
        <div style={hdr}>
          <span style={{fontSize:13,fontWeight:600,color:T.text}}>🔄 Subscriptions</span>
          <Btn onClick={()=>setSubModal({mode:"add",name:"",amount:"",catId:"",itemId:"",day:"1",notes:"",active:true})} color="#8b5cf6">+ Add</Btn>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>
            <th style={TH}>Name</th><th style={{...TH,textAlign:"right"}}>Amount</th>
            <th style={TH}>Day</th><th style={TH}>Active</th><th style={{...TH,width:40}}/>
          </tr></thead>
          <tbody>
            {safeArr(subscriptions).map((s,idx)=>{
              const rowId = s.id || `leg-${idx}`
              return (
                <tr key={rowId} style={{opacity:s.active===false?.45:1}}>
                  <td style={{...TD,fontWeight:500,color:T.text}}>{s.name}</td>
                  <td style={{...TD,textAlign:"right",fontWeight:700,color:"#8b5cf6"}}>−{fmt(s.amount,currency)}</td>
                  <td style={{...TD,fontSize:12,color:T.textMuted}}>{s.day}</td>
                  <td style={TD}>
                    <div onClick={()=>setSubscriptions(ss=>safeArr(ss).map((x,xi)=>{
                      const xId=x.id||`leg-${xi}`; return xId===rowId?{...x,id:rowId,active:x.active===false}:x
                    }))} style={{width:32,height:18,borderRadius:99,background:s.active===false?"#cbd5e1":"#4361EE",
                      position:"relative",cursor:"pointer",transition:"background .2s"}}>
                      <div style={{position:"absolute",top:2,left:s.active===false?2:14,width:14,height:14,
                        borderRadius:99,background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
                    </div>
                  </td>
                  <td style={{...TD,textAlign:"center"}}>
                    <button onClick={()=>setSubModal({mode:"edit",...s,id:rowId})}
                      style={{background:"none",border:"none",color:T.textMuted,cursor:"pointer"}}>✏️</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {safeArr(subscriptions).length>0&&(
          <div style={{padding:"7px 14px",borderTop:`1px solid ${T.border}`,fontSize:12,color:T.textMuted}}>
            Monthly: <strong style={{color:T.text}}>{fmt(safeArr(subscriptions).filter(s=>s.active!==false).reduce((s,x)=>s+toNum(x.amount),0),currency)}</strong>
          </div>
        )}
      </div>

      {/* Quick Bill modal */}
      {qbModal&&(
        <Modal onClose={()=>setQbModal(null)}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>
            {qbModal.mode==="add"?"⚡ Add Quick Bill":"✏️ Edit Quick Bill"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input style={inp} placeholder="Name" value={qbModal.name||""} onChange={e=>setQbModal(m=>({...m,name:e.target.value}))}/>
            <input style={inp} placeholder="Amount" inputMode="decimal" value={qbModal.amount||""}
              onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setQbModal(m=>({...m,amount:e.target.value}))}}/>
            <select style={inp} value={qbModal.catId||""} onChange={e=>setQbModal(m=>({...m,catId:e.target.value,itemId:""}))}>
              <option value="">— Category —</option>
              {safeArr(categories).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={inp} value={qbModal.itemId||""} onChange={e=>setQbModal(m=>({...m,itemId:e.target.value}))}>
              <option value="">— Item (optional) —</option>
              {safeArr(safeArr(categories).find(c=>c.id===qbModal.catId)?.items).map(i=><option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              {qbModal.mode==="edit"&&<Btn onClick={()=>{setQuickBills(bs=>safeArr(bs).filter(b=>b.id!==qbModal.id));setQbModal(null)}} color="#ef4444">Delete</Btn>}
              <Btn onClick={()=>setQbModal(null)} color={T.textMuted}>Cancel</Btn>
              <button onClick={()=>{
                if(!qbModal.name||!qbModal.amount) return
                const {mode,...rest}=qbModal
                if(mode==="add") setQuickBills(bs=>[...safeArr(bs),{...rest,id:uid()}])
                else setQuickBills(bs=>safeArr(bs).map(b=>b.id===rest.id?{...b,...rest}:b))
                setQbModal(null)
              }} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#3b82f6",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                {qbModal.mode==="add"?"Add":"Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Subscription modal */}
      {subModal&&(
        <Modal onClose={()=>setSubModal(null)}>
          <div style={{fontFamily:"'Outfit',sans-serif",fontSize:16,fontWeight:700,color:T.text,marginBottom:16}}>
            {subModal.mode==="add"?"🔄 Add Subscription":"✏️ Edit Subscription"}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <input style={inp} placeholder="Name" value={subModal.name||""} onChange={e=>setSubModal(m=>({...m,name:e.target.value}))}/>
            <input style={inp} placeholder="Amount" inputMode="decimal" value={subModal.amount||""}
              onChange={e=>{if(/^\d*\.?\d{0,2}$/.test(e.target.value)||e.target.value==="")setSubModal(m=>({...m,amount:e.target.value}))}}/>
            <input style={inp} placeholder="Day of month (1–28)" value={subModal.day||"1"} onChange={e=>setSubModal(m=>({...m,day:e.target.value}))}/>
            <select style={inp} value={subModal.catId||""} onChange={e=>setSubModal(m=>({...m,catId:e.target.value,itemId:""}))}>
              <option value="">— Category —</option>
              {safeArr(categories).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select style={inp} value={subModal.itemId||""} onChange={e=>setSubModal(m=>({...m,itemId:e.target.value}))}>
              <option value="">— Item (optional) —</option>
              {safeArr(safeArr(categories).find(c=>c.id===subModal.catId)?.items).map(i=><option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              {subModal.mode==="edit"&&<Btn onClick={()=>{setSubscriptions(ss=>safeArr(ss).filter(s=>s.id!==subModal.id));setSubModal(null)}} color="#ef4444">Delete</Btn>}
              <Btn onClick={()=>setSubModal(null)} color={T.textMuted}>Cancel</Btn>
              <button onClick={()=>{
                if(!subModal.name||!subModal.amount) return
                const {mode,...rest}=subModal
                if(mode==="add") setSubscriptions(ss=>[...safeArr(ss),{...rest,id:uid(),active:true}])
                else setSubscriptions(ss=>safeArr(ss).map(s=>s.id===rest.id?{...s,...rest}:s))
                setSubModal(null)
              }} style={{padding:"7px 20px",borderRadius:8,border:"none",background:"#8b5cf6",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                {subModal.mode==="add"?"Add":"Save"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
