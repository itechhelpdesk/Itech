import { useState, useEffect, useRef } from "react";
import {
  collection, onSnapshot, doc, updateDoc, getDocs,
  addDoc, serverTimestamp, query, where, getDoc,
} from "firebase/firestore";
import { auth, db } from "../Back_end/Firebase";
import { onAuthStateChanged } from "firebase/auth";

/* ── helpers ── */
const hoursOld = (ts) => {
  if (!ts) return 0;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 3600000);
};
const daysOld = (ts) => {
  if (!ts) return 0;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
};
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateTime = (ts) => {
  if (!ts) return "";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtCountdown = (dueDateMs) => {
  const diff = dueDateMs - Date.now();
  if (diff <= 0) return { label: "OVERDUE", color: "text-red-600", bgColor: "bg-red-50 border-red-200" };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const d = Math.floor(h / 24);
  const rh = h % 24;
  if (d > 0) return { label: `${d}d ${rh}h ${m}m remaining`, color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" };
  if (h > 0) return { label: `${h}h ${m}m remaining`, color: h < 3 ? "text-orange-600" : "text-yellow-600", bgColor: h < 3 ? "bg-orange-50 border-orange-200" : "bg-yellow-50 border-yellow-200" };
  return { label: `${m}m remaining`, color: "text-red-500", bgColor: "bg-red-50 border-red-200" };
};

const OVERDUE_HOURS = { Urgent: 12, High: 24, Medium: 72, Low: 168 };
const isOverdue = (t) => {
  if (t.status === "Resolved" || t.status === "Closed") return false;
  if (t.dueDate) {
    const due = t.dueDate?.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
    return Date.now() > due.getTime();
  }
  return hoursOld(t.createdAt) > (OVERDUE_HOURS[t.priority] || 72);
};

const statusCls = {
  Open: "bg-blue-100 text-blue-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Resolved: "bg-green-100 text-green-700",
  Closed: "bg-gray-100 text-gray-500",
};
const priCls = {
  Low: "bg-gray-100 text-gray-500",
  Medium: "bg-yellow-100 text-yellow-600",
  High: "bg-orange-100 text-orange-600",
  Urgent: "bg-red-100 text-red-600",
};

const Badge = ({ label, cls }) => (
  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>
);

const INP = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 bg-white";

/* ══════════════════════════════════════════════
   ✅ RESOLVED NOTIFICATION HELPER
══════════════════════════════════════════════ */
const sendResolvedNotification = async ({ ticket, adminName, adminPhoto = "" }) => {
  try {
    const studentUid = ticket.studentUid;
    if (!studentUid) return;
    await addDoc(collection(db, "notifications", studentUid, "items"), {
      type: "ticket_resolved",
      title: "Ticket Resolved ✓",
      message: `Your ticket "${ticket.subject}" has been resolved by ${adminName}.`,
      ticketId: ticket.ticketId,
      ticketDocId: ticket.id,
      senderName: adminName,
      senderPhoto: adminPhoto,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("sendResolvedNotification error:", e);
  }
};

/* ══════════════════════════════════════════════
   LIVE COUNTDOWN TIMER
══════════════════════════════════════════════ */
const LiveCountdown = ({ dueDate }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  if (!dueDate) return null;
  const dueDateMs = dueDate?.toDate ? dueDate.toDate().getTime() : new Date(dueDate).getTime();
  const { label, color, bgColor } = fmtCountdown(dueDateMs);
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${bgColor} ${color}`}>
      <i className="fa-solid fa-hourglass-half" />
      {label}
    </div>
  );
};

/* ══════════════════════════════════════════════
   SLA TIMER
══════════════════════════════════════════════ */
const SlaTimer = ({ ticket }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const hrs = hoursOld(ticket.createdAt);
  const days = daysOld(ticket.createdAt);
  const done = ticket.status === "Resolved" || ticket.status === "Closed";

  if (done) {
    return <span className="text-xs text-green-600 font-medium">Done in {days > 0 ? `${days}d ` : ""}{hrs % 24}h</span>;
  }

  if (ticket.dueDate) {
    const dueDateMs = ticket.dueDate?.toDate ? ticket.dueDate.toDate().getTime() : new Date(ticket.dueDate).getTime();
    const { label, color } = fmtCountdown(dueDateMs);
    return (
      <div className="min-w-[100px]">
        <p className={`text-xs font-semibold mb-1 ${color}`}>{label}</p>
        <p className="text-[10px] text-gray-400">Due: {fmtDateTime(ticket.dueDate)}</p>
      </div>
    );
  }

  const limit = OVERDUE_HOURS[ticket.priority] || 72;
  const pct = Math.min((hrs / limit) * 100, 100);
  const od = isOverdue(ticket);

  return (
    <div className="min-w-[100px]">
      <p className={`text-xs font-semibold mb-1 ${od ? "text-red-500" : "text-gray-600"}`}>
        {days > 0 ? `${days}d ` : ""}{hrs % 24}h elapsed
      </p>
      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${od ? "bg-red-500" : pct > 70 ? "bg-yellow-400" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-0.5">limit: {limit}h</p>
    </div>
  );
};

/* ══════════════════════════════════════════════
   ASSIGN MODAL
══════════════════════════════════════════════ */
const AssignModal = ({ ticket, admins, onClose, onDone, currentAdminName }) => {
  const [selected, setSelected] = useState(ticket.assignedTo || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("17:00");
  const [useDue, setUseDue] = useState(!!ticket.dueDate);

  useEffect(() => {
    if (ticket.dueDate) {
      const d = ticket.dueDate?.toDate ? ticket.dueDate.toDate() : new Date(ticket.dueDate);
      setDueDate(d.toISOString().split("T")[0]);
      setDueTime(d.toTimeString().slice(0, 5));
    } else {
      const hrs = OVERDUE_HOURS[ticket.priority] || 72;
      const def = new Date(Date.now() + hrs * 3600000);
      setDueDate(def.toISOString().split("T")[0]);
      setDueTime(def.toTimeString().slice(0, 5));
    }
  }, [ticket]);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const admin = admins.find(a => a.id === selected);
      const updateData = {
        assignedTo: selected,
        assignedToName: admin?.name || "",
        assignedToEmail: admin?.email || "",
        assignedAt: new Date(),
        status: ticket.status === "Open" ? "Pending" : ticket.status,
        selfAssignRequest: null,
      };
      if (useDue && dueDate) {
        updateData.dueDate = new Date(`${dueDate}T${dueTime}:00`);
        updateData.dueDateSet = true;
      } else {
        updateData.dueDate = null;
        updateData.dueDateSet = false;
      }
      await updateDoc(doc(db, "tickets", ticket.id), updateData);
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "assign",
        text: `Ticket assigned to ${admin?.name || "Unknown"}${useDue && dueDate ? ` · Due: ${new Date(`${dueDate}T${dueTime}`).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}${note ? ` — "${note}"` : ""}`,
        adminName: currentAdminName || "Admin",
        timestamp: serverTimestamp(),
      });
      onDone();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-800">Assign Ticket</p>
            <p className="text-xs text-gray-400">#{ticket.ticketId} · {ticket.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-2">Select Admin</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {admins.length === 0 && <p className="text-xs text-gray-400 py-3 text-center">No admins found.</p>}
              {admins.map(a => (
                <label key={a.id} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition ${selected === a.id ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300"}`}>
                  <input type="radio" name="admin" value={a.id} checked={selected === a.id} onChange={() => setSelected(a.id)} className="accent-blue-600" />
                  <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-xs">{(a.name || "?")[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{a.name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.role} · {a.email}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={useDue} onChange={e => setUseDue(e.target.checked)} className="accent-blue-600" />
              <span className="text-xs font-medium text-gray-700">Set Due Date / Deadline</span>
              <i className="fa-solid fa-calendar-clock text-gray-400 text-xs ml-auto" />
            </label>
            {useDue && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Date</label>
                  <input type="date" value={dueDate} min={new Date().toISOString().split("T")[0]} onChange={e => setDueDate(e.target.value)} className={INP} />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">Time</label>
                  <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)} className={INP} />
                </div>
                {dueDate && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded px-2 py-1">
                      <i className="fa-solid fa-clock mr-1" />
                      Due: {new Date(`${dueDate}T${dueTime}`).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
            <textarea rows="2" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." className={`${INP} resize-none`} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAssign} disabled={!selected || saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
              {saving ? "Assigning..." : "Assign"}
            </button>
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   SELF-ASSIGN REQUEST MODAL
══════════════════════════════════════════════ */
const SelfAssignModal = ({ ticket, currentAdminId, currentAdminName, onClose, onDone }) => {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleRequest = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "tickets", ticket.id), {
        selfAssignRequest: {
          adminId: currentAdminId,
          adminName: currentAdminName,
          reason: reason.trim(),
          requestedAt: new Date(),
          status: "pending",
        },
      });
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "self_assign_request",
        text: `${currentAdminName} requested to self-assign this ticket${reason ? ` — "${reason}"` : ""}. Waiting for Super Admin approval.`,
        adminName: currentAdminName,
        timestamp: serverTimestamp(),
      });
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 1800);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-800">Request Self-Assign</p>
            <p className="text-xs text-gray-400">#{ticket.ticketId} · {ticket.subject}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>
        <div className="p-5 space-y-4">
          {done ? (
            <div className="text-center py-6">
              <i className="fa-solid fa-circle-check text-green-500 text-3xl mb-2 block" />
              <p className="font-semibold text-gray-700">Request Sent!</p>
              <p className="text-xs text-gray-400 mt-1">Waiting for Super Admin approval.</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-600">
                <i className="fa-solid fa-circle-info mr-1" />
                Your request will be sent to the Super Admin for approval before this ticket is assigned to you.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Note (optional)</label>
                <textarea rows="3" value={reason} onChange={e => setReason(e.target.value)} placeholder="Why do you want to handle this ticket?" className={`${INP} resize-none`} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleRequest} disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                  {saving ? "Sending..." : "Send Request"}
                </button>
                <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   APPROVE/DENY SELF-ASSIGN BANNER
══════════════════════════════════════════════ */
const SelfAssignApprovalBanner = ({ ticket, admins, currentAdminName, onDone }) => {
  const [loading, setLoading] = useState(false);
  const req = ticket.selfAssignRequest;
  if (!req || req.status !== "pending") return null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const admin = admins.find(a => a.id === req.adminId);
      await updateDoc(doc(db, "tickets", ticket.id), {
        assignedTo: req.adminId,
        assignedToName: req.adminName,
        assignedToEmail: admin?.email || "",
        assignedAt: new Date(),
        status: ticket.status === "Open" ? "Pending" : ticket.status,
        selfAssignRequest: { ...req, status: "approved" },
      });
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "assign",
        text: `Self-assign request by ${req.adminName} approved by ${currentAdminName || "Super Admin"}.`,
        adminName: currentAdminName || "Super Admin",
        timestamp: serverTimestamp(),
      });
      onDone();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, "tickets", ticket.id), {
        selfAssignRequest: { ...req, status: "denied" },
      });
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "update",
        text: `Self-assign request by ${req.adminName} was denied by ${currentAdminName || "Super Admin"}.`,
        adminName: currentAdminName || "Super Admin",
        timestamp: serverTimestamp(),
      });
      onDone();
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-start gap-2">
        <i className="fa-solid fa-hand-point-right text-amber-500 text-sm mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-amber-700">Self-Assign Request</p>
          <p className="text-xs text-amber-600 mt-0.5">
            <strong>{req.adminName}</strong> wants to handle this ticket.
            {req.reason && <> Reason: "{req.reason}"</>}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleApprove} disabled={loading} className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
          {loading ? "..." : "✓ Approve"}
        </button>
        <button onClick={handleDeny} disabled={loading} className="flex-1 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition">
          {loading ? "..." : "✕ Deny"}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   STATUS ACTION BUTTONS
