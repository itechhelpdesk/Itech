import { useState, useEffect, useRef } from "react";
import { ref, push, onValue, update } from "firebase/database";
import { rtdb, auth } from "../Back_end/Firebase";

/*
  ══════════════════════════════════════════════════════════
  RTDB messages/{pushId}:
    text       : string        (empty if image-only)
    sender     : "student" | "admin"
    senderName : string
    senderImg  : string        (admin avatar)
    imageData  : string|null   (base64 compressed)
    imageType  : string|null
    imageName  : string|null
    timestamp  : number
    read       : boolean
  ══════════════════════════════════════════════════════════
*/

/* ── helpers ── */
const fmt  = (ts) => ts ? new Date(ts).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"}) : "";
const fmtDay = (ts) => {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US",{month:"short",day:"numeric"});
};
const groupByDay = (msgs) => {
  const g = []; let ld = null;
  msgs.forEach(m => {
    const d = fmtDay(m.timestamp);
    if (d !== ld) { g.push({type:"day",label:d}); ld = d; }
    g.push(m);
  });
  return g;
};

/* ── compress image ── */
const compressChatImg = (file, maxW=800, maxH=800, q=0.75) =>
  new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let {width:w, height:h} = img;
      const r = Math.min(maxW/w, maxH/h, 1);
      w = Math.round(w*r); h = Math.round(h*r);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      let data = c.toDataURL("image/jpeg", q);
      while (data.length > 700_000 && q > 0.2) { q -= 0.1; data = c.toDataURL("image/jpeg", q); }
      res(data);
    };
    img.onerror = rej; img.src = url;
  });

/* ── Admin avatar ── */
const AdminAvatar = ({src, name}) => {
  const init = (name||"A")[0].toUpperCase();
  return (
    <div className="w-6 h-6 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 border border-blue-200">
      {src ? <img src={src} alt={name} className="w-full h-full object-cover"/> : <span className="text-white font-bold text-[10px] leading-none">{init}</span>}
    </div>
  );
};

/* ── Lightbox ── */
const Lightbox = ({src, name, onClose}) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
    <div className="relative max-w-2xl w-full" onClick={e=>e.stopPropagation()}>
      <img src={src} alt={name||"image"} className="w-full h-auto rounded-2xl shadow-2xl max-h-[82vh] object-contain"/>
      <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition">
        <i className="fa-solid fa-xmark text-gray-700 text-sm"/>
      </button>
      {name && <p className="text-center text-white/50 text-xs mt-2">{name}</p>}
    </div>
  </div>
);

/* ── Image bubble ── */
const ImgBubble = ({imageData, imageName, isStudent}) => {
  const [lb, setLb] = useState(false);
  return (
    <>
      {lb && <Lightbox src={imageData} name={imageName} onClose={()=>setLb(false)}/>}
      <div onClick={()=>setLb(true)}
        className={`relative overflow-hidden rounded-2xl cursor-pointer hover:opacity-90 transition shadow border
          ${isStudent ? "border-blue-400 rounded-br-md" : "border-gray-100 rounded-bl-md"}`}
        style={{maxWidth:"200px"}}>
        <img src={imageData} alt={imageName||"img"} className="w-full h-auto block" style={{maxHeight:"180px",objectFit:"cover"}}/>
        <div className={`absolute bottom-0 inset-x-0 px-2 py-1 flex items-center gap-1 ${isStudent?"bg-blue-700/60":"bg-black/30"}`}>
          <i className="fa-solid fa-magnifying-glass-plus text-white text-[8px]"/>
          <span className="text-white text-[8px] truncate">{imageName||"image"}</span>
        </div>
      </div>
    </>
  );
};

