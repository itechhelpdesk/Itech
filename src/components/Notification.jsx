// NotificationSystem.jsx
// Exports: NotificationBell, createTicketNotifications

import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, query, where,
  onSnapshot, updateDoc, doc,
  getDocs, serverTimestamp,
} from "firebase/firestore";
import { db } from "../Back_end/Firebase";

/* ─────────────────────────────────────────────────────────────
   createTicketNotifications
───────────────────────────────────────────────────────────── */
export const createTicketNotifications = async ({
  studentUid,
  studentName  = "Student",
  studentPhoto = "",
  ticketId,
  ticketDocId,
  subject,
  category,
}) => {
  const col = collection(db, "notifications");

  // 1 ─ Confirm to the student (unchanged)
  await addDoc(col, {
    recipientId:  studentUid,
    role:         "student",
    type:         "ticket_created",
    senderName:   studentName,
    senderPhoto:  studentPhoto,
    message:      `Your ticket #${ticketId} has been received and is now in queue.`,
    ticketDocId,
    ticketId,
    read:         false,
    createdAt:    serverTimestamp(),
  });

  // 2 ─ Always notify hardcoded_admin directly (no Firestore read needed)
  const notifData = {
    role:        "admin",
    type:        "new_ticket",
    senderName:  studentName,
    senderPhoto: studentPhoto,
    message:     `submitted a new ticket: "${subject}" · ${category}`,
    ticketDocId,
    ticketId,
    read:        false,
    createdAt:   serverTimestamp(),
  };

  // Always send to hardcoded_admin regardless
  await addDoc(col, { ...notifData, recipientId: "hardcoded_admin" });

  // 3 ─ Also try real Firebase admins (best effort)
  try {
    const adminSnap = await getDocs(collection(db, "admins"));
    const adminIds  = adminSnap.docs
      .map(d => d.id)
      .filter(id => id !== "hardcoded_admin"); // avoid duplicate

    if (adminIds.length > 0) {
      await Promise.all(
        adminIds.map(adminId =>
          addDoc(col, { ...notifData, recipientId: adminId })
        )
      );
    }
  } catch (err) {
    console.warn("Real admin notification failed (expected if no admins collection):", err);
  }
};

/* ─────────────────────────────────────────────────────────────
   AvatarWithBadge — Facebook-style avatar + action badge
───────────────────────────────────────────────────────────── */
const BADGE_STYLES = {
  ticket_created:  { icon: "fa-circle-check", bg: "#22c55e" },
  new_ticket:      { icon: "fa-ticket",        bg: "#3b82f6" },
  ticket_updated:  { icon: "fa-pen-to-square", bg: "#f59e0b" },
  ticket_resolved: { icon: "fa-circle-check",  bg: "#22c55e" },
  ticket_replied:  { icon: "fa-comment-dots",  bg: "#a855f7" },
};
const FALLBACK_BADGE = { icon: "fa-bell", bg: "#6b7280" };