══════════════════════════════════════════════ */
const StatusActions = ({ ticket, currentAdminId, isSuperAdmin, currentAdminName, onRefresh }) => {
  const [saving, setSaving] = useState(false);
  const isAssigned = ticket.assignedTo === currentAdminId;
  if (!isAssigned && !isSuperAdmin) return null;

  const changeStatus = async (newStatus) => {
    if (saving) return;
    setSaving(true);
    try {
      const updates = { status: newStatus, updatedAt: new Date() };
      if (newStatus === "Resolved") updates.resolvedAt = new Date();
      await updateDoc(doc(db, "tickets", ticket.id), updates);
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "status",
        text: `Status changed to ${newStatus}`,
        adminName: currentAdminName || "Admin",
        timestamp: serverTimestamp(),
      });
      if (newStatus === "Resolved") {
        await sendResolvedNotification({ ticket, adminName: currentAdminName || "Admin" });
      }
      onRefresh();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const s = ticket.status;
  return (
    <div className="border-t border-gray-100 pt-3 space-y-2">
      <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
        <i className="fa-solid fa-bolt text-yellow-500" /> Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        {s === "Open" && (
          <button onClick={() => changeStatus("Pending")} disabled={saving}
            className="flex-1 py-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 text-xs font-semibold rounded-lg transition disabled:opacity-50">
            <i className="fa-solid fa-clock mr-1" /> Mark Pending
          </button>
        )}
        {(s === "Open" || s === "Pending") && (
          <button onClick={() => changeStatus("Resolved")} disabled={saving}
            className="flex-1 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-semibold rounded-lg transition disabled:opacity-50">
            <i className="fa-solid fa-circle-check mr-1" /> Resolve
          </button>
        )}
        {s === "Resolved" && (
          <button onClick={() => changeStatus("Closed")} disabled={saving}
            className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition disabled:opacity-50">
            <i className="fa-solid fa-box-archive mr-1" /> Close Ticket
          </button>
        )}
        {(s === "Pending" || s === "Resolved") && (
          <button onClick={() => changeStatus("Open")} disabled={saving}
            className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg transition disabled:opacity-50">
            <i className="fa-solid fa-rotate-left mr-1" /> Reopen
          </button>
        )}
      </div>
      {saving && <p className="text-xs text-center text-gray-400">Updating...</p>}
    </div>
  );
};

