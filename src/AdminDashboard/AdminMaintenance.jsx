// AdminMaintenance.jsx
// CRUD for Categories + Subjects + Priorities + Year Levels
// Firestore:
//   settings/config/categories/{docId}  → name, enabled, order, subjects[]
//   settings/config/priorities/{docId}  → name, enabled, order
//   settings/config/yearLevels/{docId}  → name, enabled, order

import { useState, useEffect, useRef } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "../Back_end/Firebase";

const CAT_COL  = collection(db, "settings/config/categories");
const PRIO_COL = collection(db, "settings/config/priorities");
const YL_COL   = collection(db, "settings/config/yearLevels");

const cls = (...c) => c.filter(Boolean).join(" ");

/* ════════════════════════════════════════════════════════
   REUSABLE COMPONENTS — defined OUTSIDE AdminMaintenance
   so they are stable references and never cause React to
   unmount/remount on every parent re-render (which would
   reset the <input> value mid-typing).
════════════════════════════════════════════════════════ */

const SimpleModal = ({ isOpen, onClose, title, label, placeholder, inputRef, value, onChange, onSave, saving, error, note }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md overflow-hidden bg-white shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ background: "linear-gradient(135deg,#122850,#1B3A6B)" }}>
          <p className="flex items-center gap-2 text-sm font-extrabold text-white">
            <i className={`fa-solid ${isOpen === "add" ? "fa-plus" : "fa-pen"}`} /> {title}
          </p>
          <button onClick={onClose} className="flex items-center justify-center transition rounded-lg w-7 h-7 bg-white/15 hover:bg-white/25">
            <i className="text-xs text-white fa-solid fa-xmark" />
          </button>
        </div>
        <div className="p-5">
          {error && (
            <div className="flex items-center gap-2 p-3 mb-3 text-xs text-red-600 border border-red-100 bg-red-50 rounded-xl">
              <i className="fa-solid fa-circle-exclamation" /> {error}
            </div>
          )}
          <label className="block text-xs font-bold text-gray-600 mb-1.5">{label} *</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={e => e.key === "Enter" && onSave()}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
          />
          {note && <p className="mt-1.5 text-xs text-gray-400">{note}</p>}
          <div className="flex gap-3 mt-4">
            <button onClick={onSave} disabled={saving}
              className="flex-1 py-2.5 text-sm font-extrabold rounded-xl text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#DA291C" }}>
              {saving
                ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                : <><i className="fa-solid fa-floppy-disk" /> {isOpen === "add" ? `Add ${label}` : "Save Changes"}</>}
            </button>
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ item, onClose, onConfirm, itemLabel, extraMsg }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm p-6 text-center bg-white shadow-2xl rounded-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-center mx-auto mb-4 rounded-full w-14 h-14 bg-red-50">
          <i className="text-2xl fa-solid fa-triangle-exclamation" style={{ color: "#DA291C" }} />
        </div>
        <p className="mb-1 text-base font-extrabold text-gray-900">Delete {itemLabel}?</p>
        <p className="mb-5 text-sm text-gray-500">
          <span className="font-bold text-gray-700">"{item.name}"</span> will be permanently removed.
          {extraMsg ? ` ${extraMsg}` : ""}
        </p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-extrabold rounded-xl text-white" style={{ background: "#DA291C" }}>
            Yes, Delete
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const SimpleListTab = ({ items, itemLoading, emptyIcon, emptyLabel, headerLabel, headerIcon, noteText, onAdd, onEdit, onToggle, onDelete, onDragStart, onDragOver, onDrop }) => (
  <>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <p className="flex items-center gap-2 text-sm font-bold text-gray-500">
        <i className={`fa-solid ${headerIcon}`} style={{ color: "#DA291C" }} />
        {items.length} {items.length === 1 ? headerLabel : `${headerLabel}s`}
      </p>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition rounded-xl"
        style={{ background: "#DA291C", boxShadow: "0 4px 14px rgba(218,41,28,0.3)" }}>
        <i className="text-xs fa-solid fa-plus" /> Add {headerLabel}
      </button>
    </div>

    {itemLoading ? (
      <div className="py-16 text-center">
        <i className="text-3xl fa-solid fa-spinner fa-spin" style={{ color: "#DA291C" }} />
      </div>
    ) : (
      <div className="max-w-lg">
        <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <i className={`fa-solid ${headerIcon} text-xs`} style={{ color: "#DA291C" }} />
            <p className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">{headerLabel}s</p>
            <span className="ml-auto text-[10px] text-gray-400 font-semibold">drag to reorder</span>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center">
              <i className={`fa-solid ${emptyIcon} text-3xl text-gray-200 block mb-3`} />
              <p className="text-sm text-gray-400">{emptyLabel}</p>
              <button onClick={onAdd} className="mt-2 text-xs font-bold" style={{ color: "#1B3A6B" }}>
                + Add your first {headerLabel.toLowerCase()}
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {items.map((item, idx) => (
                <div key={item.id} draggable
                  onDragStart={() => onDragStart(item.id)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(item.id)}
                  className="flex items-center gap-3 px-4 py-3 transition select-none hover:bg-gray-50">
                  <i className="text-xs text-gray-300 fa-solid fa-grip-vertical cursor-grab shrink-0" />
                  <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0"
                    style={{ background: "rgba(27,58,107,0.08)", color: "#1B3A6B" }}>{idx + 1}</span>
                  <p className={cls("flex-1 text-sm font-semibold", item.enabled ? "text-gray-800" : "text-gray-400 line-through")}>
                    {item.name}
                  </p>
                  <button onClick={() => onToggle(item)} title={item.enabled ? "Disable" : "Enable"}
                    className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0"
                    style={{ background: item.enabled ? "rgba(46,125,30,0.1)" : "rgba(0,0,0,0.05)", color: item.enabled ? "#2E7D1E" : "#9ca3af" }}>
                    <i className={`fa-solid ${item.enabled ? "fa-eye" : "fa-eye-slash"} text-xs`} />
                  </button>
                  <button onClick={() => onEdit(item)}
                    className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 hover:bg-gray-100"
                    style={{ color: "#1B3A6B" }}>
                    <i className="text-xs fa-solid fa-pen" />
                  </button>
                  <button onClick={() => onDelete(item)}
                    className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 hover:bg-red-50"
                    style={{ color: "#DA291C" }}>
                    <i className="text-xs fa-solid fa-trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
          <i className="fa-solid fa-circle-info" /> {noteText}
        </p>
      </div>
    )}
  </>
);

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
const AdminMaintenance = () => {
  const [mainTab, setMainTab] = useState("categories");

  /* ══ CATEGORIES ══ */
  const [cats,      setCats]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selId,     setSelId]     = useState(null);
  const [catModal,  setCatModal]  = useState(false);
  const [catName,   setCatName]   = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catErr,    setCatErr]    = useState("");
  const [subInput,  setSubInput]  = useState("");
  const [editSub,   setEditSub]   = useState(null);
  const [subSaving, setSubSaving] = useState(false);
  const [delCat,    setDelCat]    = useState(null);
  const catInputRef = useRef(null);
  const catDragRef  = useRef(null);
  const subDragRef  = useRef(null);

  /* ══ PRIORITIES ══ */
  const [prios,       setPrios]       = useState([]);
  const [prioLoading, setPrioLoading] = useState(true);
  const [prioModal,   setPrioModal]   = useState(false);
  const [prioName,    setPrioName]    = useState("");
  const [prioSaving,  setPrioSaving]  = useState(false);
  const [prioErr,     setPrioErr]     = useState("");
  const [delPrio,     setDelPrio]     = useState(null);
  const prioInputRef = useRef(null);
  const prioDragRef  = useRef(null);

  /* ══ YEAR LEVELS ══ */
  const [yls,       setYls]       = useState([]);
  const [ylLoading, setYlLoading] = useState(true);
  const [ylModal,   setYlModal]   = useState(false);
  const [ylName,    setYlName]    = useState("");
  const [ylSaving,  setYlSaving]  = useState(false);
  const [ylErr,     setYlErr]     = useState("");
  const [delYl,     setDelYl]     = useState(null);
  const ylInputRef = useRef(null);
  const ylDragRef  = useRef(null);

  /* ── Firestore listeners ── */
  useEffect(() => {
    const u1 = onSnapshot(CAT_COL, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
      setCats(data); setLoading(false);
      setSelId(prev => prev ?? (data[0]?.id || null));
    });
    const u2 = onSnapshot(PRIO_COL, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
      setPrios(data); setPrioLoading(false);
    });
    const u3 = onSnapshot(YL_COL, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
      setYls(data); setYlLoading(false);
    });
    return () => { u1(); u2(); u3(); };
  }, []);

  const selCat    = cats.find(c => c.id === selId) ?? null;
  const onDragOver = (e) => e.preventDefault();

  /* ══ CATEGORY CRUD ══ */
  const openAddCat  = () => { setCatName(""); setCatErr(""); setCatModal("add"); setTimeout(() => catInputRef.current?.focus(), 50); };
  const openEditCat = (cat) => { setCatName(cat.name); setCatErr(""); setCatModal(cat); setTimeout(() => catInputRef.current?.focus(), 50); };
  const saveCat = async () => {
    const t = catName.trim();
    if (!t) { setCatErr("Category name is required."); return; }
    if (cats.find(c => c.name.toLowerCase() === t.toLowerCase() && (catModal === "add" || c.id !== catModal.id))) { setCatErr("Already exists."); return; }
    setCatSaving(true); setCatErr("");
    try {
      if (catModal === "add") {
        await addDoc(CAT_COL, { name: t, enabled: true, order: cats.reduce((m, c) => Math.max(m, c.order ?? 0), 0) + 1, subjects: [], createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "settings/config/categories", catModal.id), { name: t, updatedAt: serverTimestamp() });
      }
      setCatModal(false);
    } catch (e) { setCatErr(e.message); }
    setCatSaving(false);
  };
  const toggleCatEnabled = async (cat) => updateDoc(doc(db, "settings/config/categories", cat.id), { enabled: !cat.enabled, updatedAt: serverTimestamp() });
  const confirmDeleteCat = async () => { if (!delCat) return; await deleteDoc(doc(db, "settings/config/categories", delCat.id)); if (selId === delCat.id) setSelId(null); setDelCat(null); };
  const onCatDragStart = (id) => { catDragRef.current = id; };
  const onCatDrop = async (targetId) => {
    if (!catDragRef.current || catDragRef.current === targetId) return;
    const from = cats.findIndex(c => c.id === catDragRef.current), to = cats.findIndex(c => c.id === targetId);
    const r = [...cats]; const [m] = r.splice(from, 1); r.splice(to, 0, m);
    const batch = writeBatch(db); r.forEach((c, i) => batch.update(doc(db, "settings/config/categories", c.id), { order: i })); await batch.commit();
    catDragRef.current = null;
  };

  /* ══ SUBJECT CRUD ══ */
  const addSubject = async () => {
    const t = subInput.trim(); if (!t || !selCat) return;
    if ((selCat.subjects || []).map(s => s.toLowerCase()).includes(t.toLowerCase())) return;
    setSubSaving(true);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), { subjects: [...(selCat.subjects || []), t], updatedAt: serverTimestamp() });
    setSubInput(""); setSubSaving(false);
  };
  const saveEditSub = async () => {
    if (!editSub || !selCat) return; const t = editSub.value.trim(); if (!t) return;
    const updated = [...(selCat.subjects || [])]; updated[editSub.index] = t;
    setSubSaving(true);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), { subjects: updated, updatedAt: serverTimestamp() });
    setEditSub(null); setSubSaving(false);
  };
  const deleteSub = async (index) => {
    if (!selCat) return;
    await updateDoc(doc(db, "settings/config/categories", selCat.id), { subjects: (selCat.subjects || []).filter((_, i) => i !== index), updatedAt: serverTimestamp() });
  };
  const onSubDragStart = (i) => { subDragRef.current = i; };
  const onSubDrop = async (targetIdx) => {
    if (subDragRef.current === null || subDragRef.current === targetIdx || !selCat) return;
    const arr = [...(selCat.subjects || [])]; const [m] = arr.splice(subDragRef.current, 1); arr.splice(targetIdx, 0, m);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), { subjects: arr, updatedAt: serverTimestamp() });
    subDragRef.current = null;
  };

  /* ══ PRIORITY CRUD ══ */
  const openAddPrio  = () => { setPrioName(""); setPrioErr(""); setPrioModal("add"); setTimeout(() => prioInputRef.current?.focus(), 50); };
  const openEditPrio = (p) => { setPrioName(p.name); setPrioErr(""); setPrioModal(p); setTimeout(() => prioInputRef.current?.focus(), 50); };
  const savePrio = async () => {
    const t = prioName.trim();
    if (!t) { setPrioErr("Priority name is required."); return; }
    if (prios.find(p => p.name.toLowerCase() === t.toLowerCase() && (prioModal === "add" || p.id !== prioModal.id))) { setPrioErr("Already exists."); return; }
    setPrioSaving(true); setPrioErr("");
    try {
      if (prioModal === "add") {
        await addDoc(PRIO_COL, { name: t, enabled: true, order: prios.reduce((m, p) => Math.max(m, p.order ?? 0), 0) + 1, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "settings/config/priorities", prioModal.id), { name: t, updatedAt: serverTimestamp() });
      }
      setPrioModal(false);
    } catch (e) { setPrioErr(e.message); }
    setPrioSaving(false);
  };
  const togglePrioEnabled = async (p) => updateDoc(doc(db, "settings/config/priorities", p.id), { enabled: !p.enabled, updatedAt: serverTimestamp() });
  const confirmDeletePrio = async () => { if (!delPrio) return; await deleteDoc(doc(db, "settings/config/priorities", delPrio.id)); setDelPrio(null); };
  const onPrioDragStart = (id) => { prioDragRef.current = id; };
  const onPrioDrop = async (targetId) => {
    if (!prioDragRef.current || prioDragRef.current === targetId) return;
    const from = prios.findIndex(p => p.id === prioDragRef.current), to = prios.findIndex(p => p.id === targetId);
    const r = [...prios]; const [m] = r.splice(from, 1); r.splice(to, 0, m);
    const batch = writeBatch(db); r.forEach((p, i) => batch.update(doc(db, "settings/config/priorities", p.id), { order: i })); await batch.commit();
    prioDragRef.current = null;
  };

  /* ══ YEAR LEVEL CRUD ══ */
  const openAddYl  = () => { setYlName(""); setYlErr(""); setYlModal("add"); setTimeout(() => ylInputRef.current?.focus(), 50); };
  const openEditYl = (yl) => { setYlName(yl.name); setYlErr(""); setYlModal(yl); setTimeout(() => ylInputRef.current?.focus(), 50); };
  const saveYl = async () => {
    const t = ylName.trim();
    if (!t) { setYlErr("Year level name is required."); return; }
    if (yls.find(y => y.name.toLowerCase() === t.toLowerCase() && (ylModal === "add" || y.id !== ylModal.id))) { setYlErr("Already exists."); return; }
    setYlSaving(true); setYlErr("");
    try {
      if (ylModal === "add") {
        await addDoc(YL_COL, { name: t, enabled: true, order: yls.reduce((m, y) => Math.max(m, y.order ?? 0), 0) + 1, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "settings/config/yearLevels", ylModal.id), { name: t, updatedAt: serverTimestamp() });
      }
      setYlModal(false);
    } catch (e) { setYlErr(e.message); }
    setYlSaving(false);
  };
  const toggleYlEnabled = async (yl) => updateDoc(doc(db, "settings/config/yearLevels", yl.id), { enabled: !yl.enabled, updatedAt: serverTimestamp() });
  const confirmDeleteYl = async () => { if (!delYl) return; await deleteDoc(doc(db, "settings/config/yearLevels", delYl.id)); setDelYl(null); };
  const onYlDragStart = (id) => { ylDragRef.current = id; };
  const onYlDrop = async (targetId) => {
    if (!ylDragRef.current || ylDragRef.current === targetId) return;
    const from = yls.findIndex(y => y.id === ylDragRef.current), to = yls.findIndex(y => y.id === targetId);
    const r = [...yls]; const [m] = r.splice(from, 1); r.splice(to, 0, m);
    const batch = writeBatch(db); r.forEach((y, i) => batch.update(doc(db, "settings/config/yearLevels", y.id), { order: i })); await batch.commit();
    ylDragRef.current = null;
  };

  const tabs = [
    { id: "categories", label: "Categories & Subjects", icon: "fa-layer-group" },
    { id: "priorities",  label: "Priorities",           icon: "fa-flag" },
    { id: "yearLevels",  label: "Year Levels",          icon: "fa-graduation-cap" },
  ];

  /* ══ RENDER ══ */
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-gray-400">
        <i className="text-gray-300 fa-solid fa-house" /><span>/</span>
        <span style={{ color: "#1B3A6B" }} className="font-semibold">Maintenance</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-gray-900">
          <i className="fa-solid fa-screwdriver-wrench" style={{ color: "#DA291C" }} /> Maintenance
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 mb-6 bg-gray-100 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setMainTab(t.id)}
            className={cls("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition", mainTab === t.id ? "text-white shadow-sm" : "text-gray-500 hover:text-gray-700")}
            style={mainTab === t.id ? { background: "#DA291C" } : {}}>
            <i className={`fa-solid ${t.icon} text-xs`} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ CATEGORIES TAB ══ */}
      {mainTab === "categories" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="flex items-center gap-2 text-sm font-bold text-gray-500">
              <i className="fa-solid fa-layer-group" style={{ color: "#DA291C" }} />
              {cats.length} {cats.length === 1 ? "category" : "categories"}
            </p>
            <button onClick={openAddCat}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white transition rounded-xl"
              style={{ background: "#DA291C", boxShadow: "0 4px 14px rgba(218,41,28,0.3)" }}>
              <i className="text-xs fa-solid fa-plus" /> Add Category
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center"><i className="text-3xl fa-solid fa-spinner fa-spin" style={{ color: "#DA291C" }} /></div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
              {/* Category list */}
              <div className="lg:col-span-2">
                <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <i className="text-xs fa-solid fa-layer-group" style={{ color: "#DA291C" }} />
                    <p className="text-xs font-extrabold tracking-wider text-gray-500 uppercase">Categories</p>
                    <span className="ml-auto text-[10px] text-gray-400 font-semibold">drag to reorder</span>
                  </div>
                  {cats.length === 0 ? (
                    <div className="py-12 text-center">
                      <i className="block mb-3 text-3xl text-gray-200 fa-solid fa-layer-group" />
                      <p className="text-sm text-gray-400">No categories yet.</p>
                      <button onClick={openAddCat} className="mt-2 text-xs font-bold" style={{ color: "#1B3A6B" }}>+ Add your first category</button>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {cats.map(cat => (
                        <div key={cat.id} draggable
                          onDragStart={() => onCatDragStart(cat.id)} onDragOver={onDragOver} onDrop={() => onCatDrop(cat.id)}
                          onClick={() => setSelId(cat.id)}
                          className={cls("flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none", selId === cat.id ? "bg-blue-50" : "hover:bg-gray-50")}>
                          <i className="text-xs text-gray-300 fa-solid fa-grip-vertical cursor-grab shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className={cls("text-sm font-semibold truncate", cat.enabled ? "text-gray-800" : "text-gray-400 line-through")}>{cat.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{(cat.subjects || []).length} subject{(cat.subjects || []).length !== 1 ? "s" : ""}</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); toggleCatEnabled(cat); }}
                            className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0"
                            style={{ background: cat.enabled ? "rgba(46,125,30,0.1)" : "rgba(0,0,0,0.05)", color: cat.enabled ? "#2E7D1E" : "#9ca3af" }}>
                            <i className={`fa-solid ${cat.enabled ? "fa-eye" : "fa-eye-slash"} text-xs`} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); openEditCat(cat); }}
                            className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 hover:bg-gray-100" style={{ color: "#1B3A6B" }}>
                            <i className="text-xs fa-solid fa-pen" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDelCat(cat); }}
                            className="flex items-center justify-center w-8 h-8 transition rounded-lg shrink-0 hover:bg-red-50" style={{ color: "#DA291C" }}>
                            <i className="text-xs fa-solid fa-trash" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Subject editor */}
              <div className="lg:col-span-3">
                {!selCat ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-center mb-4 w-14 h-14 rounded-2xl" style={{ background: "rgba(27,58,107,0.07)" }}>
                      <i className="text-xl fa-solid fa-arrow-left" style={{ color: "#1B3A6B" }} />
                    </div>
                    <p className="text-sm font-extrabold text-gray-700">Select a category</p>
                    <p className="mt-1 text-xs text-gray-400">Click a category on the left to manage its subjects.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden bg-white border border-gray-100 rounded-2xl">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ background: "linear-gradient(135deg,#122850,#1B3A6B)" }}>
                      <div>
                        <p className="flex items-center gap-2 text-sm font-extrabold text-white"><i className="fa-solid fa-list-ul" /> {selCat.name}</p>
                        <p className="text-white/50 text-xs mt-0.5">
                          {(selCat.subjects || []).length} subject{(selCat.subjects || []).length !== 1 ? "s" : ""}
                          {!selCat.enabled && <span className="ml-2 font-semibold text-yellow-300">· Disabled</span>}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-white/40">drag to reorder</span>
                    </div>
                    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                      <p className="mb-2 text-xs font-extrabold tracking-wider text-gray-500 uppercase">Add Subject</p>
                      <div className="flex gap-2">
                        <input type="text" value={subInput} onChange={e => setSubInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addSubject()}
                          placeholder="e.g. Cannot login to portal"
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white" />
                        <button onClick={addSubject} disabled={!subInput.trim() || subSaving}
                          className="px-4 py-2.5 text-sm font-bold rounded-xl text-white transition disabled:opacity-40" style={{ background: "#DA291C" }}>
                          {subSaving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-plus" />}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      {(selCat.subjects || []).length === 0 ? (
                        <div className="py-12 text-center"><i className="block mb-3 text-3xl text-gray-200 fa-solid fa-list" /><p className="text-sm text-gray-400">No subjects yet.</p></div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {(selCat.subjects || []).map((sub, idx) => (
                            <div key={idx} draggable onDragStart={() => onSubDragStart(idx)} onDragOver={onDragOver} onDrop={() => onSubDrop(idx)}
                              className="flex items-center gap-3 px-5 py-3 transition select-none hover:bg-gray-50">
                              <i className="text-xs text-gray-300 fa-solid fa-grip-vertical cursor-grab shrink-0" />
                              <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0"
                                style={{ background: "rgba(27,58,107,0.08)", color: "#1B3A6B" }}>{idx + 1}</span>
                              {editSub?.index === idx ? (
                                <div className="flex flex-1 gap-2">
                                  <input autoFocus type="text" value={editSub.value}
                                    onChange={e => setEditSub({ ...editSub, value: e.target.value })}
                                    onKeyDown={e => { if (e.key === "Enter") saveEditSub(); if (e.key === "Escape") setEditSub(null); }}
                                    className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                                  <button onClick={saveEditSub} disabled={subSaving} className="px-3 py-1.5 text-xs font-bold rounded-lg text-white" style={{ background: "#2E7D1E" }}>Save</button>
                                  <button onClick={() => setEditSub(null)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600">Cancel</button>
                                </div>
                              ) : (
                                <>
                                  <span className="flex-1 text-sm font-medium text-gray-700 truncate">{sub}</span>
                                  <button onClick={() => setEditSub({ index: idx, value: sub })}
                                    className="flex items-center justify-center transition rounded-lg w-7 h-7 hover:bg-gray-100" style={{ color: "#1B3A6B" }}>
                                    <i className="text-xs fa-solid fa-pen" />
                                  </button>
                                  <button onClick={() => deleteSub(idx)}
                                    className="flex items-center justify-center transition rounded-lg w-7 h-7 hover:bg-red-50" style={{ color: "#DA291C" }}>
                                    <i className="text-xs fa-solid fa-trash" />
                                  </button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══ PRIORITIES TAB ══ */}
      {mainTab === "priorities" && (
        <SimpleListTab
          items={prios} itemLoading={prioLoading}
          emptyIcon="fa-flag" emptyLabel="No priorities yet."
          headerLabel="Priority" headerIcon="fa-flag"
          noteText="Only enabled priorities appear in the New Ticket form."
          onAdd={openAddPrio} onEdit={openEditPrio}
          onToggle={togglePrioEnabled} onDelete={setDelPrio}
          onDragStart={onPrioDragStart} onDragOver={onDragOver} onDrop={onPrioDrop}
        />
      )}

      {/* ══ YEAR LEVELS TAB ══ */}
      {mainTab === "yearLevels" && (
        <SimpleListTab
          items={yls} itemLoading={ylLoading}
          emptyIcon="fa-graduation-cap" emptyLabel="No year levels yet."
          headerLabel="Year Level" headerIcon="fa-graduation-cap"
          noteText="Only enabled year levels appear in the student registration form."
          onAdd={openAddYl} onEdit={openEditYl}
          onToggle={toggleYlEnabled} onDelete={setDelYl}
          onDragStart={onYlDragStart} onDragOver={onDragOver} onDrop={onYlDrop}
        />
      )}

      {/* ══ MODALS ══ */}
      <SimpleModal
        isOpen={catModal} onClose={() => setCatModal(false)}
        title={catModal === "add" ? "Add Category" : "Edit Category"}
        label="Category Name" placeholder="e.g. IT Support"
        inputRef={catInputRef} value={catName}
        onChange={e => { setCatName(e.target.value); setCatErr(""); }}
        onSave={saveCat} saving={catSaving} error={catErr}
      />
      <SimpleModal
        isOpen={prioModal} onClose={() => setPrioModal(false)}
        title={prioModal === "add" ? "Add Priority" : "Edit Priority"}
        label="Priority Name" placeholder="e.g. Critical"
        inputRef={prioInputRef} value={prioName}
        onChange={e => { setPrioName(e.target.value); setPrioErr(""); }}
        onSave={savePrio} saving={prioSaving} error={prioErr}
        note="This will appear as a selectable option in the New Ticket form."
      />
      <SimpleModal
        isOpen={ylModal} onClose={() => setYlModal(false)}
        title={ylModal === "add" ? "Add Year Level" : "Edit Year Level"}
        label="Year Level Name" placeholder="e.g. 3rd Year"
        inputRef={ylInputRef} value={ylName}
        onChange={e => { setYlName(e.target.value); setYlErr(""); }}
        onSave={saveYl} saving={ylSaving} error={ylErr}
        note="This will appear in the student registration form."
      />

      <DeleteModal item={delCat}  onClose={() => setDelCat(null)}  onConfirm={confirmDeleteCat}  itemLabel="Category"
        extraMsg={delCat ? `This also removes all ${(delCat.subjects || []).length} subject(s).` : ""} />
      <DeleteModal item={delPrio} onClose={() => setDelPrio(null)} onConfirm={confirmDeletePrio} itemLabel="Priority" />
      <DeleteModal item={delYl}   onClose={() => setDelYl(null)}   onConfirm={confirmDeleteYl}   itemLabel="Year Level" />
    </div>
  );
};

export default AdminMaintenance;