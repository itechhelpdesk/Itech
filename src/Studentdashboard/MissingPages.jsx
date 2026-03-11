// MissingPages.jsx
// Add this import to StudentDashboard:
//   import { TicketHistory, FAQPage, SettingsPage } from "./MissingPages";

import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../Back_end/Firebase";

const formatDate = (ts) => {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const statusStyle   = { Open: "bg-blue-100 text-blue-700", Pending: "bg-amber-100 text-amber-700", Resolved: "bg-green-100 text-green-700", Closed: "bg-gray-100 text-gray-500" };
const priorityStyle = { Low: "bg-gray-100 text-gray-500", Medium: "bg-amber-100 text-amber-600", High: "bg-red-100 text-red-600", Urgent: "bg-purple-100 text-purple-600" };
const Badge = ({ label, cls }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>
);

/* ════════════════════════════════════════════════════════
   TICKET HISTORY
════════════════════════════════════════════════════════ */
export const TicketHistory = ({ tickets, onViewTicket }) => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const closed     = tickets.filter(t => t.status === "Resolved" || t.status === "Closed");
  const statuses   = ["All", "Resolved", "Closed"];

  const filtered = closed.filter(t => {
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchSearch = !search ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketId?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">History</span>
      </div>

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left au-section-icon" /> Ticket History
        </h2>
        <span className="text-xs text-gray-400 font-semibold bg-gray-100 px-3 py-1 rounded-full">
          {closed.length} resolved / closed
        </span>
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
          <input
            type="text"
            placeholder="Search history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-white au-inp"
          />
        </div>
        <div className="flex gap-2">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-2 rounded-xl text-sm font-bold transition ${
                filterStatus === s ? "au-filter-active" : "bg-white border border-gray-200 text-gray-500 hover:border-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <i className="fa-solid fa-clock-rotate-left text-5xl text-gray-200 block mb-3" />
            <p className="text-gray-500 font-semibold text-sm">
              {closed.length === 0 ? "No resolved tickets yet." : "No results match your search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  {["Ticket ID", "Subject", "Category", "Priority", "Status", "Resolved On", "Action"].map(h => (
                    <th key={h} className="px-5 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-mono au-ticket-id font-bold text-xs">#{t.ticketId}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-800 max-w-[160px] truncate">{t.subject}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{t.category}</td>
                    <td className="px-5 py-3">
                      <Badge label={t.priority} cls={priorityStyle[t.priority] || "bg-gray-100 text-gray-500"} />
                    </td>
                    <td className="px-5 py-3">
                      <Badge label={t.status} cls={statusStyle[t.status] || "bg-gray-100 text-gray-500"} />
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(t.updatedAt)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => onViewTicket(t.id)}
                        className="au-view-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition"
                      >
                        <i className="fa-solid fa-eye text-xs" /> View
                      </button>
                    </td>
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
   FAQ PAGE
════════════════════════════════════════════════════════ */
const faqs = [
  {
    category: "Tickets",
    items: [
      { q: "How do I submit a support ticket?", a: "Click the 'New Ticket' button in the header or sidebar. Fill in the category, priority, subject, and description, then click Submit." },
      { q: "How long does it take to resolve a ticket?", a: "Most tickets are addressed within 1–3 business days. Urgent tickets are prioritised and may be resolved sooner." },
      { q: "Can I attach a file to my ticket?", a: "Yes! You can attach PNG, JPG, or PDF files up to 5 MB when submitting a ticket." },
      { q: "Can I edit or delete a ticket after submission?", a: "Tickets cannot be edited or deleted after submission. You may open a new ticket referencing the original if needed." },
    ],
  },
  {
    category: "Account",
    items: [
      { q: "How do I change my password?", a: "Go to My Profile → Change Password tab. Enter your current password and your new password, then save." },
      { q: "Can I update my profile photo?", a: "Yes. Go to My Profile and click the camera icon on your avatar to upload a new photo." },
      { q: "What should I do if I forget my password?", a: "Use the 'Forgot Password' link on the login page. A reset link will be sent to your registered email." },
    ],
  },
  {
    category: "General",
    items: [
      { q: "What categories of concerns can I submit?", a: "You can submit tickets for IT Support, Registrar, Finance/Billing, Academic Affairs, Scholarship, Library, and more." },
      { q: "How will I know when my ticket is resolved?", a: "You'll receive a notification in the bell icon when your ticket status changes or an admin replies." },
      { q: "Is my ticket information private?", a: "Yes. Only you and authorised support staff can view your ticket details." },
    ],
  },
];

export const FAQPage = () => {
  const [openIdx, setOpenIdx] = useState({});
  const toggle = (cat, i) => setOpenIdx(prev => ({ ...prev, [`${cat}-${i}`]: !prev[`${cat}-${i}`] }));

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
        <i className="fa-solid fa-house text-gray-300" /><span>/</span>
        <span className="au-breadcrumb-active font-semibold">FAQs</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="au-stat-icon-primary w-10 h-10 rounded-xl flex items-center justify-center">
          <i className="fa-solid fa-circle-question" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Frequently Asked Questions</h2>
          <p className="text-sm text-gray-400">Find answers to common questions about ORCA.</p>
        </div>
      </div>

      <div className="space-y-5">
        {faqs.map(section => (
          <div key={section.category} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <p className="font-extrabold text-gray-700 text-sm flex items-center gap-2">
                <i className="fa-solid fa-folder-open au-section-icon text-sm" /> {section.category}
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {section.items.map((item, i) => {
                const key  = `${section.category}-${i}`;
                const isOpen = !!openIdx[key];
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggle(section.category, i)}
                      className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition"
                    >
                      <span className="font-semibold text-gray-800 text-sm pr-4">{item.q}</span>
                      <i className={`fa-solid fa-chevron-down text-gray-400 text-xs shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4">
                        <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════
   SETTINGS PAGE
════════════════════════════════════════════════════════ */
export const SettingsPage = ({ student, onLogout }) => {
  const [emailNotifs,  setEmailNotifs]  = useState(true);
  const [pushNotifs,   setPushNotifs]   = useState(true);
  const [statusAlerts, setStatusAlerts] = useState(true);
  const [adminReplies, setAdminReplies] = useState(true);
  const [saved, setSaved]               = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const Toggle = ({ value, onChange, label, sub }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${value ? "bg-blue-600" : "bg-gray-200"}`}
        style={{ background: value ? "var(--au-navy)" : undefined }}
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

      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
          <i className="fa-solid fa-circle-check" /> Settings saved successfully!
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h3 className="font-extrabold text-gray-800 mb-1 flex items-center gap-2">
          <i className="fa-solid fa-bell au-section-icon text-sm" /> Notification Preferences
        </h3>
        <p className="text-xs text-gray-400 mb-4">Choose how you'd like to be notified about your tickets.</p>
        <div className="divide-y divide-gray-50">
          <Toggle value={emailNotifs}  onChange={setEmailNotifs}  label="Email Notifications"  sub="Receive updates to your registered email" />
          <Toggle value={pushNotifs}   onChange={setPushNotifs}   label="In-App Notifications"  sub="Bell icon notifications inside ORCA" />
          <Toggle value={statusAlerts} onChange={setStatusAlerts} label="Ticket Status Changes" sub="Notify when a ticket is updated or resolved" />
          <Toggle value={adminReplies} onChange={setAdminReplies} label="Admin Replies"         sub="Notify when support staff responds" />
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h3 className="font-extrabold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fa-solid fa-circle-user au-section-icon text-sm" /> Account Information
        </h3>
        <div className="space-y-3">
          {[
            { label: "Full Name",   val: student?.name      || "—" },
            { label: "Email",       val: student?.email     || "—" },
            { label: "Year Level",  val: student?.yearLevel || "—" },
            { label: "Section",     val: student?.section   || "—" },
          ].map(f => (
            <div key={f.label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-400 font-semibold">{f.label}</span>
              <span className="text-sm font-bold text-gray-700">{f.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save + Sign Out */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="au-btn-primary flex-1 py-3 rounded-xl text-sm font-extrabold transition flex items-center justify-center gap-2"
        >
          <i className="fa-solid fa-floppy-disk" /> Save Settings
        </button>
        <button
          onClick={onLogout}
          className="px-5 bg-red-50 hover:bg-red-100 text-red-500 font-bold py-3 rounded-xl text-sm transition flex items-center gap-2"
        >
          <i className="fa-solid fa-right-from-bracket" /> Sign Out
        </button>
      </div>
    </div>
  );
};