/* ══════════════════════════════════════════════
   TICKET DETAIL MODAL
══════════════════════════════════════════════ */
const TicketDetailModal = ({ ticket: initialTicket, admins, isSuperAdmin, currentAdminId, currentAdminName, onClose, onRefresh }) => {
  const [ticket, setTicket] = useState(initialTicket);
  const [reply, setReply] = useState(initialTicket.adminReply || "");
  const [activity, setActivity] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [imgPrev, setImgPrev] = useState(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [status, setStatus] = useState(initialTicket.status);
  const [priority, setPriority] = useState(initialTicket.priority);
  const actBottomRef = useRef(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "tickets", ticket.id), (snap) => {
      if (snap.exists()) setTicket({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [ticket.id]);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "tickets", ticket.id, "activity"),
      (snap) => {
        setActivity(
          snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0))
        );
      }
    );
    return unsub;
  }, [ticket.id]);

  useEffect(() => { actBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activity]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgPrev(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if (!newMsg.trim() && !imgPrev) return;
    setPosting(true);
    try {
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "update",
        text: newMsg.trim(),
        imageUrl: imgPrev || null,
        adminName: currentAdminName || (isSuperAdmin ? "Super Admin" : "Admin"),
        timestamp: serverTimestamp(),
      });
      setNewMsg(""); setImgPrev(null);
    } catch (e) { console.error(e); }
    setPosting(false);
  };

  const handleSuperSave = async () => {
    setSaving(true);
    try {
      const wasResolved = initialTicket.status !== "Resolved" && status === "Resolved";
      await updateDoc(doc(db, "tickets", ticket.id), {
        status, priority, adminReply: reply, updatedAt: new Date(),
        ...(status === "Resolved" ? { resolvedAt: new Date() } : {}),
      });
      await addDoc(collection(db, "tickets", ticket.id, "activity"), {
        type: "status",
        text: `Status → ${status} · Priority → ${priority}${reply ? ` · Reply: "${reply}"` : ""}`,
        adminName: currentAdminName || "Super Admin",
        timestamp: serverTimestamp(),
      });
      if (wasResolved) {
        await sendResolvedNotification({
          ticket: { ...ticket, adminReply: reply },
          adminName: currentAdminName || "Super Admin",
        });
      }
      onRefresh();
      onClose();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const isAssigned = ticket.assignedTo === currentAdminId;
  const hasDueDate = !!ticket.dueDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0 flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-gray-800">#{ticket.ticketId}</span>
            <Badge label={ticket.status} cls={statusCls[ticket.status] || ""} />
            <Badge label={ticket.priority} cls={priCls[ticket.priority] || ""} />
            {isOverdue(ticket) && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-600">OVERDUE</span>}
          </div>
          <div className="flex items-center gap-2">
            {hasDueDate && <LiveCountdown dueDate={ticket.dueDate} />}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">×</button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[42%] border-r border-gray-100 overflow-y-auto p-4 space-y-3 shrink-0">
            <div>
              <p className="font-semibold text-gray-800">{ticket.subject}</p>
              <p className="text-xs text-gray-400 mt-1">{ticket.category} · {fmtDate(ticket.createdAt)}</p>
            </div>

            {hasDueDate && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-medium text-amber-600 mb-1 flex items-center gap-1">
                  <i className="fa-solid fa-calendar-clock" /> Deadline
                </p>
                <p className="text-sm font-semibold text-amber-700">{fmtDateTime(ticket.dueDate)}</p>
                <LiveCountdown dueDate={ticket.dueDate} />
              </div>
            )}

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-medium text-blue-600 mb-1.5">SLA Timer</p>
              <SlaTimer ticket={ticket} />
            </div>

            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>

            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg space-y-1.5">
              <p className="text-xs font-medium text-gray-500">Student Info</p>
              {[["Name", ticket.studentName], ["Email", ticket.studentEmail], ["Year", ticket.yearLevel], ["Section", ticket.section]].map(([l, v]) => (
                <div key={l} className="flex justify-between text-xs">
                  <span className="text-gray-400">{l}</span>
                  <span className="font-medium text-gray-700">{v || "—"}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Assigned To</p>
              {ticket.assignedToName ? (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-white font-bold text-[10px]">{ticket.assignedToName[0]}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{ticket.assignedToName}</p>
                    <p className="text-xs text-gray-400">{ticket.assignedToEmail}</p>
                  </div>
                  {isAssigned && <span className="ml-auto text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">YOU</span>}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Not yet assigned</p>
              )}
            </div>

            {isSuperAdmin && ticket.selfAssignRequest?.status === "pending" && (
              <SelfAssignApprovalBanner ticket={ticket} admins={admins} currentAdminName={currentAdminName} onDone={() => { }} />
            )}

            {(isAssigned || isSuperAdmin) && ticket.status !== "Closed" && (
              <StatusActions
                ticket={ticket}
                currentAdminId={currentAdminId}
                isSuperAdmin={isSuperAdmin}
                currentAdminName={currentAdminName}
                onRefresh={() => { }}
              />
            )}

            {isSuperAdmin && (
              <div className="space-y-3 border-t border-gray-100 pt-3">
                <p className="text-xs font-medium text-gray-500">Admin Controls</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className={INP}>
                      <option>Open</option><option>Pending</option><option>Resolved</option><option>Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Priority</label>
                    <select value={priority} onChange={e => setPriority(e.target.value)} className={INP}>
                      <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Reply to Student</label>
                  <textarea rows="3" value={reply} onChange={e => setReply(e.target.value)} placeholder="Message visible to student..." className={`${INP} resize-none`} />
                </div>
                <button onClick={handleSuperSave} disabled={saving} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 shrink-0">
              <p className="text-sm font-semibold text-gray-700">
                Activity Feed
                <span className="ml-2 text-xs font-normal text-gray-400">{activity.length} updates</span>
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-2.5">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  <i className="fa-solid fa-ticket text-blue-500 text-[9px]" />
                </div>
                <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  <p className="text-xs font-semibold text-blue-600">Ticket Created</p>
                  <p className="text-xs text-gray-600 mt-0.5">{ticket.subject}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{fmtDate(ticket.createdAt)} · {ticket.studentName}</p>
                </div>
              </div>
              {activity.map(a => (
                <div key={a.id} className="flex gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${a.type === "assign" ? "bg-purple-100"
                    : a.type === "self_assign_request" ? "bg-amber-100"
                      : a.type === "status" ? "bg-yellow-100"
                        : "bg-gray-100"
                    }`}>
                    <i className={`fa-solid text-[9px] ${a.type === "assign" ? "fa-user-check text-purple-500"
                      : a.type === "self_assign_request" ? "fa-hand-point-right text-amber-500"
                        : a.type === "status" ? "fa-arrows-rotate text-yellow-600"
                          : "fa-comment text-gray-500"
                      }`} />
                  </div>
                  <div className="flex-1 bg-white border border-gray-100 rounded-lg p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{a.adminName || "Admin"}</span>
                      <span className="text-[10px] text-gray-400">{fmtDateTime(a.timestamp)}</span>
                    </div>
                    {a.text && <p className="text-xs text-gray-600 leading-relaxed">{a.text}</p>}
                    {a.imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-100">
                        <img src={a.imageUrl} alt="attachment" className="w-full max-h-40 object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {activity.length === 0 && <p className="text-center text-xs text-gray-400 py-6">No activity yet.</p>}
              <div ref={actBottomRef} />
            </div>
            <div className="p-3 border-t border-gray-100 bg-white shrink-0 space-y-2">
              {imgPrev && (
                <div className="relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={imgPrev} alt="preview" className="w-full h-full object-cover" />
                  <button onClick={() => setImgPrev(null)} className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[8px] flex items-center justify-center">×</button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea rows="2" value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Post an update or note..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 resize-none" />
                <div className="flex flex-col gap-1">
                  <label className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center cursor-pointer transition border border-gray-200">
                    <i className="fa-solid fa-image text-gray-400 text-xs" />
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                  <button onClick={handlePost} disabled={posting || (!newMsg.trim() && !imgPrev)}
                    className="w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg flex items-center justify-center transition">
                    {posting ? <i className="fa-solid fa-spinner fa-spin text-white text-[10px]" /> : <i className="fa-solid fa-paper-plane text-white text-[10px]" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN — AdminTickets
══════════════════════════════════════════════ */
const AdminTickets = ({ currentAdminId, isSuperAdmin, categories = [] }) => {
  const [tickets, setTickets] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [viewTicket, setViewTicket] = useState(null);
  const [assignTicket, setAssignTicket] = useState(null);
  const [selfAssignTkt, setSelfAssignTkt] = useState(null);
  const [currentAdminName, setCurrentAdminName] = useState("");
  const [page, setPage] = useState(1);
  const PER_PAGE = 5;

  useEffect(() => {
    if (currentAdminId === "hardcoded_admin") { setCurrentAdminName("Super Admin"); return; }
    if (!currentAdminId) return;
    getDoc(doc(db, "admins", currentAdminId))
      .then(s => { if (s.exists()) setCurrentAdminName(s.data().name || "Admin"); })
      .catch(console.error);
  }, [currentAdminId]);

  useEffect(() => {
    if (isSuperAdmin) {
      const unsub = onSnapshot(collection(db, "tickets"), (snap) => {
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
        setLoading(false);
      });
      return unsub;
    } else {
      let assignedTickets = [], openUnassigned = [], loaded1 = false, loaded2 = false;
      const merge = () => {
        if (!loaded1 || !loaded2) return;
        const map = {};
        [...assignedTickets, ...openUnassigned].forEach(t => { map[t.id] = t; });
        setTickets(Object.values(map).sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
        setLoading(false);
      };
      const q1 = query(collection(db, "tickets"), where("assignedTo", "==", currentAdminId));
      const unsub1 = onSnapshot(q1, (snap) => { assignedTickets = snap.docs.map(d => ({ id: d.id, ...d.data() })); loaded1 = true; merge(); });
      let open1 = [], open2 = [], openLoaded1 = false, openLoaded2 = false;
      const mergeOpen = () => {
        if (!openLoaded1 || !openLoaded2) return;
        const map = {};
        [...open1, ...open2].forEach(t => { map[t.id] = t; });
        openUnassigned = Object.values(map);
        loaded2 = true;
        merge();
      };
      const q2 = query(collection(db, "tickets"), where("status", "==", "Open"), where("assignedTo", "==", null));
      const q2b = query(collection(db, "tickets"), where("status", "==", "Open"), where("assignedTo", "==", ""));
      const unsub2 = onSnapshot(q2, (snap) => { open1 = snap.docs.map(d => ({ id: d.id, ...d.data() })); openLoaded1 = true; mergeOpen(); });
      const unsub2b = onSnapshot(q2b, (snap) => { open2 = snap.docs.map(d => ({ id: d.id, ...d.data() })); openLoaded2 = true; mergeOpen(); });
      return () => { unsub1(); unsub2(); unsub2b(); };
    }
  }, [isSuperAdmin, currentAdminId]);

  useEffect(() => {
    getDocs(collection(db, "admins")).then(s => setAdmins(s.docs.map(d => ({ id: d.id, ...d.data() })))).catch(console.error);
  }, []);

  const myTickets = isSuperAdmin ? tickets : tickets.filter(t => t.assignedTo === currentAdminId);
  const filtered = tickets
    .filter(t => filter === "All" || t.status === filter)
    .filter(t => !search || [t.subject, t.studentName, t.ticketId, t.studentEmail].some(v => v?.toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const overdueCount = myTickets.filter(isOverdue).length;
  const unassignedCnt = tickets.filter(t => !t.assignedTo).length;
  const selfAssignReqs = tickets.filter(t => t.selfAssignRequest?.status === "pending").length;

  return (
    <div>
      {viewTicket && (
        <TicketDetailModal
          ticket={viewTicket} admins={admins} isSuperAdmin={isSuperAdmin}
          currentAdminId={currentAdminId} currentAdminName={currentAdminName}
          onClose={() => setViewTicket(null)} onRefresh={() => setViewTicket(null)}
        />
      )}
      {assignTicket && (
        <AssignModal ticket={assignTicket} admins={admins} currentAdminName={currentAdminName} onClose={() => setAssignTicket(null)} onDone={() => setAssignTicket(null)} />
      )}
      {selfAssignTkt && (
        <SelfAssignModal ticket={selfAssignTkt} currentAdminId={currentAdminId} currentAdminName={currentAdminName} onClose={() => setSelfAssignTkt(null)} onDone={() => setSelfAssignTkt(null)} />
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-gray-800">{isSuperAdmin ? "All Tickets" : "My Tickets"}</h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{myTickets.length} assigned to me</span>
          {overdueCount > 0 && <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-medium">{overdueCount} overdue</span>}
          {unassignedCnt > 0 && <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">{unassignedCnt} open unassigned</span>}
          {isSuperAdmin && selfAssignReqs > 0 && (
            <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <i className="fa-solid fa-hand-point-right text-[10px]" /> {selfAssignReqs} self-assign request{selfAssignReqs > 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Open", val: myTickets.filter(t => t.status === "Open").length, color: "blue" },
          { label: "Pending", val: myTickets.filter(t => t.status === "Pending").length, color: "yellow" },
          { label: "Resolved", val: myTickets.filter(t => t.status === "Resolved").length, color: "green" },
          { label: "Overdue", val: overdueCount, color: "red" },
        ].map(s => (
          <div key={s.label} onClick={() => s.label !== "Overdue" && setFilter(s.label)}
            className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm transition ${filter === s.label ? "border-blue-400" : "border-gray-200"}`}>
            <p className={`text-2xl font-bold text-${s.color}-600`}>{s.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {["All", "Open", "Pending", "Resolved", "Closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filter === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"}`}>
            {f} ({f === "All" ? tickets.length : tickets.filter(t => t.status === f).length})
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ticket, student, subject..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-full sm:w-72" />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin text-blue-400 text-2xl block mb-2" />
            <p className="text-gray-400 text-sm">Loading tickets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No tickets found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Ticket", "Student", "Category", "Priority", "Status", "SLA / Due", "Assigned To", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(t => {
                    const isMyTicket = t.assignedTo === currentAdminId;
                    const hasPendingRequest = t.selfAssignRequest?.status === "pending";
                    const myRequest = hasPendingRequest && t.selfAssignRequest?.adminId === currentAdminId;
                    return (
                      <tr key={t.id} className={`hover:bg-gray-50 transition ${isOverdue(t) ? "bg-red-50/50" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-mono text-blue-600 text-xs font-semibold">#{t.ticketId}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[120px]">{t.subject}</p>
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {isOverdue(t) && <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">OVERDUE</span>}
                            {!t.assignedTo && isSuperAdmin && <span className="text-[9px] font-bold text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">UNASSIGNED</span>}
                            {hasPendingRequest && isSuperAdmin && <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">REQUEST ⚑</span>}
                            {isMyTicket && <span className="text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">MINE</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-800">{t.studentName}</p>
                          <p className="text-[10px] text-gray-400">{t.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{t.category}</td>
                        <td className="px-4 py-3"><Badge label={t.priority} cls={priCls[t.priority] || ""} /></td>
                        <td className="px-4 py-3"><Badge label={t.status} cls={statusCls[t.status] || ""} /></td>
                        <td className="px-4 py-3">
                          {t.dueDate ? (
                            <div>
                              <p className="text-[10px] text-gray-400 mb-0.5">Due: {fmtDateTime(t.dueDate)}</p>
                              <LiveCountdown dueDate={t.dueDate} />
                            </div>
                          ) : (
                            <SlaTimer ticket={t} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.assignedToName ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                                <span className="text-white font-bold text-[8px]">{t.assignedToName[0]}</span>
                              </div>
                              <span className="text-xs text-gray-700 truncate max-w-[80px]">{t.assignedToName}</span>
                            </div>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button onClick={() => setViewTicket(t)} className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium rounded-lg transition border border-blue-200">View</button>
                            {isSuperAdmin && (
                              <button onClick={() => setAssignTicket(t)} className="px-2.5 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium rounded-lg transition border border-gray-200">Assign</button>
                            )}
                            {!isSuperAdmin && !t.assignedTo && !myRequest && (
                              <button onClick={() => setSelfAssignTkt(t)} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition border border-amber-200">
                                <i className="fa-solid fa-hand-point-right mr-1 text-[10px]" />Assign to Me
                              </button>
                            )}
                            {!isSuperAdmin && myRequest && (
                              <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-600 text-[10px] font-medium rounded-lg">Pending Approval…</span>
                            )}
                            {(isMyTicket || isSuperAdmin) && t.status !== "Closed" && t.status !== "Resolved" && (
                              <button
                                onClick={async () => {
                                  const newStatus = t.status === "Open" ? "Pending" : "Resolved";
                                  try {
                                    await updateDoc(doc(db, "tickets", t.id), {
                                      status: newStatus,
                                      updatedAt: new Date(),
                                      ...(newStatus === "Resolved" ? { resolvedAt: new Date() } : {}),
                                    });
                                    await addDoc(collection(db, "tickets", t.id, "activity"), {
                                      type: "status",
                                      text: `Status changed to ${newStatus}`,
                                      adminName: currentAdminName || "Admin",
                                      timestamp: serverTimestamp(),
                                    });
                                    if (newStatus === "Resolved") {
                                      await sendResolvedNotification({ ticket: t, adminName: currentAdminName || "Admin" });
                                    }
                                  } catch (e) { console.error(e); }
                                }}
                                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition border ${t.status === "Open"
                                  ? "bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200"
                                  : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                                  }`}
                              >
                                {t.status === "Open" ? "→ Pending" : "→ Resolve"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-semibold">
                  Showing {((page - 1) * PER_PAGE) + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${n === page ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition"
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminTickets;