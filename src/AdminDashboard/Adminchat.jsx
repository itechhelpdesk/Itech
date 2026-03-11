import { useState, useEffect, useRef } from "react";
import { ref, onValue, push, update } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { auth, db, rtdb } from "../Back_end/Firebase";

/* ─── helpers ─── */
const fmtDay = (ts) => {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - new Date(ts)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const fmtTime = (ts) =>
  ts ? new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "";

/* ── compress admin avatar ── */
const compressAdminImage = (file, maxW = 120, maxH = 120, quality = 0.8) =>
  new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      let q = quality, data = canvas.toDataURL("image/jpeg", q);
      while (data.length > 150_000 && q > 0.3) { q -= 0.1; data = canvas.toDataURL("image/jpeg", q); }
      resolve(data);
    };
    img.onerror = reject; img.src = url;
  });

/* ── compress chat image to send ── */
const compressChatImg = (file, maxW = 800, maxH = 800, q = 0.75) =>
  new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      let data = canvas.toDataURL("image/jpeg", q);
      while (data.length > 700_000 && q > 0.2) { q -= 0.1; data = canvas.toDataURL("image/jpeg", q); }
      resolve(data);
    };
    img.onerror = reject; img.src = url;
  });

/* ─── Avatar ─── */
const Avatar = ({ src, name, size = "md", online = false }) => {
  const initials = (name || "?")[0].toUpperCase();
  const sizeMap = { xs: "w-6 h-6 text-[10px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  const dotMap  = { xs: "w-1.5 h-1.5 border", sm: "w-2 h-2 border", md: "w-2.5 h-2.5 border-2", lg: "w-3 h-3 border-2" };
  return (
    <div className="relative shrink-0">
      <div className={`${sizeMap[size]} rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700 shrink-0`}>
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : <span className="text-white font-bold leading-none">{initials}</span>}
      </div>
      {online && <span className={`absolute bottom-0 right-0 ${dotMap[size]} bg-green-400 rounded-full border-white`} />}
    </div>
  );
};

/* ─── Image Lightbox ─── */
const Lightbox = ({ src, name, onClose }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={onClose}>
    <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
      <img src={src} alt={name || "image"} className="w-full h-auto rounded-2xl shadow-2xl max-h-[82vh] object-contain" />
      <button onClick={onClose} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition">
        <i className="fa-solid fa-xmark text-gray-700 text-sm" />
      </button>
      {name && <p className="text-center text-white/50 text-xs mt-2">{name}</p>}
    </div>
  </div>
);

/* ─── Image Bubble ─── */
const ImgBubble = ({ imageData, imageName, isAdmin }) => {
  const [lb, setLb] = useState(false);
  return (
    <>
      {lb && <Lightbox src={imageData} name={imageName} onClose={() => setLb(false)} />}
      <div onClick={() => setLb(true)}
        className={`relative overflow-hidden rounded-2xl cursor-pointer hover:opacity-90 transition shadow border
          ${isAdmin ? "border-blue-400 rounded-br-md" : "border-gray-100 rounded-bl-md"}`}
        style={{ maxWidth: "200px" }}>
        <img src={imageData} alt={imageName || "img"} className="w-full h-auto block" style={{ maxHeight: "180px", objectFit: "cover" }} />
        <div className={`absolute bottom-0 inset-x-0 px-2 py-1 flex items-center gap-1 ${isAdmin ? "bg-blue-700/60" : "bg-black/30"}`}>
          <i className="fa-solid fa-magnifying-glass-plus text-white text-[8px]" />
          <span className="text-white text-[8px] truncate">{imageName || "image"}</span>
        </div>
      </div>
    </>
  );
};

/* ═══════════════════════════════════════════════════════════
   ADMIN CHAT
═══════════════════════════════════════════════════════════ */
const AdminChat = ({ currentAdminId, currentAdminName, isSuperAdmin, adminProfile }) => {
  const [chatList,      setChatList]      = useState([]);
  const [selected,      setSelected]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [sending,       setSending]       = useState(false);
  const [loadingMsgs,   setLoadingMsgs]   = useState(false);
  const [chatInfo,      setChatInfo]      = useState(null);
  const [transferModal, setTransferModal] = useState(false);
  const [admins,        setAdmins]        = useState([]);
  const [inputOpen,     setInputOpen]     = useState(true);
  const [search,        setSearch]        = useState("");
  /* admin avatar */
  const [adminImg,      setAdminImg]      = useState(adminProfile?.profileImage || "");
  const [uploading,     setUploading]     = useState(false);
  /* chat image to send */
  const [pendingImg,    setPendingImg]    = useState(null);  /* { dataUrl, name } */
  const [imgErr,        setImgErr]        = useState("");
  const [compressing,   setCompressing]   = useState(false);

  const imgInputRef  = useRef(null);  // avatar upload
  const chatImgRef   = useRef(null);  // chat image attach
  const bottomRef    = useRef(null);
  const textareaRef  = useRef(null);

  /* sync avatar */
  useEffect(() => {
    if (adminProfile?.profileImage) setAdminImg(adminProfile.profileImage);
  }, [adminProfile?.profileImage]);

  /* load admins for transfer modal */
  useEffect(() => {
    if (!isSuperAdmin) return;
    getDocs(collection(db, "admins"))
      .then(s => setAdmins(s.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, [isSuperAdmin]);

  /* listen: chat list */
  useEffect(() => {
    return onValue(ref(rtdb, "chats"), (snap) => {
      const raw = snap.val();
      if (!raw) { setChatList([]); return; }
      setChatList(
        Object.entries(raw)
          .map(([uid, d]) => ({ uid, ...d.info }))
          .sort((a, b) => (b.lastTimestamp || 0) - (a.lastTimestamp || 0))
      );
    });
  }, []);

  /* listen: messages + info for selected chat */
  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true); setMessages([]); setChatInfo(null);
    const unsubMsgs = onValue(ref(rtdb, `chats/${selected.uid}/messages`), (snap) => {
      const raw = snap.val();
      if (!raw) { setMessages([]); setLoadingMsgs(false); return; }
      setMessages(Object.entries(raw).map(([id, v]) => ({ id, ...v })).sort((a, b) => a.timestamp - b.timestamp));
      setLoadingMsgs(false);
      update(ref(rtdb, `chats/${selected.uid}/info`), { adminUnread: 0 });
    });
    const unsubInfo = onValue(ref(rtdb, `chats/${selected.uid}/info`), snap => setChatInfo(snap.val()));
    return () => { unsubMsgs(); unsubInfo(); };
  }, [selected]);

  /* auto-scroll */
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  /* focus textarea */
  useEffect(() => {
    if (inputOpen) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [inputOpen]);

  /* ── Avatar upload ── */
  const handleAdminImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!["image/png","image/jpeg","image/jpg"].includes(file.type)) { alert("Only PNG or JPG allowed."); return; }
    setUploading(true);
    try {
      const compressed = await compressAdminImage(file, 120, 120, 0.85);
      setAdminImg(compressed);
      if (currentAdminId && currentAdminId !== "hardcoded_admin") {
        const { updateDoc, doc: fsDoc } = await import("firebase/firestore");
        await updateDoc(fsDoc(db, "admins", currentAdminId), { profileImage: compressed });
      }
    } catch { alert("Failed to upload image."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  /* ── Pick chat image ── */
  const handlePickChatImg = (e) => {
    setImgErr("");
    const file = e.target.files?.[0]; if (!file) return;
    if (!["image/png","image/jpeg","image/jpg"].includes(file.type)) { setImgErr("PNG or JPG only."); e.target.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { setImgErr("Max 10 MB."); e.target.value = ""; return; }
    setCompressing(true);
    compressChatImg(file, 800, 800, 0.75)
      .then(dataUrl => setPendingImg({ dataUrl, name: file.name }))
      .catch(() => setImgErr("Failed to process image."))
      .finally(() => { setCompressing(false); e.target.value = ""; });
  };

  /* ── Lock handlers ── */
  const handleClaim = async () => {
    if (!selected) return;
    await update(ref(rtdb, `chats/${selected.uid}/info`), { chatAssignedTo: currentAdminId, chatAssignedToName: currentAdminName, chatClaimedAt: Date.now() });
  };
  const handleTransfer = async (adminId, adminName) => {
    if (!selected) return;
    await update(ref(rtdb, `chats/${selected.uid}/info`), { chatAssignedTo: adminId, chatAssignedToName: adminName, chatClaimedAt: Date.now() });
    setTransferModal(false);
  };
  const handleUnlock = async () => {
    if (!selected) return;
    await update(ref(rtdb, `chats/${selected.uid}/info`), { chatAssignedTo: null, chatAssignedToName: null, chatClaimedAt: null });
  };

  /* ── Send ── */
  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingImg) || sending || !selected) return;

    /* auto-claim if unassigned */
    if (!chatInfo?.chatAssignedTo) {
      await update(ref(rtdb, `chats/${selected.uid}/info`), { chatAssignedTo: currentAdminId, chatAssignedToName: currentAdminName, chatClaimedAt: Date.now() });
    }

    setSending(true);
    const snap = pendingImg;
    setInput(""); setPendingImg(null); setImgErr("");

    try {
      await push(ref(rtdb, `chats/${selected.uid}/messages`), {
        text:       text || "",
        sender:     "admin",
        senderName: currentAdminName || "Support Admin",
        senderImg:  adminImg || "",
        imageData:  snap?.dataUrl || null,
        imageType:  snap ? "image/jpeg" : null,
        imageName:  snap?.name || null,
        timestamp:  Date.now(),
        read:       false,
      });
      await update(ref(rtdb, `chats/${selected.uid}/info`), {
        lastMessage:   text || (snap ? "📷 Image" : ""),
        lastTimestamp: Date.now(),
        studentUnread: (chatInfo?.studentUnread || 0) + 1,
        adminUnread:   0,
      });
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* group by day */
  const grouped = (msgs) => {
    const g = []; let ld = null;
    msgs.forEach(m => {
      const d = fmtDay(m.timestamp);
      if (d !== ld) { g.push({ type: "day", label: d }); ld = d; }
      g.push(m);
    });
    return g;
  };

  /* lock logic */
  const assignedTo     = chatInfo?.chatAssignedTo;
  const assignedToName = chatInfo?.chatAssignedToName;
  const isMine         = assignedTo === currentAdminId;
  const isUnassigned   = !assignedTo;
  const canSend        = isMine || isUnassigned || isSuperAdmin;
  const isViewing      = !canSend;
  const canSubmit      = (input.trim() || pendingImg) && !sending;

  const filteredChats = chatList.filter(c =>
    !search ||
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.studentEmail?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />

      {/* Transfer Modal */}
      {transferModal && isSuperAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setTransferModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-800 text-base">Transfer Conversation</h3>
                <p className="text-xs text-gray-400 mt-0.5">Select an admin to handle this chat</p>
              </div>
              <button onClick={() => setTransferModal(false)} className="w-7 h-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition">
                <i className="fa-solid fa-xmark text-gray-500 text-xs" />
              </button>
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {admins.map(a => (
                <button key={a.id} onClick={() => handleTransfer(a.id, a.name)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition text-left
                    ${a.id === assignedTo ? "border-blue-300 bg-blue-50" : "border-gray-100 hover:bg-gray-50 hover:border-gray-200"}`}>
                  <Avatar src={a.profileImage} name={a.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.role || "Admin"}</p>
                  </div>
                  {a.id === assignedTo && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold shrink-0">Current</span>}
                </button>
              ))}
              {admins.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No admins found.</p>}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <button onClick={handleUnlock} className="w-full py-2 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition font-medium flex items-center justify-center gap-1.5">
                <i className="fa-solid fa-unlock text-[11px]" /> Remove assignment instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Live Chat</h2>
          <p className="text-xs text-gray-400">{chatList.length} conversation{chatList.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <div className="relative">
            <Avatar src={adminImg} name={currentAdminName} size="sm" online />
            <button onClick={() => imgInputRef.current?.click()} disabled={uploading}
              title="Change your chat avatar"
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition border border-white">
              {uploading ? <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "7px" }} /> : <i className="fa-solid fa-camera" style={{ fontSize: "7px" }} />}
            </button>
            <input ref={imgInputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handleAdminImageUpload} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 leading-none">{currentAdminName || "Admin"}</p>
            <p className="text-[10px] text-green-500 mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" /> Online
            </p>
          </div>
        </div>
      </div>

      {/* Main container */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex shadow-sm"
        style={{ height: "calc(100vh - 220px)", minHeight: "500px" }}>

        {/* ── Sidebar ── */}
        <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
                className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 transition" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <i className="fa-solid fa-comments text-3xl text-gray-200 mb-2" />
                <p className="text-gray-400 text-xs">{search ? "No results found" : "No conversations yet"}</p>
              </div>
            ) : filteredChats.map(c => {
              const cAssigned  = c.chatAssignedTo;
              const cIsMine    = cAssigned === currentAdminId;
              const cIsOpen    = !cAssigned;
              const isSelected = selected?.uid === c.uid;
              return (
                <button key={c.uid} onClick={() => setSelected(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-3 text-left border-b border-gray-50 transition
                    ${isSelected ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50 border-l-2 border-l-transparent"}`}>
                  <div className="relative shrink-0">
                    <Avatar src={c.studentPhotoURL} name={c.studentName} size="sm" />
                    {!cIsOpen && (
                      <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white flex items-center justify-center ${cIsMine ? "bg-green-500" : "bg-red-400"}`}>
                        <i className={`fa-solid ${cIsMine ? "fa-check" : "fa-lock"} text-white`} style={{ fontSize: "6px" }} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-sm truncate font-medium ${isSelected ? "text-blue-700" : "text-gray-800"}`}>{c.studentName || "Student"}</p>
                      {c.adminUnread > 0 && (
                        <span className="shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                          {c.adminUnread > 9 ? "9+" : c.adminUnread}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.lastMessage || "No messages yet"}</p>
                    {!cIsOpen && (
                      <p className={`text-[10px] mt-0.5 font-medium ${cIsMine ? "text-green-600" : "text-red-400"}`}>
                        {cIsMine ? "▶ You are handling" : `🔒 ${c.chatAssignedToName || "Another admin"}`}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat area ── */}
        {!selected ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-comments text-blue-300 text-2xl" />
              </div>
              <p className="font-semibold text-gray-500 text-sm">Select a conversation</p>
              <p className="text-gray-400 text-xs mt-1">Choose a student from the left</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">

            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap gap-y-2">
              <Avatar src={selected.studentPhotoURL} name={selected.studentName} size="sm" online />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm truncate">{selected.studentName}</p>
                <p className="text-xs text-gray-400 truncate">{selected.studentEmail}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isUnassigned ? (
                  <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                    <i className="fa-solid fa-unlock text-gray-400 text-[10px]" /> Unassigned
                  </span>
                ) : isMine ? (
                  <span className="text-[11px] bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-circle-check text-green-500 text-[10px]" /> You're handling this
                  </span>
                ) : (
                  <span className="text-[11px] bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                    <i className="fa-solid fa-lock text-red-400 text-[10px]" /> {assignedToName || "Another admin"}
                  </span>
                )}
                {isUnassigned && (
                  <button onClick={handleClaim} className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1">
                    <i className="fa-solid fa-hand text-[10px]" /> Claim
                  </button>
                )}
                {isSuperAdmin && !isUnassigned && (
                  <>
                    <button onClick={() => setTransferModal(true)} className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1">
                      <i className="fa-solid fa-arrow-right-arrow-left text-[10px]" /> Transfer
                    </button>
                    <button onClick={handleUnlock} className="text-[11px] bg-gray-200 hover:bg-gray-300 text-gray-700 px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1">
                      <i className="fa-solid fa-unlock text-[10px]" /> Unlock
                    </button>
                  </>
                )}
                {canSend && (
                  <button onClick={() => setInputOpen(p => !p)} title={inputOpen ? "Hide input" : "Show input"}
                    className="w-7 h-7 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg flex items-center justify-center transition ml-1">
                    <i className={`fa-solid ${inputOpen ? "fa-chevron-down" : "fa-chevron-up"} text-[10px]`} />
                  </button>
                )}
              </div>
            </div>

            {/* Viewing banner */}
            {isViewing && (
              <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 shrink-0">
                <i className="fa-solid fa-eye text-amber-500 text-sm shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  Viewing only — <strong>{assignedToName}</strong> is handling this conversation.
                  {isSuperAdmin && " Use Transfer or Unlock to take over."}
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/60 space-y-1">
              {loadingMsgs ? (
                <div className="flex justify-center pt-10">
                  <i className="fa-solid fa-spinner fa-spin text-blue-300 text-2xl" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-2">
                    <i className="fa-solid fa-paper-plane text-blue-300 text-lg" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">No messages yet</p>
                  <p className="text-gray-300 text-xs mt-1">Send a message or image to start</p>
                </div>
              ) : (
                <>
                  {grouped(messages).map((item, idx) => {
                    if (item.type === "day") return (
                      <div key={`d-${idx}`} className="flex items-center gap-2 py-2">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-[11px] text-gray-400 font-medium px-2 bg-gray-50/60">{item.label}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    );

                    const isAdmin    = item.sender === "admin";
                    const senderImg  = isAdmin ? (item.senderImg || adminImg || "") : (selected.studentPhotoURL || "");
                    const senderName = isAdmin ? (item.senderName || "Admin") : (selected.studentName || "Student");

                    return (
                      <div key={item.id} className={`flex items-end gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"} mb-1`}>
                        <div className="shrink-0 mb-1">
                          <Avatar src={senderImg} name={senderName} size="xs" />
                        </div>
                        <div className={`flex flex-col max-w-[65%] ${isAdmin ? "items-end" : "items-start"}`}>
                          <p className={`text-[10px] text-gray-400 mb-1 px-1 ${isAdmin ? "text-right" : "text-left"}`}>
                            {isAdmin ? "You" : senderName}
                          </p>

                          {/* ── Image bubble ── */}
                          {item.imageData && (
                            <div className="mb-1">
                              <ImgBubble imageData={item.imageData} imageName={item.imageName} isAdmin={isAdmin} />
                            </div>
                          )}

                          {/* ── Text bubble ── */}
                          {item.text && (
                            <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
                              ${isAdmin
                                ? "bg-blue-600 text-white rounded-br-md"
                                : "bg-white text-gray-800 border border-gray-100 rounded-bl-md"}`}>
                              {item.text}
                            </div>
                          )}

                          <span className="text-[10px] text-gray-400 mt-1 px-1">{fmtTime(item.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* ── INPUT AREA ── */}
            {isViewing ? (
              <div className="px-4 py-3 bg-gray-100 border-t border-gray-200 shrink-0 text-center">
                <p className="text-xs text-gray-500">
                  <i className="fa-solid fa-lock mr-1.5 text-gray-400" />
                  Chat locked — assigned to <strong>{assignedToName}</strong>
                </p>
              </div>
            ) : inputOpen ? (
              <div className="border-t border-gray-100 bg-white shrink-0">

                {/* Pending image preview */}
                {pendingImg && (
                  <div className="px-3 pt-2">
                    <div className="relative inline-block">
                      <img src={pendingImg.dataUrl} alt={pendingImg.name}
                        className="h-20 w-auto rounded-xl border border-gray-200 object-cover shadow-sm" />
                      <button onClick={() => { setPendingImg(null); setImgErr(""); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow transition">
                        <i className="fa-solid fa-xmark text-[9px]" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-black/40 rounded-b-xl px-1.5 py-0.5">
                        <p className="text-white text-[9px] truncate">{pendingImg.name}</p>
                      </div>
                    </div>
                  </div>
                )}
                {imgErr && (
                  <div className="px-3 pt-1">
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <i className="fa-solid fa-circle-exclamation text-[10px]" /> {imgErr}
                    </p>
                  </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2 px-3 py-3">
                  <div className="shrink-0 mb-0.5">
                    <Avatar src={adminImg} name={currentAdminName} size="xs" />
                  </div>

                  {/* Hidden file input for chat image */}
                  <input ref={chatImgRef} type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={handlePickChatImg} />

                  {/* Image attach button */}
                  <button type="button" onClick={() => chatImgRef.current?.click()} disabled={sending || compressing}
                    title="Attach image (PNG/JPG)"
                    className="w-9 h-9 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 text-gray-500 rounded-xl flex items-center justify-center transition shrink-0 border border-gray-200 mb-0.5">
                    {compressing
                      ? <i className="fa-solid fa-spinner fa-spin text-xs" />
                      : <i className="fa-solid fa-image text-xs" />}
                  </button>

                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      pendingImg
                        ? "Add a caption (optional)…"
                        : isUnassigned
                          ? `Reply to ${selected.studentName} (auto-claim on send)…`
                          : `Reply to ${selected.studentName}…`
                    }
                    disabled={sending}
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition resize-none leading-relaxed overflow-hidden"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />

                  {/* Send button */}
                  <button onClick={handleSend} disabled={!canSubmit}
                    className="shrink-0 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition shadow-md shadow-blue-200 mb-0.5">
                    {sending
                      ? <i className="fa-solid fa-spinner fa-spin text-sm" />
                      : <i className="fa-solid fa-paper-plane text-sm" />}
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 pb-2">
                  <p className="text-[10px] text-gray-400 flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px] font-mono">Enter</kbd> to send ·
                    <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[9px] font-mono">Shift+Enter</kbd> new line
                  </p>
                  <p className="text-[10px] text-gray-400">{input.length > 0 ? `${input.length} chars` : ""}</p>
                </div>
              </div>
            ) : (
              <button onClick={() => setInputOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 border-t border-gray-100 bg-white hover:bg-gray-50 transition shrink-0">
                <Avatar src={adminImg} name={currentAdminName} size="xs" />
                <span className="text-sm text-gray-400 flex-1 text-left">Type a message…</span>
                <i className="fa-solid fa-chevron-up text-gray-300 text-xs" />
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default AdminChat;