/* ════════════════════════════════════════════════════════
   CHAT WINDOW
════════════════════════════════════════════════════════ */
const ChatWindow = ({student, compact=false, onMaximize, onClose}) => {
  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [pendingImg,  setPendingImg]  = useState(null); /* {dataUrl,name} */
  const [imgErr,      setImgErr]      = useState("");
  const [compressing, setCompressing] = useState(false);
  const bottomRef   = useRef(null);
  const fileRef     = useRef(null);
  const textareaRef = useRef(null);
  const uid = auth.currentUser?.uid;

  /* listen */
  useEffect(() => {
    if (!uid) return;
    return onValue(ref(rtdb,`chats/${uid}/messages`), snap => {
      const raw = snap.val();
      if (!raw) { setMessages([]); setLoading(false); return; }
      setMessages(Object.entries(raw).map(([id,v])=>({id,...v})).sort((a,b)=>a.timestamp-b.timestamp));
      setLoading(false);
      update(ref(rtdb,`chats/${uid}/info`),{studentUnread:0});
    });
  },[uid]);

  /* scroll */
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  /* pick image */
  const handlePickImg = (e) => {
    setImgErr("");
    const file = e.target.files?.[0]; if (!file) return;
    if (!["image/png","image/jpeg","image/jpg"].includes(file.type)){setImgErr("PNG or JPG only."); e.target.value=""; return;}
    if (file.size > 10*1024*1024){setImgErr("Max 10 MB."); e.target.value=""; return;}
    setCompressing(true);
    compressChatImg(file,800,800,0.75)
      .then(dataUrl => setPendingImg({dataUrl, name:file.name}))
      .catch(()=>setImgErr("Failed to process image."))
      .finally(()=>{setCompressing(false); e.target.value="";});
  };

  /* send */
  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingImg) || sending || !uid) return;
    setSending(true);
    const snap = pendingImg;
    setInput(""); setPendingImg(null); setImgErr("");
    try {
      await push(ref(rtdb,`chats/${uid}/messages`),{
        text:      text||"",
        sender:    "student",
        senderName: student?.name||"Student",
        senderImg:  "",
        imageData:  snap?.dataUrl||null,
        imageType:  snap ? "image/jpeg" : null,
        imageName:  snap?.name||null,
        timestamp:  Date.now(),
        read:       false,
      });
      await update(ref(rtdb,`chats/${uid}/info`),{
        studentName:   student?.name||"Student",
        studentEmail:  student?.email||"",
        lastMessage:   text||(snap?"📷 Image":""),
        lastTimestamp: Date.now(),
        adminUnread:   messages.filter(m=>m.sender==="student"&&!m.read).length+1,
        studentUnread: 0,
      });
    } catch(err){console.error(err);}
    finally{setSending(false);}
  };

  const onKey = (e) => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} };
  const canSend = (input.trim()||pendingImg)&&!sending;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <div className="relative">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-headset text-white text-sm"/>
          </div>
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-blue-600"/>
        </div>
        <div className="flex-1">
          <p className="font-extrabold text-white text-sm">Support Team</p>
          <p className="text-blue-200 text-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block"/> Online · Admin
          </p>
        </div>
        <div className="flex items-center gap-1">
          {compact&&onMaximize&&(
            <button onClick={onMaximize} title="Expand" className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition">
              <i className="fa-solid fa-up-right-and-down-left-from-center text-white text-xs"/>
            </button>
          )}
          {compact&&onClose&&(
            <button onClick={onClose} className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition">
              <i className="fa-solid fa-xmark text-white text-xs"/>
            </button>
          )}
        </div>
      </div>

      {/* Banner */}
      {!compact&&(
        <div className="bg-blue-50 border-b border-blue-100 px-4 py-2.5 flex items-center gap-2.5">
          <i className="fa-solid fa-circle-info text-blue-400 text-sm shrink-0"/>
          <p className="text-xs text-blue-600">Direct line to support admin. Replied within 24 hrs. You can send images (PNG/JPG).</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <i className="fa-solid fa-spinner fa-spin text-blue-400 text-2xl"/>
          </div>
        ) : messages.length===0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <i className="fa-solid fa-comments text-blue-400 text-2xl"/>
            </div>
            <p className="font-bold text-gray-700 text-sm">Start a conversation</p>
            <p className="text-xs text-gray-400 mt-1">Send a message or image — our admin will reply soon.</p>
          </div>
        ) : (
          <>
            {groupByDay(messages).map((item,idx)=>{
              if(item.type==="day") return (
                <div key={`d${idx}`} className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-gray-200"/>
                  <span className="text-xs text-gray-400 font-semibold px-2">{item.label}</span>
                  <div className="flex-1 h-px bg-gray-200"/>
                </div>
              );
              const isStudent = item.sender==="student";
              const isAdmin   = item.sender==="admin";
              const name = item.senderName||(isAdmin?"Support Admin":(student?.name||"Student"));
              return (
                <div key={item.id} className={`flex items-end gap-2 ${isStudent?"flex-row-reverse":"flex-row"} mb-1`}>
                  {isAdmin&&<div className="shrink-0 mb-1"><AdminAvatar src={item.senderImg||""} name={name}/></div>}
                  <div className={`flex flex-col max-w-[75%] ${isStudent?"items-end":"items-start"}`}>
                    {/* ← ACTUAL ADMIN NAME SHOWN HERE */}
                    {isAdmin&&<p className="text-[11px] font-bold text-blue-600 mb-1 ml-0.5">{name}</p>}
                    {item.imageData&&(
                      <div className="mb-1">
                        <ImgBubble imageData={item.imageData} imageName={item.imageName} isStudent={isStudent}/>
                      </div>
                    )}
                    {item.text&&(
                      <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                        ${isStudent?"bg-blue-600 text-white rounded-br-md":"bg-white text-gray-800 rounded-bl-md border border-gray-100"}`}>
                        {item.text}
                      </div>
                    )}
                    <span className="text-[10px] text-gray-400 mt-0.5 px-0.5">{fmt(item.timestamp)}</span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef}/>
          </>
        )}
      </div>

      {/* Pending image preview */}
      {pendingImg&&(
        <div className="px-3 pt-2 bg-white border-t border-gray-100">
          <div className="relative inline-block">
            <img src={pendingImg.dataUrl} alt={pendingImg.name} className="h-20 w-auto rounded-xl border border-gray-200 object-cover shadow-sm"/>
            <button onClick={()=>{setPendingImg(null);setImgErr("");}}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition">
              <i className="fa-solid fa-xmark text-[9px]"/>
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/40 rounded-b-xl px-1.5 py-0.5">
              <p className="text-white text-[9px] truncate">{pendingImg.name}</p>
            </div>
          </div>
        </div>
      )}
      {imgErr&&(
        <div className="px-3 pt-1 bg-white">
          <p className="text-xs text-red-500 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation text-[10px]"/> {imgErr}</p>
        </div>
      )}

      {/* Input row */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 flex gap-2 items-end shrink-0">
        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handlePickImg}/>

        {/* Image button */}
        <button type="button" onClick={()=>fileRef.current?.click()} disabled={sending||compressing}
          title="Attach image (PNG/JPG)"
          className="w-10 h-10 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 text-gray-500 rounded-xl flex items-center justify-center transition shrink-0 mb-0.5 border border-gray-200">
          {compressing
            ? <i className="fa-solid fa-spinner fa-spin text-sm"/>
            : <i className="fa-solid fa-image text-sm"/>}
        </button>

        {/* Textarea */}
        <textarea ref={textareaRef} rows={1} value={input}
          onChange={e=>{
            setInput(e.target.value);
            e.target.style.height="auto";
            e.target.style.height=Math.min(e.target.scrollHeight,100)+"px";
          }}
          onKeyDown={onKey}
          placeholder={pendingImg?"Add a caption (optional)…":"Type a message…"}
          disabled={sending}
          className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition resize-none overflow-hidden"
          style={{minHeight:"40px",maxHeight:"100px"}}
        />

        {/* Send */}
        <button type="button" onClick={handleSend} disabled={!canSend}
          className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shadow-md shadow-blue-200 shrink-0 mb-0.5">
          {sending
            ? <i className="fa-solid fa-spinner fa-spin text-sm"/>
            : <i className="fa-solid fa-paper-plane text-sm"/>}
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   FULL PAGE
════════════════════════════════════════════════════════ */
export const LiveChatPage = ({student}) => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
      <i className="fa-solid fa-house text-gray-300"/><span>/</span>
      <span className="text-blue-600 font-semibold">Live Chat</span>
    </div>
    <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
      style={{minHeight:"calc(100vh - 180px)"}}>
      <ChatWindow student={student} compact={false}/>
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════
   FLOATING BUBBLE
════════════════════════════════════════════════════════ */
export const LiveChatBubble = ({student, onMaximize}) => {
  const [open,   setOpen]   = useState(false);
  const [unread, setUnread] = useState(0);
  const uid = auth.currentUser?.uid;

  useEffect(()=>{
    if(!uid) return;
    return onValue(ref(rtdb,`chats/${uid}/info`), snap=>{
      setUnread(snap.val()?.studentUnread||0);
    });
  },[uid]);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>
      {open&&(
        <div className="fixed bottom-24 right-5 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9998] flex flex-col overflow-hidden"
          style={{height:"530px"}}>
          <ChatWindow student={student} compact onMaximize={()=>{setOpen(false);onMaximize?.();}} onClose={()=>setOpen(false)}/>
        </div>
      )}
      <button onClick={()=>setOpen(!open)}
        className={`fixed bottom-5 right-5 z-[9999] w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
          ${open?"bg-gray-700 hover:bg-gray-800":"bg-blue-600 hover:bg-blue-700 shadow-blue-300"}`}>
        <i className={`fa-solid ${open?"fa-xmark":"fa-comments"} text-white text-xl`}/>
        {!open&&unread>0&&(
          <>
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
              {unread>9?"9+":unread}
            </span>
            <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"/>
          </>
        )}
      </button>
    </>
  );
};

export default LiveChatBubble;