const AvatarWithBadge = ({ name = "", photo = "", type }) => {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map(w => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const badge = BADGE_STYLES[type] ?? FALLBACK_BADGE;
  const showPhoto = photo && !imgError;

  return (
    <div className="relative shrink-0" style={{ width: 46, height: 46 }}>
      {/* Avatar circle */}
      <div
        className="w-full h-full rounded-full overflow-hidden flex items-center justify-center border-2 border-white"
        style={{
          background: showPhoto
            ? "transparent"
            : "linear-gradient(135deg, #1B3A6B, #DA1A32)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }}
      >
        {showPhoto ? (
          <img
            src={photo}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-white text-sm font-extrabold leading-none">
            {initials}
          </span>
        )}
      </div>

      {/* Action badge — bottom-right, like Facebook */}
      <div
        className="absolute flex items-center justify-center border-2 border-white rounded-full"
        style={{
          width: 20, height: 20,
          bottom: -2, right: -2,
          background: badge.bg,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      >
        <i className={`fa-solid ${badge.icon} text-white`} style={{ fontSize: 8 }} />
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   NotificationBell
   Props:
     recipientId  – UID of the logged-in user
     role         – "student" | "admin"
     accentColor  – dropdown accent color
     onViewTicket – callback(ticketDocId) on click
     userName     – ✅ FALLBACK name for old notifications missing senderName
     userPhoto    – ✅ FALLBACK photo for old notifications missing senderPhoto
───────────────────────────────────────────────────────────── */
export const NotificationBell = ({
  recipientId,
  role        = "student",
  accentColor = "#1B3A6B",
  onViewTicket,
  userName    = "",    // ✅ used as fallback
  userPhoto   = "",    // ✅ used as fallback
}) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen]                   = useState(false);
  const [tab, setTab]                     = useState("all");
  const dropRef                           = useRef(null);

  /* ── Real-time Firestore listener ── */
  useEffect(() => {
    if (!recipientId) return;
    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", recipientId),
      where("role",        "==", role)
    );
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) =>
        (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
      setNotifications(data);
    });
    return () => unsub();
  }, [recipientId, role]);

  /* ── Close on outside click ── */
  useEffect(() => {
    const fn = e => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const unread    = notifications.filter(n => !n.read);
  const displayed = tab === "unread" ? unread : notifications;

  const markAllRead = () =>
    Promise.all(
      unread.map(n => updateDoc(doc(db, "notifications", n.id), { read: true }))
    );

  const handleNotifClick = async notif => {
    if (!notif.read)
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
    if (notif.ticketDocId && onViewTicket) {
      onViewTicket(notif.ticketDocId);
      setOpen(false);
    }
  };

  const relTime = ts => {
    if (!ts) return "";
    const d    = ts?.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d) / 1000);
    if (diff < 60)     return "just now";
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="relative" ref={dropRef}>

      {/* ── Bell trigger ── */}
      <button
        onClick={() => setOpen(p => !p)}
        className="au-icon-btn relative p-2.5 rounded-xl transition"
        title="Notifications"
      >
        <i className={`fa-solid fa-bell text-base ${open ? "text-yellow-300" : ""}`} />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 min-w-[17px] h-[17px] bg-red-500 text-white
                           text-[10px] font-extrabold rounded-full flex items-center justify-center
                           px-0.5 leading-none pointer-events-none">
            {unread.length > 9 ? "9+" : unread.length}
          </span>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute right-0 bg-white rounded-2xl overflow-hidden"
          style={{
            top: "calc(100% + 10px)",
            width: 360,
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.07)",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-900 font-extrabold text-lg">Notifications</p>
              <div className="flex items-center gap-2">
                {unread.length > 0 && (
                  <button
                    onClick={e => { e.stopPropagation(); markAllRead(); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg"
                    style={{ color: accentColor, background: `${accentColor}18` }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                >
                  <i className="fa-solid fa-xmark text-gray-500 text-xs" />
                </button>
              </div>
            </div>

            {/* All / Unread tabs */}
            <div className="flex gap-1 border-b border-gray-100">
              {[{ key: "all", label: "All" }, { key: "unread", label: "Unread" }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`relative px-4 py-2 text-sm font-bold rounded-t-lg transition
                    ${tab === t.key ? "text-gray-900" : "text-gray-400 hover:text-gray-600"}`}
                >
                  {t.label}
                  {t.key === "unread" && unread.length > 0 && (
                    <span
                      className="ml-1.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: accentColor }}
                    >
                      {unread.length}
                    </span>
                  )}
                  {tab === t.key && (
                    <div
                      className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full"
                      style={{ background: accentColor }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {displayed.length === 0 ? (
              <div className="text-center py-14 px-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${accentColor}12` }}
                >
                  <i className="fa-solid fa-bell-slash text-2xl" style={{ color: accentColor }} />
                </div>
                <p className="text-gray-700 font-bold text-sm">
                  {tab === "unread" ? "You're all caught up!" : "No notifications yet"}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {tab === "unread"
                    ? "All notifications have been read."
                    : "We'll notify you when something happens."}
                </p>
              </div>
            ) : (
              <>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Earlier
                  </p>
                </div>

                {displayed.map(notif => {
                  // ✅ KEY FIX: use senderName/senderPhoto from Firestore doc,
                  //    but FALL BACK to the logged-in user's userName/userPhoto
                  //    for old notifications that were saved without those fields.
                  const displayName  = notif.senderName  || userName  || "ORCA";
                  const displayPhoto = notif.senderPhoto || userPhoto || "";

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`relative flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
                        ${!notif.read ? "bg-blue-50/70 hover:bg-blue-50" : "hover:bg-gray-50"}`}
                    >
                      {/* ✅ Student's actual photo + action badge */}
                      <AvatarWithBadge
                        name={displayName}
                        photo={displayPhoto}
                        type={notif.type}
                      />

                      <div className="flex-1 min-w-0 pr-5">
                        <p className={`text-sm leading-snug text-gray-900
                          ${!notif.read ? "font-semibold" : "font-normal"}`}>
                          {/* ✅ Bold student name, then message */}
                          <span className="font-extrabold">{displayName}</span>
                          {" "}{notif.message}
                        </p>
                        <p
                          className="text-xs mt-1 font-semibold"
                          style={{ color: !notif.read ? accentColor : "#9ca3af" }}
                        >
                          {relTime(notif.createdAt)}
                        </p>
                      </div>

                      {/* Unread dot — far right */}
                      {!notif.read && (
                        <div
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
                          style={{ background: accentColor }}
                        />
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 text-center">
              <p className="text-xs text-gray-400 font-semibold">
                {notifications.length} notification{notifications.length !== 1 ? "s" : ""} total
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};