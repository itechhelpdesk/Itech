// AdminMaintenance.jsx
// CRUD for Categories + Subjects
// Firestore: settings/config/categories/{docId}
//   fields: name (string), enabled (bool), order (number), subjects (array of strings)

import { useState, useEffect, useRef } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "../Back_end/Firebase";

const CAT_COL = collection(db, "settings/config/categories");

/* ── tiny helpers ── */
const cls = (...c) => c.filter(Boolean).join(" ");

/* ════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════ */
const AdminMaintenance = () => {
  const [cats,    setCats]    = useState([]);   // sorted by .order
  const [loading, setLoading] = useState(true);

  // selected category for subject editing
  const [selId,   setSelId]   = useState(null);

  // category form
  const [catModal,  setCatModal]  = useState(false); // false | "add" | {id,name,enabled,order,subjects}
  const [catName,   setCatName]   = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catErr,    setCatErr]    = useState("");

  // subject form (inline inside selected category panel)
  const [subInput,  setSubInput]  = useState("");
  const [editSub,   setEditSub]   = useState(null); // {index, value}
  const [subSaving, setSubSaving] = useState(false);

  // delete confirm
  const [delCat,  setDelCat]  = useState(null); // category object
  const inputRef = useRef(null);

  /* ── realtime listener ── */
  useEffect(() => {
    const unsub = onSnapshot(CAT_COL, snap => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
      setCats(data);
      setLoading(false);
      // ✅ Auto-select first category on initial load
      setSelId(prev => prev ?? (data[0]?.id || null));
    });
    return () => unsub();
  }, []);

  const selCat = cats.find(c => c.id === selId) ?? null;

  /* ══════════════════════════════
     CATEGORY CRUD
  ══════════════════════════════ */
  const openAddCat = () => {
    setCatName(""); setCatErr(""); setCatModal("add");
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const openEditCat = (cat) => {
    setCatName(cat.name); setCatErr(""); setCatModal(cat);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const saveCat = async () => {
    const trimmed = catName.trim();
    if (!trimmed) { setCatErr("Category name is required."); return; }
    const dup = cats.find(c =>
      c.name.toLowerCase() === trimmed.toLowerCase() &&
      (catModal === "add" || c.id !== catModal.id)
    );
    if (dup) { setCatErr("A category with that name already exists."); return; }
    setCatSaving(true); setCatErr("");
    try {
      if (catModal === "add") {
        const maxOrder = cats.reduce((m, c) => Math.max(m, c.order ?? 0), 0);
        await addDoc(CAT_COL, {
          name: trimmed, enabled: true,
          order: maxOrder + 1, subjects: [],
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "settings/config/categories", catModal.id), {
          name: trimmed, updatedAt: serverTimestamp(),
        });
        if (selId === catModal.id) setSelId(catModal.id); // keep selection
      }
      setCatModal(false);
    } catch (e) { setCatErr(e.message); }
    setCatSaving(false);
  };

  const toggleEnabled = async (cat) => {
    await updateDoc(doc(db, "settings/config/categories", cat.id), {
      enabled: !cat.enabled, updatedAt: serverTimestamp(),
    });
  };

  const confirmDeleteCat = async () => {
    if (!delCat) return;
    await deleteDoc(doc(db, "settings/config/categories", delCat.id));
    if (selId === delCat.id) setSelId(null);
    setDelCat(null);
  };

  // drag-to-reorder helpers
  const dragRef = useRef(null);
  const onDragStart = (id) => { dragRef.current = id; };
  const onDragOver  = (e)  => e.preventDefault();
  const onDrop      = async (targetId) => {
    if (!dragRef.current || dragRef.current === targetId) return;
    const from = cats.findIndex(c => c.id === dragRef.current);
    const to   = cats.findIndex(c => c.id === targetId);
    const reordered = [...cats];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const batch = writeBatch(db);
    reordered.forEach((c, i) => {
      batch.update(doc(db, "settings/config/categories", c.id), { order: i });
    });
    await batch.commit();
    dragRef.current = null;
  };

  /* ══════════════════════════════
     SUBJECT CRUD
  ══════════════════════════════ */
  const addSubject = async () => {
    const trimmed = subInput.trim();
    if (!trimmed || !selCat) return;
    if ((selCat.subjects || []).map(s => s.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setSubSaving(true);
    const updated = [...(selCat.subjects || []), trimmed];
    await updateDoc(doc(db, "settings/config/categories", selCat.id), {
      subjects: updated, updatedAt: serverTimestamp(),
    });
    setSubInput(""); setSubSaving(false);
  };

  const saveEditSub = async () => {
    if (!editSub || !selCat) return;
    const trimmed = editSub.value.trim();
    if (!trimmed) return;
    const updated = [...(selCat.subjects || [])];
    updated[editSub.index] = trimmed;
    setSubSaving(true);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), {
      subjects: updated, updatedAt: serverTimestamp(),
    });
    setEditSub(null); setSubSaving(false);
  };

  const deleteSub = async (index) => {
    if (!selCat) return;
    const updated = (selCat.subjects || []).filter((_, i) => i !== index);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), {
      subjects: updated, updatedAt: serverTimestamp(),
    });
  };

  // drag subjects
  const subDragRef = useRef(null);
  const onSubDragStart = (i)  => { subDragRef.current = i; };
  const onSubDrop      = async (targetIdx) => {
    if (subDragRef.current === null || subDragRef.current === targetIdx || !selCat) return;
    const arr = [...(selCat.subjects || [])];
    const [moved] = arr.splice(subDragRef.current, 1);
    arr.splice(targetIdx, 0, moved);
    await updateDoc(doc(db, "settings/config/categories", selCat.id), {
      subjects: arr, updatedAt: serverTimestamp(),
    });
    subDragRef.current = null;
  };

  /* ══════════════════════════════
     RENDER
  ══════════════════════════════ */
  return (
    <div>
      {/* ── Breadcrumb ── */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span style={{ color: "#1B3A6B" }} className="font-semibold">Maintenance</span>
      </div>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-screwdriver-wrench" style={{ color: "#DA291C" }} />
          Maintenance
          <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {cats.length} {cats.length === 1 ? "category" : "categories"}
          </span>
        </h2>
        <button
          onClick={openAddCat}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-white transition"
          style={{ background: "#DA291C", boxShadow: "0 4px 14px rgba(218,41,28,0.3)" }}
        >
          <i className="fa-solid fa-plus text-xs" /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <i className="fa-solid fa-spinner fa-spin text-3xl" style={{ color: "#DA291C" }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── LEFT: Category list ── */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-xs" style={{ color: "#DA291C" }} />
                <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Categories</p>
                <span className="ml-auto text-[10px] text-gray-400 font-semibold">drag to reorder</span>
              </div>

              {cats.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-layer-group text-3xl text-gray-200 block mb-3" />
                  <p className="text-gray-400 text-sm">No categories yet.</p>
                  <button onClick={openAddCat} className="mt-2 text-xs font-bold" style={{ color: "#1B3A6B" }}>
                    + Add your first category
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {cats.map(cat => (
                    <div
                      key={cat.id}
                      draggable
                      onDragStart={() => onDragStart(cat.id)}
                      onDragOver={onDragOver}
                      onDrop={() => onDrop(cat.id)}
                      onClick={() => setSelId(cat.id)}
                      className={cls(
                        "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors select-none",
                        selId === cat.id ? "bg-blue-50" : "hover:bg-gray-50"
                      )}
                    >
                      {/* drag handle */}
                      <i className="fa-solid fa-grip-vertical text-gray-300 text-xs cursor-grab shrink-0" />

                      {/* name + badge */}
                      <div className="flex-1 min-w-0">
                        <p className={cls(
                          "text-sm font-semibold truncate",
                          cat.enabled ? "text-gray-800" : "text-gray-400 line-through"
                        )}>
                          {cat.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(cat.subjects || []).length} subject{(cat.subjects || []).length !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* enabled toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); toggleEnabled(cat); }}
                        title={cat.enabled ? "Disable" : "Enable"}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition"
                        style={{
                          background: cat.enabled ? "rgba(46,125,30,0.1)" : "rgba(0,0,0,0.05)",
                          color: cat.enabled ? "#2E7D1E" : "#9ca3af",
                        }}
                      >
                        <i className={`fa-solid ${cat.enabled ? "fa-eye" : "fa-eye-slash"} text-xs`} />
                      </button>

                      {/* edit */}
                      <button
                        onClick={e => { e.stopPropagation(); openEditCat(cat); }}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
                        style={{ color: "#1B3A6B" }}
                      >
                        <i className="fa-solid fa-pen text-xs" />
                      </button>

                      {/* delete */}
                      <button
                        onClick={e => { e.stopPropagation(); setDelCat(cat); }}
                        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                        style={{ color: "#DA291C" }}
                      >
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Subject editor ── */}
          <div className="lg:col-span-3">
            {!selCat ? (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: "rgba(27,58,107,0.07)" }}>
                  <i className="fa-solid fa-arrow-left text-xl" style={{ color: "#1B3A6B" }} />
                </div>
                <p className="font-extrabold text-gray-700 text-sm">Select a category</p>
                <p className="text-gray-400 text-xs mt-1">Click a category on the left to manage its subjects.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg,#122850,#1B3A6B)" }}>
                  <div>
                    <p className="font-extrabold text-white text-sm flex items-center gap-2">
                      <i className="fa-solid fa-list-ul" />
                      {selCat.name}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5">
                      {(selCat.subjects || []).length} subject{(selCat.subjects || []).length !== 1 ? "s" : ""}
                      {!selCat.enabled && <span className="ml-2 text-yellow-300 font-semibold">· Disabled</span>}
                    </p>
                  </div>
                  <span className="text-xs text-white/40 font-semibold">drag to reorder</span>
                </div>

                {/* add subject input */}
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">Add Subject</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={subInput}
                      onChange={e => setSubInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addSubject()}
                      placeholder="e.g. Cannot login to portal"
                      className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white"
                      style={{ "--tw-ring-color": "#1B3A6B" }}
                    />
                    <button
                      onClick={addSubject}
                      disabled={!subInput.trim() || subSaving}
                      className="px-4 py-2.5 text-sm font-bold rounded-xl text-white transition disabled:opacity-40"
                      style={{ background: "#DA291C" }}
                    >
                      {subSaving ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-plus" />}
                    </button>
                  </div>
                </div>

                {/* subject list */}
                <div className="max-h-[420px] overflow-y-auto">
                  {(selCat.subjects || []).length === 0 ? (
                    <div className="text-center py-12">
                      <i className="fa-solid fa-list text-3xl text-gray-200 block mb-3" />
                      <p className="text-gray-400 text-sm">No subjects yet.</p>
                      <p className="text-gray-300 text-xs mt-1">Add subjects using the input above.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {(selCat.subjects || []).map((sub, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={() => onSubDragStart(idx)}
                          onDragOver={onDragOver}
                          onDrop={() => onSubDrop(idx)}
                          className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition select-none"
                        >
                          <i className="fa-solid fa-grip-vertical text-gray-300 text-xs cursor-grab shrink-0" />
                          <span className="w-5 h-5 rounded-full text-[10px] font-extrabold flex items-center justify-center shrink-0"
                            style={{ background: "rgba(27,58,107,0.08)", color: "#1B3A6B" }}>
                            {idx + 1}
                          </span>

                          {editSub?.index === idx ? (
                            /* inline edit */
                            <div className="flex-1 flex gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={editSub.value}
                                onChange={e => setEditSub({ ...editSub, value: e.target.value })}
                                onKeyDown={e => { if (e.key === "Enter") saveEditSub(); if (e.key === "Escape") setEditSub(null); }}
                                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none"
                              />
                              <button onClick={saveEditSub} disabled={subSaving}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg text-white"
                                style={{ background: "#2E7D1E" }}>
                                Save
                              </button>
                              <button onClick={() => setEditSub(null)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <span className="flex-1 text-sm text-gray-700 font-medium truncate">{sub}</span>
                              <button
                                onClick={() => setEditSub({ index: idx, value: sub })}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-gray-100"
                                style={{ color: "#1B3A6B" }}>
                                <i className="fa-solid fa-pen text-xs" />
                              </button>
                              <button
                                onClick={() => deleteSub(idx)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center transition hover:bg-red-50"
                                style={{ color: "#DA291C" }}>
                                <i className="fa-solid fa-trash text-xs" />
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

      {/* ══════════════════════════════
          CATEGORY MODAL (Add / Edit)
      ══════════════════════════════ */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setCatModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ background: "linear-gradient(135deg,#122850,#1B3A6B)" }}>
              <p className="font-extrabold text-white text-sm flex items-center gap-2">
                <i className={`fa-solid ${catModal === "add" ? "fa-plus" : "fa-pen"}`} />
                {catModal === "add" ? "Add Category" : "Edit Category"}
              </p>
              <button onClick={() => setCatModal(false)}
                className="w-7 h-7 bg-white/15 hover:bg-white/25 rounded-lg flex items-center justify-center transition">
                <i className="fa-solid fa-xmark text-white text-xs" />
              </button>
            </div>
            <div className="p-5">
              {catErr && (
                <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation" /> {catErr}
                </div>
              )}
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Category Name *</label>
              <input
                ref={inputRef}
                type="text"
                value={catName}
                onChange={e => { setCatName(e.target.value); setCatErr(""); }}
                onKeyDown={e => e.key === "Enter" && saveCat()}
                placeholder="e.g. IT Support"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
              />
              <div className="flex gap-3 mt-4">
                <button onClick={saveCat} disabled={catSaving}
                  className="flex-1 py-2.5 text-sm font-extrabold rounded-xl text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: "#DA291C" }}>
                  {catSaving
                    ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                    : <><i className="fa-solid fa-floppy-disk" /> {catModal === "add" ? "Add Category" : "Save Changes"}</>
                  }
                </button>
                <button onClick={() => setCatModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          DELETE CONFIRM MODAL
      ══════════════════════════════ */}
      {delCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDelCat(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-triangle-exclamation text-2xl" style={{ color: "#DA291C" }} />
            </div>
            <p className="font-extrabold text-gray-900 text-base mb-1">Delete Category?</p>
            <p className="text-gray-500 text-sm mb-5">
              <span className="font-bold text-gray-700">"{delCat.name}"</span> and all its{" "}
              <span className="font-bold">{(delCat.subjects || []).length} subject(s)</span> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={confirmDeleteCat}
                className="flex-1 py-2.5 text-sm font-extrabold rounded-xl text-white"
                style={{ background: "#DA291C" }}>
                Yes, Delete
              </button>
              <button onClick={() => setDelCat(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold rounded-xl transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenance;