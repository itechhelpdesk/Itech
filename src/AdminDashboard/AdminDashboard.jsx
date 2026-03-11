// AdminDashboard.jsx — Complete Admin Panel
// Arellano University Color Palette Applied
// PANTONE 485C #DA291C · PANTONE 7687C #1B3A6B · PANTONE 114C #F5D000

import { useState, useEffect, useRef } from "react";
import {
  signOut, onAuthStateChanged, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
} from "firebase/auth";
import {
  doc, getDoc, updateDoc,
  collection, addDoc, getDocs,setDoc,
  onSnapshot, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { auth, db, firebaseApiKey } from "../Back_end/Firebase";

import { NotificationBell } from "../components/Notification"
import AdminTickets from "./AdminTickets";
import AdminMaintenance from "./AdminMaintenance"; // ✅ NEW
import AdminPalette, { loadAndApplyTheme } from "./AdminPallete"; // ✅ PALETTE

/* ─── Font Awesome ─── */
const FAStyle = () => (
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" />
);

/* ─── AU Color Palette (Official Arellano University) ─── */
const AUAdminStyle = () => (
  <style>{`
    :root {
      --au-red:        #DA291C;
      --au-red-dark:   #B5221700;
      --au-navy:       #1B3A6B;
      --au-navy-dark:  #122850;
      --au-yellow:     #F5D000;
      --au-gold:       #F0C040;
      --au-brown:      #8B4A00;
      --au-orange:     #C96A00;
      --au-green:      #3A7D1E;
      --au-dark-green: #1A5E2A;
      --au-black:      #1A1A1A;
    }

    /* ── Header ── */
    .au-admin-header {
      background: var(--au-navy) !important;
      border-bottom: 3px solid var(--au-gold) !important;
    }
    .au-admin-header .au-logo-text { color: var(--au-yellow) !important; }
    .au-admin-header .au-logo-box  { background: var(--au-red) !important; }
    .au-admin-header .au-topbar    { background: linear-gradient(90deg, var(--au-red), var(--au-gold), var(--au-red)); height: 3px; }
    .au-admin-header .au-icon-btn  { color: rgba(255,255,255,0.6) !important; }
    .au-admin-header .au-icon-btn:hover { background: rgba(255,255,255,0.1) !important; color: var(--au-yellow) !important; }
    .au-admin-header .au-user-name { color: #fff !important; }
    .au-admin-header .au-user-sub  { color: rgba(255,255,255,0.5) !important; }
    .au-admin-header .au-badge-super { background: rgba(245,208,0,0.15) !important; color: var(--au-yellow) !important; border-color: rgba(245,208,0,0.3) !important; }
    .au-admin-header .au-badge-overdue { background: rgba(218,41,28,0.2) !important; color: #ff9999 !important; border-color: rgba(218,41,28,0.3) !important; }
    .au-admin-header .au-badge-count { background: rgba(255,255,255,0.12) !important; color: rgba(255,255,255,0.7) !important; }
    .au-admin-header .au-divider { background: rgba(255,255,255,0.15) !important; }
    .au-admin-header .au-hamburger { color: var(--au-yellow) !important; }

    /* ── Sidebar ── */
    .au-admin-sidebar {
      background: var(--au-navy-dark) !important;
      border-right: 1px solid rgba(255,255,255,0.07) !important;
    }
    .au-admin-sidebar .au-user-card { background: rgba(255,255,255,0.06) !important; border-radius: 16px; }
    .au-admin-sidebar .au-user-name { color: #fff !important; }
    .au-admin-sidebar .au-user-role { color: var(--au-yellow) !important; font-size: 0.7rem; }
    .au-admin-sidebar .au-section-label { color: rgba(255,255,255,0.25) !important; }
    .au-admin-sidebar .au-nav-active {
      background: var(--au-red) !important;
      color: #fff !important;
      box-shadow: 0 4px 14px rgba(218,41,28,0.4) !important;
    }
    .au-admin-sidebar .au-nav-inactive { color: rgba(255,255,255,0.55) !important; }
    .au-admin-sidebar .au-nav-inactive:hover {
      background: rgba(255,255,255,0.07) !important;
      color: var(--au-yellow) !important;
    }
    .au-admin-sidebar .au-help-card {
      background: linear-gradient(135deg, var(--au-red), #8B1A12) !important;
    }
    .au-admin-sidebar .au-border-top    { border-top-color: rgba(255,255,255,0.07) !important; }
    .au-admin-sidebar .au-border-bottom { border-bottom-color: rgba(255,255,255,0.07) !important; }

    /* ── Main bg ── */
    .au-admin-main { background: #f0f2f5 !important; }

    /* ── Hero banner ── */
    .au-admin-hero {
      background: linear-gradient(135deg, var(--au-navy-dark) 0%, var(--au-navy) 50%, #1e4d8c 100%) !important;
    }
    .au-admin-hero .au-topbar-line {
      background: linear-gradient(90deg, var(--au-red), var(--au-gold), var(--au-red));
    }
    .au-admin-hero .au-hero-btn-solid {
      background: var(--au-yellow) !important;
      color: var(--au-navy-dark) !important;
    }
    .au-admin-hero .au-hero-btn-red {
      background: rgba(218,41,28,0.7) !important;
      color: #fff !important;
    }

    /* ── Buttons ── */
    .au-btn-primary {
      background: var(--au-red) !important;
      color: #fff !important;
      box-shadow: 0 4px 14px rgba(218,41,28,0.3) !important;
    }
    .au-btn-primary:hover { background: #b5221700 !important; filter: brightness(0.9); }
    .au-btn-navy {
      background: var(--au-navy) !important;
      color: #fff !important;
    }
    .au-btn-navy:hover { background: var(--au-navy-dark) !important; }

    /* ── Stat cards ── */
    .au-stat-navy   { background: rgba(27,58,107,0.08) !important; color: var(--au-navy) !important; }
    .au-stat-red    { background: rgba(218,41,28,0.08) !important; color: var(--au-red) !important; }
    .au-stat-gold   { background: rgba(240,192,48,0.15) !important; color: var(--au-brown) !important; }
    .au-stat-green  { background: rgba(58,125,30,0.10) !important; color: var(--au-green) !important; }
    .au-stat-orange { background: rgba(201,106,0,0.12) !important; color: var(--au-orange) !important; }
    .au-stat-brown  { background: rgba(139,74,0,0.10) !important; color: var(--au-brown) !important; }

    /* ── Progress bar ── */
    .au-bar { background: linear-gradient(90deg, var(--au-red), var(--au-navy)) !important; }

    /* ── Tabs ── */
    .au-tab-active { background: var(--au-red) !important; color: #fff !important; }
    .au-filter-active { background: var(--au-navy) !important; color: #fff !important; }

    /* ── Input focus ── */
    .au-inp:focus {
      border-color: var(--au-navy) !important;
      box-shadow: 0 0 0 2px rgba(27,58,107,0.12) !important;
    }

    /* ── Table accents ── */
    .au-ticket-id { color: var(--au-navy) !important; }
    .au-section-icon { color: var(--au-red) !important; }

    /* ── Avatar gradient ── */
    .au-avatar-grad { background: linear-gradient(135deg, var(--au-navy), var(--au-red)) !important; }

    /* ── Modal header ── */
    .au-modal-header {
      background: linear-gradient(135deg, var(--au-navy-dark), var(--au-navy)) !important;
    }

    /* ── Overlay ── */
    .au-overlay { background: rgba(18,40,80,0.6) !important; }

    /* ── Success ── */
    .au-success-icon { color: var(--au-green) !important; }

    /* ── Breadcrumb ── */
    .au-breadcrumb-active { color: var(--au-navy) !important; }

    /* ── Camera btn ── */
    .au-camera-btn { background: var(--au-red) !important; }
    .au-camera-btn:hover { background: #b52217 !important; }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(27,58,107,0.2); border-radius: 99px; }
  `}</style>
);

/* ─── Helpers ─── */
const fmtDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtDateTime = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const hoursOld = (ts) => {
  if (!ts) return 0;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Math.floor((Date.now() - d.getTime()) / 3600000);
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
const compressImage = (file, maxW = 300, maxH = 300, quality = 0.8) =>
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
      while (data.length > 600_000 && q > 0.2) { q -= 0.1; data = canvas.toDataURL("image/jpeg", q); }
      resolve(data);
    };
    img.onerror = reject; img.src = url;
  });

const statusCls  = { Open: "bg-blue-100 text-blue-700", Pending: "bg-yellow-100 text-yellow-700", Resolved: "bg-green-100 text-green-700", Closed: "bg-gray-100 text-gray-500" };
const priCls     = { Low: "bg-gray-100 text-gray-500", Medium: "bg-yellow-100 text-yellow-700", High: "bg-orange-100 text-orange-600", Urgent: "bg-red-100 text-red-600" };
const Badge = ({ label, cls }) => <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>;
const INP = "au-inp w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white transition";

/* ════════════════════════════════════════════════
   ADMIN HEADER
════════════════════════════════════════════════ */
const AdminHeader = ({ sidebarOpen, setSidebarOpen, onLogout, ticketCount, overdueCount, isSuperAdmin, currentAdminId, adminProfile, onViewTicket }) => {
  const initials = (adminProfile?.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <header className="au-admin-header h-16 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-50 shadow-lg">
      <div className="au-topbar absolute top-0 left-0 right-0 h-[3px]" style={{ background: "" }} />
      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="au-hamburger lg:hidden p-2 rounded-xl transition">
        <i className="fa-solid fa-bars text-lg" />
      </button>
      {/* Logo */}
    <div className="flex items-center gap-2.5 mr-4">
        <img src="/itech.png" alt="iTech" style={{ height: "100px", width: "auto", objectFit: "contain", marginTop: "12px" }} />
        <span className="hidden sm:block text-white/30 text-sm font-light">|</span>
        <span className="hidden sm:block text-white/60 text-xs font-semibold">Admin</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {isSuperAdmin && (
          <span className="au-badge-super hidden sm:inline text-xs font-bold px-2.5 py-1 rounded-full border">
            <i className="fa-solid fa-shield-halved mr-1" />Super Admin
          </span>
        )}
        {overdueCount > 0 && (
          <span className="au-badge-overdue hidden sm:inline text-xs font-bold px-2.5 py-1 rounded-full border">
            <i className="fa-solid fa-triangle-exclamation mr-1" />{overdueCount} Overdue
          </span>
        )}
        <span className="au-badge-count hidden sm:inline text-xs px-2.5 py-1 rounded-full">
          {ticketCount} tickets
        </span>

        {/* Notification Bell */}
        {currentAdminId && (
          <NotificationBell
            recipientId={currentAdminId}
            role="admin"
            accentColor="#1B3A6B"
            onViewTicket={onViewTicket}
            userName={adminProfile?.name || "Admin"}
            userPhoto={adminProfile?.profileImage || ""}
          />
        )}

        <div className="au-divider w-px h-7 mx-1" style={{ background: "rgba(255,255,255,0.15)" }} />

        {/* Admin avatar + name */}
        <div className="flex items-center gap-2.5 cursor-pointer px-1">
          <div className="au-avatar-grad w-8 h-8 rounded-full overflow-hidden border-2 border-yellow-400 flex items-center justify-center shrink-0">
            {adminProfile?.profileImage
              ? <img src={adminProfile.profileImage} alt="avatar" className="w-full h-full object-cover" />
              : <span className="text-white font-extrabold text-xs">{initials}</span>
            }
          </div>
          <div className="hidden sm:block">
            <p className="au-user-name text-sm font-bold leading-none">{adminProfile?.name || "Admin"}</p>
            <p className="au-user-sub text-xs mt-0.5">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
          </div>
        </div>

        <button onClick={onLogout} title="Sign Out" className="au-icon-btn p-2.5 rounded-xl transition">
          <i className="fa-solid fa-right-from-bracket text-base" />
        </button>
      </div>
    </header>
  );
};

