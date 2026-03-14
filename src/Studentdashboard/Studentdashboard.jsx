// ─── CHANGES FROM ORIGINAL ───────────────────────────────────
//  1. Import NotificationBell + createTicketNotifications
//  2. NewTicketModal → Category dropdown (enabled only from Firestore)
//  3. NewTicketModal → Subject is now a DROPDOWN based on selected category
//     If no subjects defined for a category → falls back to free text input
//  4. Header → NotificationBell for student
//  5. onViewTicket callback → opens TicketViewModal from notification click
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from "react";
import {
  signOut, onAuthStateChanged, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc, getDoc, updateDoc,
  collection, addDoc, getDocs,
  query, where, onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../Back_end/Firebase";
import { LiveChatBubble, LiveChatPage } from "./LiveChat";
import { TicketHistory, FAQPage, SettingsPage } from "./MissingPages";
import { NotificationBell, createTicketNotifications } from "../components/Notification";

const FAStyle = () => (
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
);

/* ── Badges ── */
const Badge = ({ label, cls }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>
);
const statusStyle   = { Open: "bg-blue-100 text-blue-700", Pending: "bg-amber-100 text-amber-700", Resolved: "bg-green-100 text-green-700", Closed: "bg-gray-100 text-gray-500" };
const priorityStyle = { Low: "bg-gray-100 text-gray-500", Medium: "bg-amber-100 text-amber-600", High: "bg-red-100 text-red-600", Urgent: "bg-purple-100 text-purple-600" };

/* ── Helpers ── */
const generateTicketId = () => {
  const n = new Date(), p = s => String(s).padStart(2,"0");
  return `TKT-${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}-${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
};
const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const formatDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const formatBytes = (b) => b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const fileToBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
const ALLOWED_TYPES = ["image/png","image/jpeg","image/jpg","application/pdf"];

const safeStore = {
  set: (key, val) => { try { localStorage.setItem(key, val); } catch { try { sessionStorage.setItem(key, val); } catch {} } },
  get: (key) => { try { return localStorage.getItem(key) ?? sessionStorage.getItem(key); } catch { try { return sessionStorage.getItem(key); } catch { return null; } } },
  del: (key) => { try { localStorage.removeItem(key); } catch {} try { sessionStorage.removeItem(key); } catch {} },
};

const compressImage = (file, maxW = 200, maxH = 200, quality = 0.7) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      let q = quality, data = canvas.toDataURL("image/jpeg", q);
      while (data.length > 700_000 && q > 0.2) { q -= 0.1; data = canvas.toDataURL("image/jpeg", q); }
      resolve(data);
    };
    img.onerror = reject;
    img.src = url;
  });

/* ── AU CSS ── */
const AUStyle = () => (
  <style>{`
    :root {
      --au-red: #DA1A32; --au-red-dark: #B5152A;
      --au-navy: #1B3A6B; --au-navy-dark: #122850;
      --au-yellow: #F5D000; --au-gold: #F0C330;
    }
    .au-header { background: var(--au-navy) !important; border-bottom: 3px solid var(--au-gold) !important; }
    .au-header-logo { color: var(--au-yellow) !important; }
    .au-header input { background: rgba(255,255,255,0.08) !important; border-color: rgba(255,255,255,0.15) !important; color: #fff !important; }
    .au-header input::placeholder { color: rgba(255,255,255,0.4) !important; }
    .au-header .au-icon-btn { color: rgba(255,255,255,0.6) !important; }
    .au-header .au-icon-btn:hover { background: rgba(255,255,255,0.1) !important; color: var(--au-yellow) !important; }
    .au-header .au-user-name { color: #fff !important; }
    .au-header .au-user-sub  { color: rgba(255,255,255,0.5) !important; }
    .au-header .au-divider   { background: rgba(255,255,255,0.15) !important; }
    .au-header .au-hamburger { color: var(--au-yellow) !important; }
    .au-header .au-hamburger:hover { background: rgba(255,255,255,0.1) !important; }
    .au-sidebar { background: var(--au-navy-dark) !important; border-right: 1px solid rgba(255,255,255,0.07) !important; }
    .au-sidebar .au-user-card { background: rgba(255,255,255,0.06) !important; }
    .au-sidebar .au-user-name { color: #fff !important; }
    .au-sidebar .au-user-badge { color: var(--au-yellow) !important; font-size: 0.7rem; }
    .au-sidebar .au-nav-active { background: var(--au-red) !important; color: #fff !important; box-shadow: 0 4px 14px rgba(218,26,50,0.35) !important; }
    .au-sidebar .au-nav-inactive { color: rgba(255,255,255,0.55) !important; }
    .au-sidebar .au-nav-inactive:hover { background: rgba(255,255,255,0.07) !important; color: var(--au-yellow) !important; }
    .au-sidebar .au-section-label { color: rgba(255,255,255,0.25) !important; }
    .au-sidebar .au-new-ticket-btn { background: var(--au-red) !important; color: #fff !important; }
    .au-sidebar .au-new-ticket-btn:hover { background: var(--au-red-dark) !important; }
    .au-sidebar .au-logout-btn { color: rgba(255,255,255,0.5) !important; }
    .au-sidebar .au-logout-btn:hover { background: rgba(218,26,50,0.15) !important; color: var(--au-red) !important; }
    .au-sidebar .au-help-card { background: linear-gradient(135deg, var(--au-red-dark), var(--au-red)) !important; }
    .au-sidebar .au-border-top  { border-top-color:    rgba(255,255,255,0.07) !important; }
    .au-sidebar .au-border-bottom { border-bottom-color: rgba(255,255,255,0.07) !important; }
    .au-main-bg { background: #f0f2f5 !important; }
    .au-btn-primary { background: var(--au-red) !important; color: #fff !important; box-shadow: 0 4px 14px rgba(218,26,50,0.3) !important; }
    .au-btn-primary:hover { background: var(--au-red-dark) !important; }
    .au-hero { background: linear-gradient(135deg, var(--au-navy-dark) 0%, var(--au-navy) 50%, #1e4d8c 100%) !important; }
    .au-hero-btn-solid { background: var(--au-yellow) !important; color: var(--au-navy-dark) !important; }
    .au-hero-btn-outline { background: rgba(255,255,255,0.1) !important; border: 1px solid rgba(255,255,255,0.25) !important; color: #fff !important; }
    .au-modal-header { background: linear-gradient(135deg, var(--au-navy-dark), var(--au-navy)) !important; }
    .au-modal-header-icon { background: rgba(255,255,255,0.15) !important; }
    .au-profile-banner { background: linear-gradient(135deg, var(--au-navy-dark) 0%, var(--au-navy) 60%, var(--au-red) 100%) !important; }
    .au-tab-active { background: var(--au-red) !important; color: #fff !important; }
    .au-filter-active { background: var(--au-navy) !important; color: #fff !important; }
    .au-progress-bar { background: linear-gradient(90deg, var(--au-red), var(--au-navy)) !important; }
    .au-progress-label-active { color: var(--au-navy) !important; }
    .au-timeline-blue  { background: var(--au-navy) !important; }
    .au-timeline-amber { background: #C9621F !important; }
    .au-timeline-green { background: #2E7D1E !important; }
    .au-view-btn { background: rgba(27,58,107,0.08) !important; color: var(--au-navy) !important; }
    .au-view-btn:hover { background: rgba(27,58,107,0.15) !important; }
    .au-ticket-id { color: var(--au-navy) !important; }
    .au-section-icon { color: var(--au-red) !important; }
    .au-dot-open    { background: var(--au-navy) !important; }
    .au-dot-pending { background: #C9621F !important; }
    .au-dot-resolved{ background: #2E7D1E !important; }
    .au-inp:focus { border-color: var(--au-navy) !important; box-shadow: 0 0 0 2px rgba(27,58,107,0.12) !important; }
    .au-success-icon { color: #2E7D1E !important; }
    .au-success-bg   { background: rgba(46,125,30,0.08) !important; }
    .au-attachment-bg { background: rgba(27,58,107,0.05) !important; border-color: rgba(27,58,107,0.12) !important; }
    .au-breadcrumb-active { color: var(--au-navy) !important; }
    .au-avatar-grad { background: linear-gradient(135deg, var(--au-navy), var(--au-red)) !important; }
    .au-camera-btn { background: var(--au-red) !important; border: 2px solid #fff; }
    .au-camera-btn:hover { background: var(--au-red-dark) !important; }
    .au-info-icon-bg { background: rgba(27,58,107,0.05) !important; }
    .au-info-icon    { color: var(--au-navy) !important; }
    .au-overlay      { background: rgba(18,40,80,0.6) !important; }
    .au-stat-icon-primary { background: rgba(27,58,107,0.1) !important; color: var(--au-navy) !important; }
    .au-stat-icon-amber   { background: rgba(240,195,48,0.15) !important; color: #b8860b !important; }
    .au-stat-icon-green   { background: rgba(46,125,30,0.12) !important; color: #2E7D1E !important; }
    .au-stat-icon-purple  { background: rgba(218,26,50,0.1) !important; color: var(--au-red) !important; }
    .au-qa-primary { background: rgba(27,58,107,0.07) !important; color: var(--au-navy) !important; }
    .au-qa-primary:hover { background: rgba(27,58,107,0.14) !important; }
    .au-topbar { height: 3px; background: linear-gradient(90deg, var(--au-red), var(--au-gold), var(--au-red)); }
    .au-contact-btn { background: var(--au-gold) !important; color: var(--au-navy-dark) !important; font-weight: 700; }
    .au-search-icon { color: rgba(255,255,255,0.3) !important; }
  `}</style>
);

/* ════════════════════════════════════════════════════════
   TICKET VIEW MODAL
════════════════════════════════════════════════════════ */
const TicketViewModal = ({ ticket, onClose }) => {
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  if (!ticket) return null;

  const timeline = [
    { icon: "fa-ticket",       color: "au-timeline-blue",  label: "Ticket Submitted", sub: formatDateTime(ticket.createdAt), msg: `Your ticket #${ticket.ticketId} has been received and is now in queue.` },
    ...(ticket.status !== "Open" ? [{ icon: "fa-hourglass-half", color: "au-timeline-amber", label: "Under Review", sub: formatDateTime(ticket.updatedAt), msg: "Our support staff is currently reviewing your concern." }] : []),
    ...(ticket.status === "Resolved" || ticket.status === "Closed" ? [{ icon: "fa-circle-check", color: "au-timeline-green", label: "Resolved", sub: formatDateTime(ticket.updatedAt), msg: ticket.adminReply || "Your concern has been resolved. Thank you for reaching out!" }] : []),
  ];
  const progressPct = ticket.status === "Open" ? 20 : ticket.status === "Pending" ? 55 : 100;

  return (
<div className="fixed inset-0 z-40 flex items-end justify-center p-4 pt-20 sm:items-center" onClick={onClose}>      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b au-modal-header border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center au-modal-header-icon w-9 h-9 rounded-xl"><i className="text-sm text-white fa-solid fa-ticket" /></div>
            <div><p className="text-sm font-extrabold text-white">#{ticket.ticketId}</p><p className="text-xs text-white/50">{formatDate(ticket.createdAt)}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <Badge label={ticket.status}   cls={`${statusStyle[ticket.status]} !text-xs`} />
            <Badge label={ticket.priority} cls={`${priorityStyle[ticket.priority]} !text-xs`} />
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 ml-2 transition bg-white/15 hover:bg-white/25 rounded-xl"><i className="text-sm text-white fa-solid fa-xmark" /></button>
          </div>
        </div>
        <div className="flex flex-col flex-1 overflow-hidden lg:flex-row">
          <div className="flex-1 p-6 overflow-y-auto border-r border-gray-100">
            <h2 className="mb-1 text-lg font-extrabold text-gray-900">{ticket.subject}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><i className="text-xs fa-solid fa-layer-group" /> {ticket.category}</span>
              {ticket.hasAttachment && <span className="text-xs au-attachment-bg text-gray-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border"><i className="text-xs fa-solid fa-paperclip" /> {ticket.attachmentName}</span>}
            </div>
            <div className="mb-5">
              <div className="flex justify-between text-xs text-gray-400 font-semibold mb-1.5"><span>Progress</span><span>{progressPct}%</span></div>
              <div className="h-2 overflow-hidden bg-gray-100 rounded-full"><div className="h-full transition-all duration-700 rounded-full au-progress-bar" style={{ width: `${progressPct}%` }} /></div>
              <div className="flex justify-between mt-1.5">{["Submitted","In Review","Resolved"].map((s, i) => <span key={s} className={`text-xs font-bold ${progressPct >= (i===0?20:i===1?55:100) ? "au-progress-label-active" : "text-gray-300"}`}>{s}</span>)}</div>
            </div>
            <div className="p-4 mb-4 bg-gray-50 rounded-2xl">
              <p className="mb-2 text-xs font-extrabold tracking-wider text-gray-400 uppercase">Description</p>
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
            <div className="p-4 border rounded-2xl au-attachment-bg">
              <p className="mb-3 text-xs font-extrabold tracking-wider text-gray-400 uppercase">Submitted By</p>
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "Name", val: ticket.studentName }, { label: "Email", val: ticket.studentEmail }, { label: "Year Level", val: ticket.yearLevel }, { label: "Section", val: ticket.section }].map(f => (
                  <div key={f.label}><p className="text-xs font-semibold text-gray-400">{f.label}</p><p className="text-sm font-bold text-gray-800">{f.val || "—"}</p></div>
                ))}
              </div>
            </div>
            {ticket.adminReply && (
              <div className="p-4 mt-4 border border-green-100 bg-green-50 rounded-2xl">
                <p className="text-xs font-extrabold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1.5"><i className="fa-solid fa-headset" /> Admin Response</p>
                <p className="text-sm leading-relaxed text-gray-700">{ticket.adminReply}</p>
              </div>
            )}
          </div>
          <div className="w-full p-5 overflow-y-auto lg:w-72 bg-gray-50 shrink-0">
            <p className="flex items-center gap-2 mb-4 text-xs font-extrabold tracking-wider text-gray-400 uppercase"><i className="fa-solid fa-timeline au-section-icon" /> Activity Feed</p>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-5">
                {timeline.map((item, i) => (
                  <div key={i} className="relative flex gap-3 pl-10">
                    <div className={`absolute left-0 w-8 h-8 ${item.color} rounded-full flex items-center justify-center shadow-md shrink-0`}><i className={`fa-solid ${item.icon} text-white text-xs`} /></div>
                    <div className="flex-1 p-3 bg-white border border-gray-100 shadow-sm rounded-2xl">
                      <p className="text-xs font-extrabold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5 mb-1.5">{item.sub}</p>
                      <p className="text-xs leading-relaxed text-gray-600">{item.msg}</p>
                    </div>
                  </div>
                ))}
                {ticket.status !== "Resolved" && ticket.status !== "Closed" && (
                  <div className="relative flex gap-3 pl-10 opacity-40">
                    <div className="absolute left-0 flex items-center justify-center w-8 h-8 bg-gray-300 rounded-full shrink-0"><i className="text-xs text-white fa-solid fa-circle-check" /></div>
                    <div className="flex-1 p-3 bg-white border border-gray-200 border-dashed rounded-2xl">
                      <p className="text-xs font-extrabold text-gray-400">Resolution Pending</p>
                      <p className="text-xs text-gray-400 mt-0.5">Waiting for admin response...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="pt-4 mt-6 space-y-2 border-t au-border-top">
              <p className="mb-3 text-xs font-extrabold tracking-wider text-gray-400 uppercase">Ticket Info</p>
              {[{ label: "Ticket ID", val: `#${ticket.ticketId}`, mono: true }, { label: "Category", val: ticket.category }, { label: "Priority", val: ticket.priority }, { label: "Status", val: ticket.status }, { label: "Submitted", val: formatDate(ticket.createdAt) }].map(f => (
                <div key={f.label} className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400">{f.label}</span>
                  <span className={`text-xs font-bold text-gray-700 ${f.mono ? "font-mono au-ticket-id" : ""}`}>{f.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   NEW TICKET MODAL  ← ✅ DYNAMIC CATEGORY + SUBJECT DROPDOWN
════════════════════════════════════════════════════════ */
const NewTicketModal = ({ onClose, student }) => {
  const [form, setForm]           = useState({ category: "", priority: "", subject: "", description: "" });
  const [attachedFile, setAttach] = useState(null);
  const [attachError, setAErr]    = useState("");
  const [dragging, setDragging]   = useState(false);
  const [submitting, setSubmit]   = useState(false);
  const [submitted, setDone]      = useState(false);
  const [formError, setFErr]      = useState("");
 
  // ── Categories from Firestore ──
  const [categories,  setCategories]  = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
 
  // ── Priorities from Firestore ──
  const [priorities,     setPriorities]     = useState([]);
  const [loadingPrios,   setLoadingPrios]   = useState(true);
 
  const FALLBACK_PRIORITIES = ["Low", "Medium", "High", "Urgent"];
 
  useEffect(() => {
    // fetch categories
    getDocs(collection(db, "settings/config/categories"))
      .then(snap => {
        const cats = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.enabled !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoadingCats(false));
 
    // fetch priorities
    getDocs(collection(db, "settings/config/priorities"))
      .then(snap => {
        const prios = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.enabled !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        setPriorities(prios);

      })
      .catch(console.error)
      .finally(() => setLoadingPrios(false));
  }, []);
 
  // Resolved priority list: DB list if available, otherwise hardcoded fallback
  const priorityOptions = priorities.length > 0
    ? priorities.map(p => p.name)
    : FALLBACK_PRIORITIES;
 
  // All subjects flat across all categories
  const allSubjects = categories.flatMap(cat =>
    (cat.subjects || []).map(sub => ({ label: sub, categoryName: cat.name }))
  );
 
  const filteredSubjects = form.category
    ? allSubjects.filter(s => s.categoryName === form.category)
    : allSubjects;
 
  const handleSubjectChange = (e) => {
    const val = e.target.value;
    setForm(f => {
      if (!f.category && val) {
        const match = allSubjects.find(s => s.label === val);
        return { ...f, subject: val, category: match?.categoryName || f.category };
      }
      return { ...f, subject: val };
    });
  };
 
  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setForm(f => {
      const subStillValid = allSubjects.some(s => s.label === f.subject && s.categoryName === newCat);
      return { ...f, category: newCat, subject: subStillValid ? f.subject : "" };
    });
  };
 
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
 
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
 
  const processFile = async (file) => {
    setAErr("");
    if (!ALLOWED_TYPES.includes(file.type)) { setAErr("Only PNG, JPG, or PDF files allowed."); return; }
    if (file.size > 5 * 1024 * 1024) { setAErr("Max 5 MB allowed."); return; }
    try { const b64 = await fileToBase64(file); setAttach({ name: file.name, type: file.type, size: file.size, base64: b64 }); }
    catch { setAErr("Could not read file."); }
  };
 
  const onFileInput = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ""; };
  const onDrop      = (e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };
 
  const handleSubmit = async (e) => {
    e.preventDefault(); setFErr("");
    if (!form.category || !form.subject || !form.description) { setFErr("Please fill in all required fields."); return; }
    setSubmit(true);
    try {
      const ticketId = generateTicketId();
 
      const ticketRef = await addDoc(collection(db, "tickets"), {
        ticketId,
        studentUid:     auth.currentUser?.uid ?? "",
        studentName:    student?.name         ?? "",
        studentEmail:   student?.email        ?? "",
        yearLevel:      student?.yearLevel    ?? "",
        section:        student?.section      ?? "",
        category:       form.category,
        priority:       form.priority,
        subject:        form.subject,
        description:    form.description,
        hasAttachment:  !!attachedFile,
        attachmentName: attachedFile?.name ?? "",
        attachmentType: attachedFile?.type ?? "",
        status:         "Open",
        adminReply:     "",
        createdAt:      serverTimestamp(),
        updatedAt:      serverTimestamp(),
      });
 
      await createTicketNotifications({
        studentUid:   auth.currentUser?.uid ?? "",
        studentName:  student?.name         ?? "Student",
        studentPhoto: student?.photoURL     ?? "",
        ticketId,
        ticketDocId:  ticketRef.id,
        subject:      form.subject,
        category:     form.category,
      });
 
      setDone(true);
      setTimeout(() => { setDone(false); onClose(); }, 2000);
    } catch (err) {
      console.error(err);
      setFErr("Failed to submit. Please try again.");
    } finally {
      setSubmit(false);
    }
  };
 
  const inp = "au-inp w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white";
 
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 pt-20 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-80px)] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b au-modal-header border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center au-modal-header-icon w-9 h-9 rounded-xl"><i className="text-white fa-solid fa-ticket" /></div>
            <div><p className="font-extrabold text-white">Submit a New Ticket</p><p className="text-xs text-white/50">Fill in the form below</p></div>
          </div>
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 transition bg-white/15 hover:bg-white/25 rounded-xl"><i className="text-white fa-solid fa-xmark" /></button>
        </div>
 
        <div className="flex-1 p-6 overflow-y-auto">
          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex items-center justify-center w-20 h-20 mb-4 rounded-full au-success-bg"><i className="text-4xl fa-solid fa-circle-check au-success-icon" /></div>
              <p className="text-lg font-extrabold text-gray-800">Ticket Submitted!</p>
              <p className="mt-1 text-sm text-gray-400">You'll receive a notification shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && <div className="flex items-center gap-2 p-3 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl"><i className="fa-solid fa-circle-exclamation" /> {formError}</div>}
 
              {/* Student info strip */}
              <div className="grid grid-cols-2 gap-3 p-3 border sm:grid-cols-4 au-attachment-bg rounded-2xl">
                {[{ label: "Name", val: student?.name }, { label: "Email", val: student?.email }, { label: "Year Level", val: student?.yearLevel }, { label: "Section", val: student?.section }].map(f => (
                  <div key={f.label}><p className="text-xs au-breadcrumb-active font-bold mb-0.5">{f.label}</p><p className="text-xs font-extrabold text-gray-800 truncate">{f.val || "—"}</p></div>
                ))}
              </div>
 
              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Subject <span className="text-red-400">*</span>
                  {loadingCats && <i className="fa-solid fa-spinner fa-spin text-gray-300 ml-1 text-[10px]" />}
                  {!loadingCats && allSubjects.length === 0 && (
                    <span className="ml-1 text-gray-400 font-normal text-[10px]">(type your concern)</span>
                  )}
                </label>
                {!loadingCats && allSubjects.length > 0 ? (
                  <select name="subject" value={form.subject} onChange={handleSubjectChange} className={inp}>
                    <option value="">-- Select Subject --</option>
                    {filteredSubjects.map((s, i) => (
                      <option key={i} value={s.label}>
                        {form.category ? s.label : `${s.label} (${s.categoryName})`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleSubjectChange}
                    placeholder="Brief description of your concern..."
                    className={inp}
                  />
                )}
              </div>
 
              {/* Category + Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select name="category" value={form.category} onChange={handleCategoryChange} className={inp} disabled={loadingCats}>
                    <option value="">-- Select Category --</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                  {form.category && (
                    <button type="button" onClick={() => setForm(f => ({ ...f, category: "", subject: "" }))}
                      className="mt-1 text-[10px] text-gray-400 hover:text-red-500 font-semibold underline">
                      Clear category filter
                    </button>
                  )}
                </div>
              <div>
  <label className="block text-xs font-bold text-gray-600 mb-1.5">
    Priority
    {loadingPrios && <i className="fa-solid fa-spinner fa-spin text-gray-300 ml-1 text-[10px]" />}
  </label>
  <select name="priority" value={form.priority} onChange={handle} className={inp} disabled={loadingPrios}>
    {loadingPrios
      ? <option value="">Loading...</option>
      : <>
          <option value="">-- Select Priority --</option>
          {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </>
    }
  </select>
</div>
              </div>
 
              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Description <span className="text-red-400">*</span></label>
                <textarea rows="5" name="description" value={form.description} onChange={handle} placeholder="Describe your concern in detail..." className={inp + " resize-none"} />
              </div>
 
              {/* Attachment */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Attachment <span className="font-normal text-gray-400">(optional · PNG, JPG, PDF · max 5 MB)</span></label>
                {!attachedFile ? (
                  <div onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={onDrop}
                    onClick={() => document.getElementById("modal-file-input").click()}
                    className={`border-2 border-dashed rounded-2xl py-6 text-center cursor-pointer select-none transition ${dragging ? "border-gray-400 bg-gray-50" : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"}`}>
                    <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-300 block mb-1.5" />
                    <p className="text-sm text-gray-500">Drag & drop or <span className="font-semibold au-breadcrumb-active">browse</span></p>
                    <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, PDF · Max 5 MB</p>
                    <input id="modal-file-input" type="file" accept=".png,.jpg,.jpeg,.pdf" className="hidden" onChange={onFileInput} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 border au-attachment-bg rounded-2xl">
                    <div className="flex items-center justify-center w-10 h-10 bg-white shadow-sm rounded-xl shrink-0">
                      {attachedFile.type === "application/pdf" ? <i className="text-lg text-red-500 fa-solid fa-file-pdf" /> : <i className="text-lg text-blue-500 fa-solid fa-file-image" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800 truncate">{attachedFile.name}</p><p className="text-xs text-gray-400">{formatBytes(attachedFile.size)}</p></div>
                    <button type="button" onClick={() => { setAttach(null); setAErr(""); }} className="p-2 text-gray-400 transition rounded-xl hover:bg-red-50 hover:text-red-500"><i className="fa-solid fa-xmark" /></button>
                  </div>
                )}
                {attachError && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><i className="fa-solid fa-circle-exclamation" /> {attachError}</p>}
              </div>
 
              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting}
                  className="flex items-center justify-center flex-1 gap-2 py-3 text-sm font-extrabold transition au-btn-primary rounded-2xl">
                  {submitting ? <><i className="fa-solid fa-spinner fa-spin" /> Submitting...</> : <><i className="fa-solid fa-paper-plane" /> Submit Ticket</>}
                </button>
                <button type="button" onClick={onClose} disabled={submitting} className="px-6 py-3 text-sm font-bold text-gray-600 transition bg-gray-100 hover:bg-gray-200 rounded-2xl">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════════════ */
const Sidebar = ({ active, setActive, sidebarOpen, setSidebarOpen, studentName, studentPhoto, onLogout, onNewTicket }) => {
  const navItems    = [{ key:"home",icon:"fa-house",label:"Dashboard"},{ key:"tickets",icon:"fa-ticket",label:"My Tickets"},{ key:"history",icon:"fa-clock-rotate-left",label:"History"},{ key:"profile",icon:"fa-circle-user",label:"My Profile"}];
  const supportItems= [{ key:"faq",icon:"fa-circle-question",label:"FAQs"},{ key:"chat",icon:"fa-comments",label:"Live Chat"},{ key:"settings",icon:"fa-gear",label:"Settings"}];
  const initials    = studentName ? studentName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "ST";
  const NavBtn = ({ item }) => {
    const isActive = active === item.key;
    return (
      <button onClick={() => { setActive(item.key); setSidebarOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${isActive ? "au-nav-active" : "au-nav-inactive"}`}>
        <i className={`fa-solid ${item.icon} w-4 text-center text-sm`} /><span className="flex-1">{item.label}</span>
      </button>
    );
  };
  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-30 au-overlay lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`au-sidebar fixed top-16 left-0 h-[calc(100vh-64px)] w-64 flex flex-col z-40 transition-transform duration-300 shadow-2xl ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>        <div className="p-4 border-b au-border-bottom">
          <div className="flex items-center gap-3 p-3 au-user-card rounded-2xl">
            <div className="flex items-center justify-center w-10 h-10 overflow-hidden border-2 border-yellow-400 rounded-full au-avatar-grad shrink-0">
              {studentPhoto ? <img src={studentPhoto} alt="avatar" className="object-cover w-full h-full" /> : <span className="text-sm font-extrabold text-white">{initials}</span>}
            </div>
            <div className="overflow-hidden"><p className="text-sm font-bold truncate au-user-name">{studentName || "Student"}</p><p className="font-semibold au-user-badge">Student Account</p></div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button onClick={() => { onNewTicket(); setSidebarOpen(false); }} className="au-new-ticket-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition mb-3">
            <i className="w-4 text-sm text-center fa-solid fa-plus-circle" /><span>New Ticket</span>
          </button>
          <p className="px-3 mb-2 text-xs font-extrabold tracking-widest uppercase au-section-label">Main Menu</p>
          {navItems.map(item => <NavBtn key={item.key} item={item} />)}
          <div className="pt-4 pb-2"><p className="px-3 mb-2 text-xs font-extrabold tracking-widest uppercase au-section-label">Support</p></div>
          {supportItems.map(item => <NavBtn key={item.key} item={item} />)}
        </nav>
        <div className="p-4 space-y-3 border-t au-border-top">
          <button onClick={onLogout} className="au-logout-btn w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition font-semibold"><i className="text-sm fa-solid fa-right-from-bracket" /> Sign Out</button>
          <div className="p-4 text-white au-help-card rounded-2xl">
            <p className="mb-1 text-sm font-bold">Need urgent help?</p>
            <p className="mb-2 text-xs text-white/70">Visit the registrar or call our hotline.</p>
            <button className="au-contact-btn text-xs font-bold px-3 py-1.5 rounded-lg hover:shadow transition flex items-center gap-1.5"><i className="text-xs fa-solid fa-phone" /> Contact Us</button>
          </div>
        </div>
      </aside>
    </>
  );
};

/* ════════════════════════════════════════════════════════
   HEADER
════════════════════════════════════════════════════════ */
const Header = ({ sidebarOpen, setSidebarOpen, studentName, studentPhoto, onLogout, onNewTicket, studentUid, onViewTicket }) => {
  const initials = studentName ? studentName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase() : "ST";
  return (
    <header className="sticky top-0 z-50 flex items-center h-16 gap-4 px-4 shadow-lg au-header lg:px-6">
      <div className="absolute top-0 left-0 right-0 au-topbar" />
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 transition au-hamburger lg:hidden rounded-xl"><i className="text-lg fa-solid fa-bars" /></button>
        <div className="flex items-center gap-2.5 mr-4">
        <img src="/itech.png" alt="iTech" style={{ height: "100px", width: "120px", objectFit: "contain", marginTop: "12px" }} />
      </div>
      <div className="flex-1 hidden max-w-sm md:block">
        <div className="relative">
          <i className="absolute text-sm -translate-y-1/2 fa-solid fa-magnifying-glass au-search-icon left-3 top-1/2" />
          <input type="text" placeholder="Search tickets..." className="w-full py-2 pr-4 text-sm transition border au-header pl-9 rounded-xl focus:outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-1 ml-auto">
        <button onClick={onNewTicket} className="items-center hidden gap-2 px-3 py-2 mr-2 text-xs font-bold transition au-btn-primary sm:flex rounded-xl">
          <i className="text-xs fa-solid fa-plus" /> New Ticket
        </button>
        {studentUid && (
          <NotificationBell
            recipientId={studentUid}
            role="student"
            accentColor="#1B3A6B"
            onViewTicket={onViewTicket}
            userName={studentName}
            userPhoto={studentPhoto}
          />
        )}
        <div className="w-px mx-1 au-divider h-7" style={{ background: "rgba(255,255,255,0.15)" }} />
        <div className="flex items-center gap-2.5 cursor-pointer px-2">
          <div className="flex items-center justify-center w-8 h-8 overflow-hidden border-2 border-yellow-400 rounded-full au-avatar-grad shrink-0">
            {studentPhoto ? <img src={studentPhoto} alt="avatar" className="object-cover w-full h-full" /> : <span className="text-xs font-extrabold text-white">{initials}</span>}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none au-user-name">{studentName || "Student"}</p>
            <p className="au-user-sub text-xs mt-0.5">Student Account</p>
          </div>
        </div>
        <button onClick={onLogout} title="Sign Out" className="au-icon-btn p-2.5 rounded-xl transition"><i className="text-base fa-solid fa-right-from-bracket" /></button>
      </div>
    </header>
  );
};

/* ════════════════════════════════════════════════════════
   DASHBOARD HOME
════════════════════════════════════════════════════════ */
const DashboardHome = ({ student, setActive, tickets, onNewTicket, onViewTicket }) => {
  const openCount = tickets.filter(t=>t.status==="Open").length;
  const pendingCount = tickets.filter(t=>t.status==="Pending").length;
  const resolvedCount = tickets.filter(t=>t.status==="Resolved").length;
  const stats = [
    { val:String(tickets.length), label:"Total Tickets", icon:"fa-ticket", iconCls:"au-stat-icon-primary", sub:"All time" },
    { val:String(openCount+pendingCount), label:"In Progress", icon:"fa-spinner", iconCls:"au-stat-icon-amber", sub:"Active" },
    { val:String(resolvedCount), label:"Resolved", icon:"fa-circle-check", iconCls:"au-stat-icon-green", sub:"Done" },
    { val:"4.8", label:"Satisfaction", icon:"fa-star", iconCls:"au-stat-icon-purple", sub:"Avg rating" },
  ];
  const announcements = [
    { color:"bg-blue-50 border-blue-100", titleCls:"text-blue-800", subCls:"text-blue-500", icon:"fa-bell", title:"Enrollment period open", sub:"Feb 20 – Mar 5, 2025" },
    { color:"bg-amber-50 border-amber-100", titleCls:"text-amber-800", subCls:"text-amber-500", icon:"fa-triangle-exclamation", title:"LMS Maintenance Tonight", sub:"Feb 22 · 10pm – 12am" },
    { color:"bg-green-50 border-green-100", titleCls:"text-green-800", subCls:"text-green-500", icon:"fa-circle-check", title:"Scholarship apps open", sub:"Submit by Feb 28, 2025" },
  ];
  const quickActions = [
    { icon:"fa-plus", label:"New Ticket", action:onNewTicket, cls:"au-qa-primary" },
    { icon:"fa-circle-question", label:"FAQs", action:()=>setActive("faq"), cls:"bg-gray-50 hover:bg-gray-100 text-gray-600" },
    { icon:"fa-comments", label:"Live Chat", action:()=>setActive("chat"), cls:"bg-gray-50 hover:bg-gray-100 text-gray-600" },
    { icon:"fa-phone", label:"Call Us", action:()=>{}, cls:"bg-gray-50 hover:bg-gray-100 text-gray-600" },
  ];
  const hour = new Date().getHours();
  const greeting = hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const recentTickets = tickets.slice(0,5);
  return (
    <div className="space-y-6">
      <div className="relative p-6 overflow-hidden au-hero rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background:"linear-gradient(90deg,#DA1A32,#F0C330,#DA1A32)" }} />
        <div className="relative z-10">
          <p className="mb-1 text-sm text-white/60"><i className="mr-1 fa-solid fa-hand-wave" /> {greeting}</p>
          <h2 className="mb-1 text-2xl font-extrabold text-white">{student?.name||"Student"}!</h2>
          <p className="text-sm text-white/60">{student?.yearLevel}{student?.section&&` · ${student.section}`}{student?.email&&` · ${student.email}`}</p>
          <div className="flex gap-3 mt-4">
            <button onClick={onNewTicket} className="au-hero-btn-solid text-sm font-extrabold px-4 py-2 rounded-xl hover:shadow-lg transition hover:-translate-y-0.5 flex items-center gap-2"><i className="text-xs fa-solid fa-plus" /> Submit Ticket</button>
            <button onClick={()=>setActive("tickets")} className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition au-hero-btn-outline rounded-xl"><i className="text-xs fa-solid fa-ticket" /> My Tickets</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(s=>(
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition cursor-default">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.iconCls}`}><i className={`fa-solid ${s.icon} text-base`} /></div>
              <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{s.sub}</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{s.val}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="overflow-hidden bg-white border border-gray-100 lg:col-span-2 rounded-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="flex items-center gap-2 font-extrabold text-gray-800"><i className="text-sm fa-solid fa-clock-rotate-left au-section-icon" /> Recent Tickets</h3>
            <button onClick={()=>setActive("tickets")} className="text-xs font-semibold au-breadcrumb-active hover:underline">View all →</button>
          </div>
          {recentTickets.length===0?(
            <div className="py-12 text-center"><i className="block mb-3 text-4xl text-gray-200 fa-solid fa-ticket-simple" /><p className="text-sm text-gray-400">No tickets yet.</p></div>
          ):(
            <div className="divide-y divide-gray-50">
              {recentTickets.map(t=>(
                <div key={t.id} className="flex items-center gap-4 px-6 py-3 transition cursor-pointer hover:bg-gray-50" onClick={()=>onViewTicket(t.id)}>
                  <div className={`w-2 h-2 rounded-full shrink-0 ${t.status==="Open"?"au-dot-open":t.status==="Pending"?"au-dot-pending":"au-dot-resolved"}`} />
                  <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-800 truncate">{t.subject}</p><p className="text-xs text-gray-400">{t.category} · #{t.ticketId}</p></div>
                  <Badge label={t.status} cls={statusStyle[t.status]||"bg-gray-100 text-gray-500"} />
                  <i className="text-xs text-gray-300 fa-solid fa-chevron-right" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="p-5 bg-white border border-gray-100 rounded-2xl">
            <h3 className="flex items-center gap-2 mb-4 font-extrabold text-gray-800"><i className="text-sm fa-solid fa-bullhorn au-section-icon" /> Announcements</h3>
            <div className="space-y-3">{announcements.map(a=><div key={a.title} className={`p-3 rounded-xl border ${a.color}`}><p className={`text-sm font-bold ${a.titleCls} flex items-center gap-1.5`}><i className={`fa-solid ${a.icon} text-xs`} /> {a.title}</p><p className={`text-xs mt-0.5 ${a.subCls}`}>{a.sub}</p></div>)}</div>
          </div>
          <div className="p-5 bg-white border border-gray-100 rounded-2xl">
            <h3 className="flex items-center gap-2 mb-4 font-extrabold text-gray-800"><i className="text-sm fa-solid fa-bolt text-amber-500" /> Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">{quickActions.map(q=><button key={q.label} onClick={q.action} className={`flex flex-col items-center gap-2 p-3 rounded-xl transition ${q.cls}`}><i className={`fa-solid ${q.icon} text-lg`} /><span className="text-xs font-bold">{q.label}</span></button>)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MY TICKETS
════════════════════════════════════════════════════════ */
const MyTickets = ({ tickets, loadingTickets, onNewTicket, onViewTicket }) => {
  const [filter, setFilter] = useState("All");
  const filters = ["All","Open","Pending","Resolved"];
  const filtered = filter==="All" ? tickets : tickets.filter(t=>t.status===filter);
  return (
    <div>
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400"><i className="text-gray-300 fa-solid fa-house" /><span>/</span><span className="font-semibold au-breadcrumb-active">My Tickets</span></div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900"><i className="fa-solid fa-ticket au-section-icon" /> My Tickets</h2>
        <button onClick={onNewTicket} className="flex items-center gap-2 px-4 py-2 text-sm font-bold transition au-btn-primary rounded-xl"><i className="text-xs fa-solid fa-plus" /> New Ticket</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        {filters.map(f=><button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition ${filter===f?"au-filter-active":"bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>{f} ({f==="All"?tickets.length:tickets.filter(t=>t.status===f).length})</button>)}
      </div>
      <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
        {loadingTickets?(
          <div className="py-12 text-center"><i className="block mb-3 text-3xl fa-solid fa-spinner fa-spin au-section-icon" /><p className="text-sm text-gray-400">Loading tickets...</p></div>
        ):filtered.length===0?(
          <div className="py-12 text-center"><i className="block mb-3 text-4xl text-gray-200 fa-solid fa-ticket-simple" /><p className="text-sm font-semibold text-gray-500">No tickets found.</p><button onClick={onNewTicket} className="mt-3 text-sm font-bold au-breadcrumb-active hover:underline">Submit your first ticket →</button></div>
        ):(
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs tracking-wider text-gray-400 uppercase bg-gray-50"><tr>{["Ticket ID","Subject","Category","Priority","Status","Date","Action"].map(h=><th key={h} className="px-5 py-3 text-left">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t=>(
                  <tr key={t.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs font-bold au-ticket-id">#{t.ticketId}</td>
                    <td className="px-5 py-3"><p className="font-semibold text-gray-800 max-w-[160px] truncate">{t.subject}</p>{t.hasAttachment&&<span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><i className="text-xs fa-solid fa-paperclip" />{t.attachmentName}</span>}</td>
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">{t.category}</td>
                    <td className="px-5 py-3"><Badge label={t.priority} cls={priorityStyle[t.priority]||"bg-gray-100 text-gray-500"} /></td>
                    <td className="px-5 py-3"><Badge label={t.status} cls={statusStyle[t.status]||"bg-gray-100 text-gray-500"} /></td>
                    <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                    <td className="px-5 py-3"><button onClick={()=>onViewTicket(t.id)} className="au-view-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"><i className="text-xs fa-solid fa-eye" /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MY PROFILE
════════════════════════════════════════════════════════ */
const MyProfile = ({ student, setStudent }) => {
  const [tab, setTab]       = useState("info");
  const [form, setForm]     = useState({ name: student?.name||"", phone: student?.phone||"", address: student?.address||"", age: student?.age||"", birthdate: student?.birthdate||"", bio: student?.bio||"" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState("");
  const [err, setErr]       = useState("");
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg]   = useState("");
  const [pwErr, setPwErr]   = useState("");
  const [showPw, setShowPw] = useState(false);
  const fileRef             = useRef(null);
  const initials = (student?.name || "ST").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleImageChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const compressed = await compressImage(file, 300, 300, 0.8);
      await updateDoc(doc(db, "students", auth.currentUser.uid), { photoURL: compressed, updatedAt: serverTimestamp() });
      setStudent(s => ({ ...s, photoURL: compressed }));
      setMsg("Profile photo updated!"); setTimeout(() => setMsg(""), 3000);
    } catch { setErr("Failed to upload photo."); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setErr(""); setMsg(""); setSaving(true);
    try {
      await updateDoc(doc(db, "students", auth.currentUser.uid), { name: form.name, phone: form.phone, address: form.address, age: form.age, birthdate: form.birthdate, bio: form.bio, updatedAt: serverTimestamp() });
      setStudent(s => ({ ...s, ...form }));
      setMsg("Profile updated successfully!"); setTimeout(() => setMsg(""), 3000);
    } catch { setErr("Failed to save. Please try again."); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setPwErr(""); setPwMsg("");
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) { setPwErr("Fill in all fields."); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwErr("Passwords don't match."); return; }
    if (pwForm.newPw.length < 6) { setPwErr("Min 6 characters."); return; }
    setPwSaving(true);
    try {
      const user = auth.currentUser;
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, pwForm.current));
      await updatePassword(user, pwForm.newPw);
      setPwMsg("Password changed!"); setPwForm({ current: "", newPw: "", confirm: "" });
      setTimeout(() => setPwMsg(""), 3000);
    } catch (e) {
      if (e.code === "auth/wrong-password") setPwErr("Current password incorrect.");
      else setPwErr("Failed to change password.");
    } finally { setPwSaving(false); }
  };

  const inp = "au-inp w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400"><i className="text-gray-300 fa-solid fa-house" /><span>/</span><span className="font-semibold au-breadcrumb-active">My Profile</span></div>
      <div className="relative p-6 mb-5 overflow-hidden au-profile-banner rounded-2xl">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#F5D000,#DA1A32,#F5D000)" }} />
        <div className="flex items-center gap-4">
          <div className="relative group shrink-0">
            <div onClick={() => fileRef.current?.click()} className="flex items-center justify-center w-20 h-20 overflow-hidden border-4 rounded-full cursor-pointer border-white/30 au-avatar-grad">
              {student?.photoURL ? <img src={student.photoURL} alt="avatar" className="object-cover w-full h-full" /> : <span className="text-2xl font-extrabold text-white">{initials}</span>}
            </div>
            <button onClick={() => fileRef.current?.click()} className="absolute flex items-center justify-center rounded-full shadow-lg au-camera-btn -bottom-1 -right-1 w-7 h-7"><i className="text-xs text-white fa-solid fa-camera" /></button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-extrabold text-white truncate">{student?.name || "Student"}</p>
            <p className="text-sm truncate text-white/60">{student?.email}</p>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              {student?.yearLevel && <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full font-semibold">{student.yearLevel}</span>}
              {student?.section   && <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full font-semibold">{student.section}</span>}
              <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full font-semibold">Student</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex gap-1 p-1 mb-5 bg-gray-100 rounded-xl w-fit">
        {[{ id: "info", label: "Profile Info", icon: "fa-user" }, { id: "password", label: "Change Password", icon: "fa-lock" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${tab === t.id ? "au-tab-active shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <i className={`fa-solid ${t.icon} text-xs`} /> {t.label}
          </button>
        ))}
      </div>
      {tab === "info" && (
        <div className="p-6 bg-white border border-gray-100 rounded-2xl">
          {msg && <div className="flex items-center gap-2 p-3 mb-4 text-sm text-green-700 border border-green-100 bg-green-50 rounded-xl"><i className="fa-solid fa-circle-check au-success-icon" /> {msg}</div>}
          {err && <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label><input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} placeholder="Your full name" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Email</label><input type="email" value={student?.email || ""} disabled className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Phone</label><input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} placeholder="+63 9XX XXX XXXX" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Age</label><input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} className={inp} placeholder="e.g. 20" /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Birthdate</label><input type="date" value={form.birthdate} onChange={e => setForm(f => ({ ...f, birthdate: e.target.value }))} className={inp} /></div>
              <div><label className="block text-xs font-bold text-gray-600 mb-1.5">Year Level</label><input type="text" value={student?.yearLevel || ""} disabled className={`${inp} bg-gray-50 text-gray-400 cursor-not-allowed`} /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1.5">Address</label><input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className={inp} placeholder="Your address" /></div>
              <div className="sm:col-span-2"><label className="block text-xs font-bold text-gray-600 mb-1.5">Bio</label><textarea rows="3" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className={`${inp} resize-none`} placeholder="Tell us something about yourself..." /></div>
            </div>
            <button type="submit" disabled={saving} className="flex items-center justify-center w-full gap-2 py-3 text-sm font-extrabold transition au-btn-primary rounded-xl">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : <><i className="fa-solid fa-floppy-disk" /> Save Changes</>}
            </button>
          </form>
        </div>
      )}
      {tab === "password" && (
        <div className="p-6 bg-white border border-gray-100 rounded-2xl">
          {pwMsg && <div className="flex items-center gap-2 p-3 mb-4 text-sm text-green-700 border border-green-100 bg-green-50 rounded-xl"><i className="fa-solid fa-circle-check au-success-icon" /> {pwMsg}</div>}
          {pwErr && <div className="flex items-center gap-2 p-3 mb-4 text-sm text-red-600 border border-red-100 bg-red-50 rounded-xl"><i className="fa-solid fa-circle-exclamation" /> {pwErr}</div>}
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[{ key: "current", label: "Current Password" }, { key: "newPw", label: "New Password" }, { key: "confirm", label: "Confirm New Password" }].map((f, i) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={pwForm[f.key]} onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))} className={`${inp} pr-16`} placeholder="••••••••" />
                  {i === 0 && <button type="button" onClick={() => setShowPw(!showPw)} className="absolute text-xs font-semibold text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600">{showPw ? "Hide" : "Show"}</button>}
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwSaving} className="flex items-center justify-center w-full gap-2 py-3 text-sm font-extrabold transition au-btn-primary rounded-xl">
              {pwSaving ? <><i className="fa-solid fa-spinner fa-spin" /> Changing...</> : <><i className="fa-solid fa-key" /> Change Password</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   MAIN STUDENT DASHBOARD
════════════════════════════════════════════════════════ */
const StudentDashboard = ({ setPage }) => {
  const [active, setActive]                 = useState("home");
  const [sidebarOpen, setSidebarOpen]       = useState(false);
  const [student, setStudent]               = useState(null);
  const [loading, setLoading]               = useState(true);
  const [tickets, setTickets]               = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showNewTicket, setShowNewTicket]   = useState(false);
  const [viewingTicketId, setViewingTicketId] = useState(null);

  useEffect(() => {
    let unsubTickets = null;
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { setPage("login"); return; }
      const cacheKey = `student_${user.uid}`;
      const cached = safeStore.get(cacheKey);
      if (cached) { try { setStudent(JSON.parse(cached)); setLoading(false); } catch {} }
      try {
        const snap = await getDoc(doc(db, "students", user.uid));
        const data = snap.exists() ? snap.data() : { name: user.displayName, email: user.email };
        setStudent(data);
        const { photoURL: _p, ...withoutPhoto } = data;
        safeStore.set(cacheKey, JSON.stringify(withoutPhoto));
      } catch { if (!cached) setStudent({ name: user.displayName, email: user.email }); }
      setLoading(false);
      setLoadingTickets(true);
      const q = query(collection(db, "tickets"), where("studentUid", "==", user.uid));
      unsubTickets = onSnapshot(q,
        (snap) => {
          const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          data.sort((a,b) => { const ta=a.createdAt?.toMillis?a.createdAt.toMillis():0; const tb=b.createdAt?.toMillis?b.createdAt.toMillis():0; return tb-ta; });
          setTickets(data); setLoadingTickets(false);
        },
        (err) => { console.error("Ticket listener:", err); setLoadingTickets(false); }
      );
    });
    return () => { unsubAuth(); if (unsubTickets) unsubTickets(); };
  }, [setPage]);

  const handleLogout = async () => {
    const uid = auth.currentUser?.uid;
    if (uid) safeStore.del(`student_${uid}`);
    await signOut(auth);
    setPage("home");
  };

  const handleViewTicket = (ticketDocId) => setViewingTicketId(ticketDocId);
  const viewingTicket = viewingTicketId ? tickets.find(t => t.id === viewingTicketId) || null : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background:"#f0f2f5" }}>
      <div className="text-center"><i className="block mb-4 text-5xl fa-solid fa-spinner fa-spin au-section-icon" /><p className="font-semibold text-gray-500">Loading your dashboard...</p></div>
    </div>
  );

  const renderContent = () => {
    switch (active) {
      case "home":     return <DashboardHome student={student} setActive={setActive} tickets={tickets} onNewTicket={()=>setShowNewTicket(true)} onViewTicket={handleViewTicket} />;
      case "tickets":  return <MyTickets tickets={tickets} loadingTickets={loadingTickets} onNewTicket={()=>setShowNewTicket(true)} onViewTicket={handleViewTicket} />;
      case "history":  return <TicketHistory tickets={tickets} onViewTicket={handleViewTicket} />;
      case "profile":  return <MyProfile student={student} setStudent={setStudent} />;
      case "faq":      return <FAQPage />;
      case "settings": return <SettingsPage student={student} onLogout={handleLogout} />;
      case "chat":     return <LiveChatPage student={student} />;
      default: return <div className="py-20 text-center"><i className="block mb-4 text-5xl text-gray-200 fa-solid fa-hammer" /><p className="text-lg font-extrabold text-gray-600">Coming Soon</p></div>;
    }
  };

  return (
    <>
      <FAStyle />
      <AUStyle />
      {showNewTicket && <NewTicketModal onClose={()=>setShowNewTicket(false)} student={student} />}
      {viewingTicket && <TicketViewModal ticket={viewingTicket} onClose={()=>setViewingTicketId(null)} />}
      <div className="flex flex-col min-h-screen au-main-bg">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          studentName={student?.name}
          studentPhoto={student?.photoURL}
          onLogout={handleLogout}
          onNewTicket={()=>setShowNewTicket(true)}
          studentUid={auth.currentUser?.uid}
          onViewTicket={handleViewTicket}
        />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar active={active} setActive={setActive} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} studentName={student?.name} studentPhoto={student?.photoURL} onLogout={handleLogout} onNewTicket={()=>setShowNewTicket(true)} />
          <main className="flex-1 p-4 overflow-y-auto lg:p-6 lg:ml-64">{renderContent()}</main>
        </div>
      </div>
      <LiveChatBubble student={student} onMaximize={()=>setActive("chat")} />
    </>
  );
};

export default StudentDashboard;