/* ════════════════════════════════════════════════
   ADMIN SIDEBAR  ← ✅ MAINTENANCE ADDED
════════════════════════════════════════════════ */
const AdminSidebar = ({ active, setActive, sidebarOpen, setSidebarOpen, isSuperAdmin, adminProfile }) => {
  const navItems = [
    { key: "home",        icon: "fa-house",            label: "Dashboard"        },
    { key: "tickets",     icon: "fa-ticket",            label: "Tickets"          },
    { key: "students",    icon: "fa-users",             label: "Students"         },
    ...(isSuperAdmin ? [{ key: "admins", icon: "fa-user-shield", label: "Admin Management" }] : []),
    { key: "reports",     icon: "fa-chart-bar",         label: "Reports"          },
    { key: "maintenance", icon: "fa-screwdriver-wrench",label: "Maintenance"      }, // ✅ NEW
    ...(isSuperAdmin ? [{ key: "palette", icon: "fa-palette", label: "Theme & Colors" }] : []),
    { key: "settings",    icon: "fa-gear",              label: "Settings"         },
    { key: "profile",     icon: "fa-circle-user",       label: "My Profile"       },
  ];
  const initials = (adminProfile?.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      {sidebarOpen && <div className="au-overlay fixed inset-0 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`au-admin-sidebar fixed top-16 left-0 h-[calc(100vh-64px)] w-64 flex flex-col z-40 shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>

        {/* User card */}
        <div className="p-4 au-border-bottom border-b">
          <div className="au-user-card flex items-center gap-3 p-3">
            <div className="au-avatar-grad w-10 h-10 rounded-full overflow-hidden border-2 border-yellow-400 flex items-center justify-center shrink-0">
              {adminProfile?.profileImage
                ? <img src={adminProfile.profileImage} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-sm">{initials}</span>
              }
            </div>
            <div className="overflow-hidden">
              <p className="au-user-name font-bold text-sm truncate">{adminProfile?.name || "Admin"}</p>
              <p className="au-user-role font-semibold">{isSuperAdmin ? "⚡ Super Admin" : "🛡️ Admin"}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <p className="au-section-label text-[10px] font-extrabold uppercase tracking-widest px-3 mb-2">Main Menu</p>
          {navItems.map(item => {
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                onClick={() => { setActive(item.key); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${isActive ? "au-nav-active" : "au-nav-inactive"}`}
              >
                <i className={`fa-solid ${item.icon} w-4 text-center text-sm`} />
                <span className="flex-1 font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Help card */}
        <div className="p-4 au-border-top border-t">
          <div className=" rounded-2xl p-4 text-white">
            <p className="font-bold text-sm mb-1">Arellano University</p>
            <p className="text-xs text-white/70 mb-2">ITECH Admin Panel v2.0</p>
            <div className="text-xs font-bold px-3 py-1.5 rounded-lg w-fit" style={{ background: "" }}>
              <i className="fa-solid fa-graduation-cap mr-1" /> Manila 1938
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

/* ════════════════════════════════════════════════
   DASHBOARD HOME
════════════════════════════════════════════════ */
const DashboardHome = ({ tickets, admins, adminProfile, isSuperAdmin, setActive }) => {
  const open       = tickets.filter(t => t.status === "Open").length;
  const pending    = tickets.filter(t => t.status === "Pending").length;
  const resolved   = tickets.filter(t => t.status === "Resolved").length;
  const overdue    = tickets.filter(isOverdue).length;
  const unassigned = tickets.filter(t => !t.assignedTo && t.status === "Open").length;
  const closed     = tickets.filter(t => t.status === "Closed").length;

  const stats = [
    { label: "Total",      val: tickets.length, icon: "fa-ticket",               cls: "au-stat-navy"   },
    { label: "Open",       val: open,            icon: "fa-folder-open",           cls: "au-stat-navy"   },
    { label: "Pending",    val: pending,          icon: "fa-hourglass-half",        cls: "au-stat-gold"   },
    { label: "Resolved",   val: resolved,         icon: "fa-circle-check",          cls: "au-stat-green"  },
    { label: "Overdue",    val: overdue,          icon: "fa-triangle-exclamation",  cls: "au-stat-red"    },
    { label: "Unassigned", val: unassigned,       icon: "fa-user-slash",            cls: "au-stat-orange" },
  ];

  const catMap = {};
  tickets.forEach(t => { catMap[t.category] = (catMap[t.category] || 0) + 1; });
  const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const recent  = [...tickets].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).slice(0, 8);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="au-admin-hero rounded-2xl p-6 relative overflow-hidden">
        <div className="au-topbar-line absolute top-0 left-0 right-0 h-1" style={{ background: "" }} />
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="absolute right-10 bottom-0 w-24 h-24 rounded-full" style={{ background: "rgba(245,208,0,0.06)" }} />
        <div className="relative z-10">
          <p className="text-white/60 text-sm mb-1"><i className="fa-solid fa-hand-wave mr-1" /> {greeting},</p>
          <h2 className="text-white text-2xl font-extrabold mb-1">{adminProfile?.name || "Admin"}!</h2>
          <p className="text-white/50 text-sm">{isSuperAdmin ? "Super Admin · Full Access" : "Admin · Support Staff"} · Arellano University</p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <button onClick={() => setActive("tickets")} className="au-hero-btn-solid text-sm font-extrabold px-4 py-2 rounded-xl hover:shadow-lg transition hover:-translate-y-0.5 flex items-center gap-2">
              <i className="fa-solid fa-ticket text-xs" /> Manage Tickets
            </button>
            {overdue > 0 && (
              <button onClick={() => setActive("tickets")} className="au-hero-btn-red text-sm font-bold px-4 py-2 rounded-xl transition flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation text-xs" /> {overdue} Overdue
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(s => (
          <div
            key={s.label}
            onClick={() => setActive("tickets")}
            className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:-translate-y-0.5 transition cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.cls}`}>
              <i className={`fa-solid ${s.icon} text-sm`} />
            </div>
            <p className="text-3xl font-extrabold text-gray-900">{s.val}</p>
            <p className="text-xs text-gray-400 font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tickets */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-extrabold text-gray-800 flex items-center gap-2">
              <i className="fa-solid fa-clock-rotate-left au-section-icon text-sm" /> Recent Tickets
            </h3>
            <button onClick={() => setActive("tickets")} className="text-xs au-breadcrumb-active hover:underline font-semibold">View all →</button>
          </div>
          {recent.length === 0 ? (
            <div className="text-center py-12">
              <i className="fa-solid fa-ticket-simple text-4xl text-gray-200 block mb-3" />
              <p className="text-gray-400 text-sm">No tickets yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recent.map(t => (
                <div key={t.id} onClick={() => setActive("tickets")}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition cursor-pointer">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    t.status === "Open" ? "bg-blue-500" : t.status === "Pending" ? "bg-amber-500"
                    : t.status === "Resolved" ? "bg-green-500" : "bg-gray-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400">{t.studentName} · {t.category}</p>
                  </div>
                  <Badge label={t.status}   cls={statusCls[t.status]  || "bg-gray-100 text-gray-500"} />
                  <Badge label={t.priority} cls={priCls[t.priority]   || "bg-gray-100 text-gray-500"} />
                  {isOverdue(t) && <span className="text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded shrink-0">OD</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Category breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-layer-group au-section-icon text-sm" /> By Category
            </h3>
            {topCats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topCats.map(([cat, cnt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-gray-700 truncate max-w-[150px]">{cat}</span>
                      <span className="font-bold text-gray-500">{cnt}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="au-bar h-full rounded-full transition-all duration-700" style={{ width: `${Math.round((cnt / tickets.length) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-users au-section-icon text-sm" /> Admin Team
              <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{admins.length}</span>
            </h3>
            {admins.slice(0, 5).map(a => {
              const myCount = tickets.filter(t => t.assignedTo === a.id && (t.status === "Open" || t.status === "Pending")).length;
              return (
                <div key={a.id} className="flex items-center gap-2.5 mb-2">
                  <div className="au-avatar-grad w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                    {a.profileImage
                      ? <img src={a.profileImage} alt={a.name} className="w-full h-full object-cover" />
                      : <span className="text-white font-bold text-xs">{(a.name || "A")[0].toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-gray-400">{a.role === "superAdmin" ? "Super Admin" : "Admin"}</p>
                  </div>
                  {myCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full au-stat-navy">{myCount}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   STUDENTS PAGE
════════════════════════════════════════════════ */
const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    getDocs(collection(db, "students"))
      .then(snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    !search ||
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">Students</span>
      </div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-users au-section-icon" /> Students
          <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{students.length}</span>
        </h2>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="au-inp px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none w-72" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-spinner fa-spin au-section-icon text-3xl block mb-3" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-users text-4xl text-gray-200 block mb-3" />
            <p className="text-gray-400 text-sm">No students found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <tr>{["Student", "Email", "Year Level", "Section", "Registered"].map(h => (
                    <th key={h} className="px-5 py-3 text-left">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(s => {
                    const initials = (s.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="au-avatar-grad w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                              {s.photoURL
                                ? <img src={s.photoURL} alt={s.name} className="w-full h-full object-cover" />
                                : <span className="text-white text-xs font-bold">{initials}</span>
                              }
                            </div>
                            <span className="font-semibold text-gray-800">{s.name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{s.email || "—"}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{s.yearLevel || "—"}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{s.section || "—"}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{fmtDate(s.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
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
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${n === page ? "au-btn-primary" : "border border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
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

/* ════════════════════════════════════════════════
   ADMIN MANAGEMENT
════════════════════════════════════════════════ */
const AdminManagement = ({ currentAdminId }) => {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "admin", password: "", confirmPassword: "" });
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState("");
  const [success, setSuccess] = useState("");

  const loadAdmins = () => {
    setLoading(true);
    getDocs(collection(db, "admins"))
      .then(snap => setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadAdmins(); }, []);

  const handleAdd = async (e) => {
  e.preventDefault(); setErr(""); setSuccess("");
  if (!form.name || !form.email || !form.password) { setErr("Name, email, and password are required."); return; }
  if (form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
  if (form.password !== form.confirmPassword) { setErr("Passwords do not match."); return; }
  setSaving(true);
  try {
    // Call Firebase Auth REST API to create the user
    const apiKey = firebaseApiKey; // from your .env
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Failed to create auth user.");

    const uid = data.localId; // ← Firebase Auth UID

    // Write Firestore doc using UID as document ID
    await setDoc(doc(db, "admins", uid), {
      name: form.name,
      email: form.email,
      role: form.role,
      createdAt: serverTimestamp(),
    });

    setSuccess(`Admin "${form.name}" created successfully!`);
    setForm({ name: "", email: "", role: "admin", password: "", confirmPassword: "" });
    setShowAdd(false);
    loadAdmins();
    setTimeout(() => setSuccess(""), 4000);
  } catch (e) { setErr(e.message); }
  setSaving(false);
};
  const handleDelete = async (id, name) => {
    if (id === currentAdminId) { alert("Cannot delete your own account."); return; }
    if (!window.confirm(`Delete admin "${name}"?`)) return;
    try { await deleteDoc(doc(db, "admins", id)); loadAdmins(); } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">Admin Management</span>
      </div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-user-shield au-section-icon" /> Admin Management
          <span className="text-sm font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{admins.length}</span>
        </h2>
        <button onClick={() => setShowAdd(!showAdd)} className="au-btn-primary flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition">
          <i className="fa-solid fa-plus text-xs" /> Add Admin
        </button>
      </div>

      {success && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2"><i className="fa-solid fa-circle-check au-success-icon" /> {success}</div>}

      {showAdd && (
        <form onSubmit={handleAdd} className="mb-5 bg-white border border-gray-100 rounded-2xl p-5">
          <p className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-user-plus au-section-icon" /> New Admin
          </p>
          {err && <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{err}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={INP} placeholder="Admin's full name" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={INP} placeholder="admin@arellano.edu" />
            </div>
            <div>
  <label className="block text-xs font-bold text-gray-600 mb-1.5">Password *</label>
  <input
    type="password"
    value={form.password}
    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
    className={INP}
    placeholder="Min. 6 characters"
  />
</div>
<div>
  <label className="block text-xs font-bold text-gray-600 mb-1.5">Confirm Password *</label>
  <input
    type="password"
    value={form.confirmPassword}
    onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
    className={INP}
    placeholder="Re-enter password"
  />
</div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} className={INP}>
                <option value="admin">Admin</option>
                <option value="superAdmin">Super Admin</option>
              </select>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-xs text-amber-700">
            <i className="fa-solid fa-circle-info mr-1" />
            Create the Firebase Auth account manually in Firebase Console. The UID must match the Firestore document ID.
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" disabled={saving} className="au-btn-primary px-5 py-2 text-sm font-bold rounded-xl transition disabled:opacity-50">
              {saving ? "Adding..." : "Add Admin"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl transition">Cancel</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-12"><i className="fa-solid fa-spinner fa-spin au-section-icon text-3xl block mb-3" /></div>
        ) : admins.length === 0 ? (
          <div className="text-center py-12">
            <i className="fa-solid fa-user-shield text-4xl text-gray-200 block mb-3" />
            <p className="text-gray-400 text-sm">No admins in Firestore yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>{["Admin", "Email", "Role", "Doc ID", "Actions"].map(h => (
                  <th key={h} className="px-5 py-3 text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 transition ${a.id === currentAdminId ? "bg-blue-50/30" : ""}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="au-avatar-grad w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                          {a.profileImage
                            ? <img src={a.profileImage} alt={a.name} className="w-full h-full object-cover" />
                            : <span className="text-white text-xs font-bold">{(a.name || "A")[0].toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{a.name || "—"}</p>
                          {a.id === currentAdminId && <span className="text-[10px] font-bold au-breadcrumb-active">YOU</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{a.email || "—"}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${a.role === "superAdmin" ? "bg-yellow-100 text-yellow-700" : "bg-blue-100 text-blue-700"}`}>
                        {a.role === "superAdmin" ? "⚡ Super Admin" : "🛡️ Admin"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate">{a.id}</td>
                    <td className="px-5 py-3">
                      {a.id !== currentAdminId && (
                        <button onClick={() => handleDelete(a.id, a.name)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg transition border border-red-200">
                          <i className="fa-solid fa-trash text-xs mr-1" /> Remove
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl p-4 border" style={{ background: "rgba(27,58,107,0.04)", borderColor: "rgba(27,58,107,0.12)" }}>
        <p className="text-xs font-extrabold mb-2 flex items-center gap-1.5 au-breadcrumb-active">
          <i className="fa-solid fa-circle-info" /> How to add a Firebase admin properly
        </p>
        <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
          <li>Firebase Console → Authentication → Add User (email + password)</li>
          <li>Copy the UID of the new user</li>
          <li>Firestore → <code className="bg-gray-100 px-1 rounded">admins</code> collection → Add document with that UID as document ID</li>
          <li>Add fields: <code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">email</code>, <code className="bg-gray-100 px-1 rounded">role</code> ("admin" or "superAdmin")</li>
          <li>Admin can now log in with email + password from the Login page</li>
        </ol>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   REPORTS PAGE
════════════════════════════════════════════════ */
const ReportsPage = ({ tickets }) => {
  const total    = tickets.length;
  const resolved = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;
  const rate     = total > 0 ? Math.round((resolved / total) * 100) : 0;
  const avgHrs   = total > 0 ? Math.round(tickets.reduce((acc, t) => acc + hoursOld(t.createdAt), 0) / total) : 0;

  const byPriority = ["Urgent","High","Medium","Low"].map(p => ({ label: p, count: tickets.filter(t => t.priority === p).length, cls: priCls[p] }));
  const byStatus   = ["Open","Pending","Resolved","Closed"].map(s => ({ label: s, count: tickets.filter(t => t.status === s).length, cls: statusCls[s] }));

  return (
    <div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">Reports</span>
      </div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-5 flex items-center gap-2">
        <i className="fa-solid fa-chart-bar au-section-icon" /> Reports & Analytics
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Total Tickets",   val: total,   icon:"fa-ticket",               cls:"au-stat-navy"  },
          { label:"Resolution Rate", val:`${rate}%`,icon:"fa-percent",             cls:"au-stat-green" },
          { label:"Avg. Age (hrs)",  val: avgHrs,  icon:"fa-clock",                cls:"au-stat-gold"  },
          { label:"Overdue",         val: tickets.filter(isOverdue).length, icon:"fa-triangle-exclamation", cls:"au-stat-red" },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.cls}`}>
              <i className={`fa-solid ${s.icon} text-sm`} />
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{s.val}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-signal au-section-icon text-sm" /> By Priority
          </h3>
          <div className="space-y-3">
            {byPriority.map(p => (
              <div key={p.label} className="flex items-center gap-3">
                <Badge label={p.label} cls={p.cls} />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="au-bar h-full rounded-full transition-all duration-700" style={{ width: total > 0 ? `${(p.count / total) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs font-bold text-gray-500 w-6 text-right">{p.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie au-section-icon text-sm" /> By Status
          </h3>
          <div className="space-y-3">
            {byStatus.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <Badge label={s.label} cls={s.cls} />
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="au-bar h-full rounded-full transition-all duration-700" style={{ width: total > 0 ? `${(s.count / total) * 100}%` : "0%" }} />
                </div>
                <span className="text-xs font-bold text-gray-500 w-6 text-right">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   SETTINGS PAGE
════════════════════════════════════════════════ */
const SettingsPage = ({ adminProfile, currentAdminId, isSuperAdmin, isHardcoded }) => {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs,  setPushNotifs]  = useState(true);
  const [autoAssign,  setAutoAssign]  = useState(false);
  const [saved, setSaved] = useState(false);

  const Toggle = ({ value, onChange, label, sub }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative w-11 h-6 rounded-full transition-colors duration-200"
        style={{ background: value ? "var(--au-navy)" : "#e5e7eb" }}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">Settings</span>
      </div>
      <h2 className="text-xl font-extrabold text-gray-900 mb-5 flex items-center gap-2">
        <i className="fa-solid fa-gear au-section-icon" /> Settings
      </h2>
      {saved && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2"><i className="fa-solid fa-circle-check au-success-icon" /> Settings saved!</div>}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-bell au-section-icon text-sm" /> Notifications
          </h3>
          <Toggle value={emailNotifs} onChange={setEmailNotifs} label="Email Notifications"  sub="Get email alerts for new tickets" />
          <Toggle value={pushNotifs}  onChange={setPushNotifs}  label="In-App Notifications" sub="Bell icon alerts in the dashboard" />
          <Toggle value={autoAssign}  onChange={setAutoAssign}  label="Auto-Assign Tickets"  sub="Automatically assign to available admin" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
            <i className="fa-solid fa-circle-user au-section-icon text-sm" /> Account Info
          </h3>
          <div className="space-y-2">
            {[
              { label: "Name",    val: adminProfile?.name  || "—"                        },
              { label: "Email",   val: adminProfile?.email || "—"                        },
              { label: "Role",    val: isSuperAdmin ? "⚡ Super Admin" : "🛡️ Admin"     },
              { label: "Account", val: isHardcoded ? "Hardcoded (local)" : "Firebase"    },
              { label: "UID",     val: currentAdminId || "—"                             },
            ].map(f => (
              <div key={f.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400 font-semibold">{f.label}</span>
                <span className="text-xs font-bold text-gray-700 truncate max-w-[200px]">{f.val}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
          className="au-btn-primary w-full py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2">
          <i className="fa-solid fa-floppy-disk" /> Save Settings
        </button>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════
   ADMIN PROFILE
════════════════════════════════════════════════ */
const AdminProfile = ({ adminProfile, setAdminProfile, currentAdminId, isHardcoded }) => {
  const [form,     setForm]     = useState({ name: adminProfile?.name || "", phone: adminProfile?.phone || "", bio: adminProfile?.bio || "" });
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState("");
  const [err,      setErr]      = useState("");
  const [pwForm,   setPwForm]   = useState({ current: "", newPw: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg,    setPwMsg]    = useState("");
  const [pwErr,    setPwErr]    = useState("");
  const [tab,      setTab]      = useState("info");
  const [showPw,   setShowPw]   = useState(false);
  const fileRef = useRef(null);
  const initials = (adminProfile?.name || "A").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleImageChange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const compressed = await compressImage(file);
      if (!isHardcoded && currentAdminId !== "hardcoded_admin")
        await updateDoc(doc(db, "admins", currentAdminId), { profileImage: compressed, updatedAt: serverTimestamp() });
      setAdminProfile(p => ({ ...p, profileImage: compressed }));
      setMsg("Photo updated!"); setTimeout(() => setMsg(""), 3000);
    } catch { setErr("Failed to upload photo."); }
  };

  const handleSave = async (e) => {
    e.preventDefault(); setErr(""); setMsg(""); setSaving(true);
    try {
      if (!isHardcoded && currentAdminId !== "hardcoded_admin")
        await updateDoc(doc(db, "admins", currentAdminId), { name: form.name, phone: form.phone, bio: form.bio, updatedAt: serverTimestamp() });
      setAdminProfile(p => ({ ...p, ...form }));
      setMsg("Profile updated!"); setTimeout(() => setMsg(""), 3000);
    } catch { setErr("Failed to save."); }
    setSaving(false);
  };

  const handleChangePw = async (e) => {
    e.preventDefault(); setPwErr(""); setPwMsg("");
    if (isHardcoded) { setPwErr("Cannot change password for hardcoded admin."); return; }
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) { setPwErr("Fill all fields."); return; }
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
      setPwErr(e.code === "auth/wrong-password" ? "Current password incorrect." : "Failed to change password.");
    }
    setPwSaving(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">My Profile</span>
      </div>

      <div className="au-admin-hero rounded-2xl p-6 mb-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg,#F5D000,#DA291C,#F5D000)" }} />
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center cursor-pointer au-avatar-grad border-4"
              style={{ borderColor: "rgba(245,208,0,0.5)" }}>
              {adminProfile?.profileImage
                ? <img src={adminProfile.profileImage} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white font-extrabold text-2xl">{initials}</span>
              }
            </div>
            <button onClick={() => fileRef.current?.click()} className="au-camera-btn absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
              <i className="fa-solid fa-camera text-white text-xs" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </div>
          <div>
            <p className="text-white font-extrabold text-xl">{adminProfile?.name || "Admin"}</p>
            <p className="text-white/60 text-sm">{adminProfile?.email || "—"}</p>
            <div className="flex gap-2 mt-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(245,208,0,0.2)", color: "#F5D000" }}>
                {adminProfile?.role === "superAdmin" ? "⚡ Super Admin" : "🛡️ Admin"}
              </span>
              {isHardcoded && <span className="text-xs bg-white/15 text-white px-2 py-0.5 rounded-full font-semibold">Hardcoded</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ id: "info", label: "Profile Info", icon: "fa-user" }, { id: "password", label: "Change Password", icon: "fa-lock" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${tab === t.id ? "au-tab-active shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <i className={`fa-solid ${t.icon} text-xs`} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {msg && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2"><i className="fa-solid fa-circle-check au-success-icon" /> {msg}</div>}
          {err && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2"><i className="fa-solid fa-circle-exclamation" /> {err}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={INP} placeholder="Your full name" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Email</label>
                <input type="email" value={adminProfile?.email || ""} disabled className={`${INP} bg-gray-50 text-gray-400 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className={INP} placeholder="+63 9XX XXX XXXX" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Bio</label>
                <textarea rows="3" value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} className={`${INP} resize-none`} placeholder="Tell us about yourself..." />
              </div>
            </div>
            <button type="submit" disabled={saving} className="au-btn-primary w-full py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</> : <><i className="fa-solid fa-floppy-disk" /> Save Changes</>}
            </button>
          </form>
        </div>
      )}

      {tab === "password" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          {isHardcoded && <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation" /> Hardcoded admin — password change not supported.</div>}
          {pwMsg && <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2"><i className="fa-solid fa-circle-check au-success-icon" /> {pwMsg}</div>}
          {pwErr && <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2"><i className="fa-solid fa-circle-exclamation" /> {pwErr}</div>}
          <form onSubmit={handleChangePw} className="space-y-4">
            {[{key:"current",label:"Current Password"},{key:"newPw",label:"New Password"},{key:"confirm",label:"Confirm New Password"}].map((f, i) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} value={pwForm[f.key]} onChange={e => setPwForm(p => ({...p, [f.key]: e.target.value}))}
                    className={`${INP} pr-16`} placeholder="••••••••" disabled={isHardcoded} />
                  {i === 0 && <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-semibold">{showPw ? "Hide" : "Show"}</button>}
                </div>
              </div>
            ))}
            <button type="submit" disabled={pwSaving || isHardcoded} className="au-btn-primary w-full py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2 disabled:opacity-50">
              {pwSaving ? <><i className="fa-solid fa-spinner fa-spin" /> Changing...</> : <><i className="fa-solid fa-key" /> Change Password</>}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════
   MAIN ADMIN DASHBOARD
════════════════════════════════════════════════ */
const AdminDashboard = ({ setPage }) => {
  const [active,         setActive]         = useState("home");
  const [sidebarOpen,    setSidebarOpen]     = useState(false);
  const [loading,        setLoading]         = useState(true);
  const [adminProfile,   setAdminProfile]    = useState(null);
  const [currentAdminId, setCurrentAdminId]  = useState(null);
  const [isSuperAdmin,   setIsSuperAdmin]    = useState(false);
  const [isHardcoded,    setIsHardcoded]     = useState(false);
  const [tickets,        setTickets]         = useState([]);
  const [admins,         setAdmins]          = useState([]);

  useEffect(() => {
    loadAndApplyTheme(); // ✅ Restore saved theme on boot
    const hardcoded = localStorage.getItem("hardcoded_admin") === "true";
    if (hardcoded) {
      setIsHardcoded(true);
      setCurrentAdminId("hardcoded_admin");
      setIsSuperAdmin(true);
      setAdminProfile({ name: "Super Admin", email: "admin", role: "superAdmin" });
      setLoading(false);
      return;
    }
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) { setPage("login"); return; }
      try {
        const snap = await getDoc(doc(db, "admins", user.uid));
        if (!snap.exists()) { setPage("dashboard"); return; }
        const data = snap.data();
        setCurrentAdminId(user.uid);
        setIsSuperAdmin(data.role === "superAdmin");
        setAdminProfile({ ...data, email: user.email });
      } catch { setPage("login"); }
      setLoading(false);
    });
    return () => unsubAuth();
  }, [setPage]);

  useEffect(() => {
    if (!currentAdminId) return;
    const unsub = onSnapshot(collection(db, "tickets"), snap => {
      setTickets(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      );
    });
    return () => unsub();
  }, [currentAdminId]);

  useEffect(() => {
    if (!currentAdminId) return;
    getDocs(collection(db, "admins"))
      .then(snap => setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error);
  }, [currentAdminId]);

  const handleLogout = async () => {
    localStorage.removeItem("hardcoded_admin");
    localStorage.removeItem("page");
    if (!isHardcoded) { try { await signOut(auth); } catch {} }
    setPage("home");
  };

  const handleViewTicket = () => { setActive("tickets"); };

  const overdueCount = tickets.filter(isOverdue).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f2f5" }}>
      <div className="text-center">
        <i className="fa-solid fa-spinner fa-spin text-5xl block mb-4" style={{ color: "#DA291C" }} />
        <p className="text-gray-500 font-semibold">Loading admin dashboard...</p>
     <div className="flex items-center justify-center mt-2">
          <img src="/itech.png" alt="iTech" style={{ height: "36px", width: "auto", objectFit: "contain", opacity: 0.5 }} />
        </div>      </div>
    </div>
  );

  const renderContent = () => {
    switch (active) {
      case "home":        return <DashboardHome tickets={tickets} admins={admins} adminProfile={adminProfile} isSuperAdmin={isSuperAdmin} setActive={setActive} />;
      case "tickets":     return <AdminTickets currentAdminId={currentAdminId} isSuperAdmin={isSuperAdmin} />;
      case "students":    return <StudentsPage />;
      case "admins":      return isSuperAdmin ? <AdminManagement currentAdminId={currentAdminId} /> : null;
      case "reports":     return <ReportsPage tickets={tickets} />;
      case "maintenance": return <AdminMaintenance />; // ✅ NEW
      case "palette":     return <AdminPalette />; // ✅ PALETTE
      case "settings":    return <SettingsPage adminProfile={adminProfile} currentAdminId={currentAdminId} isSuperAdmin={isSuperAdmin} isHardcoded={isHardcoded} />;
      case "profile":     return <AdminProfile adminProfile={adminProfile} setAdminProfile={setAdminProfile} currentAdminId={currentAdminId} isHardcoded={isHardcoded} />;
      default: return (
        <div className="text-center py-20">
          <i className="fa-solid fa-hammer text-5xl text-gray-200 block mb-4" />
          <p className="font-extrabold text-gray-400 text-lg">Coming Soon</p>
        </div>
      );
    }
  };

  return (
    <>
      <FAStyle />
      <AUAdminStyle />
      <div className="au-admin-main min-h-screen flex flex-col">
        <AdminHeader
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
          ticketCount={tickets.length}
          overdueCount={overdueCount}
          isSuperAdmin={isSuperAdmin}
          currentAdminId={currentAdminId}
          adminProfile={adminProfile}
          onViewTicket={handleViewTicket}
        />
        <div className="flex flex-1 overflow-hidden">
          <AdminSidebar
            active={active}
            setActive={setActive}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
            isSuperAdmin={isSuperAdmin}
            adminProfile={adminProfile}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 lg:ml-64">
            {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;