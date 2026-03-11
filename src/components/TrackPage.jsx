// TrackPage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)

import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../Back_end/Firebase";

const DotPattern = ({ id }) => (
  <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id={id} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.5" fill="white" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
  </svg>
);

const priorityStyle = {
  Low:    "bg-gray-100 text-gray-500",
  Medium: "bg-amber-100 text-amber-600",
  High:   "bg-red-100 text-red-600",
  Urgent: "bg-purple-100 text-purple-600",
};

const Badge = ({ label, cls }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${cls}`}>{label}</span>
);

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

const TrackPage = () => {
  const [input, setInput]       = useState("");
  const [result, setResult]     = useState(null);
  const [err, setErr]           = useState("");
  const [searched, setSearched] = useState(false);
  const [loading, setLoading]   = useState(false);

  const statusIcon  = { Open: "🔵", Pending: "🟡", Resolved: "✅", Closed: "⛔" };

  const handleSearch = async (e) => {
    e.preventDefault();
    const key = input.trim().toUpperCase();
    if (!key) return;

    setSearched(true);
    setLoading(true);
    setResult(null);
    setErr("");

    try {
      const q = query(collection(db, "tickets"), where("ticketId", "==", key));
      const snap = await getDocs(q);

      if (snap.empty) {
        setErr(`No ticket found with ID "${key}". Please double-check and try again.`);
      } else {
        setResult(snap.docs[0].data());
      }
    } catch (error) {
      console.error(error);
      setErr("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const progressPct = result?.status === "Open" ? 20 : result?.status === "Pending" ? 55 : 100;

  const timeline = result ? [
    {
      icon: "🎫", label: "Ticket Submitted",
      sub: formatDateTime(result.createdAt),
      msg: `Your ticket #${result.ticketId} has been received and is now in queue.`,
    },
    ...(result.status !== "Open" ? [{
      icon: "⏳", label: "Under Review",
      sub: formatDateTime(result.updatedAt),
      msg: "Our support staff is currently reviewing your concern.",
    }] : []),
    ...(result.status === "Resolved" || result.status === "Closed" ? [{
      icon: "✅", label: "Resolved",
      sub: formatDateTime(result.updatedAt),
      msg: result.adminReply || "Your concern has been resolved. Thank you!",
    }] : []),
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HERO / SEARCH ── */}
      <section className="py-16 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)" }}>
        <DotPattern id="track-dots" />
        {/* Gold accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5"
          style={{ background: "linear-gradient(90deg, var(--au-yellow), var(--au-gold), var(--au-yellow))" }} />
        <div className="relative z-10 max-w-2xl mx-auto px-4 text-center">
          <span className="inline-block text-sm font-bold px-4 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", color: "var(--au-yellow)" }}>
            🔍 Ticket Tracker
          </span>
          <h1 className="text-4xl font-extrabold text-white mb-4">Track Your Ticket</h1>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.8)" }}>
            Enter your Ticket ID to check the current status of your concern.
          </p>

          <form onSubmit={handleSearch} className="flex gap-3 max-w-lg mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Ticket ID (e.g. TKT-20260220-161112)"
              className="flex-1 px-5 py-3.5 rounded-2xl text-sm font-semibold focus:outline-none text-white placeholder-white/50"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="font-extrabold px-6 py-3.5 rounded-2xl text-sm hover:shadow-lg transition active:scale-95 disabled:opacity-70"
              style={{ background: "var(--au-yellow)", color: "#1A1A1A" }}
            >
              {loading ? "..." : "Search"}
            </button>
          </form>

          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.6)" }}>
            💡 Format: <strong>TKT-YYYYMMDD-HHMMSS</strong>
          </p>
        </div>
      </section>

      {/* ── RESULTS ── */}
      <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10">

        {/* Empty state */}
        {!searched && (
          <div className="text-center py-16">
            <span className="text-6xl block mb-4">🔍</span>
            <p className="text-gray-400 font-semibold text-sm">
              Enter a Ticket ID above to view its details and updates.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <span className="text-4xl block mb-4 animate-spin">⏳</span>
            <p className="text-gray-400 font-semibold text-sm">Searching ticket...</p>
          </div>
        )}

        {/* Error */}
        {searched && !loading && err && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
            <span className="text-4xl block mb-3">❌</span>
            <p className="text-red-600 font-bold text-sm">{err}</p>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
          <div className="space-y-5">

            {/* Ticket Card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)" }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--au-yellow)" }}>Ticket ID</p>
                  <p className="text-white font-extrabold text-xl">#{result.ticketId}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                  style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}>
                  {statusIcon[result.status]} {result.status}
                </div>
              </div>

              <div className="p-6">
                <h2 className="text-lg font-extrabold text-gray-900 mb-4">{result.subject}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Category</p>
                    <p className="text-sm font-semibold text-gray-800">{result.category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                    <Badge label={result.priority} cls={priorityStyle[result.priority] || "bg-gray-100 text-gray-500"} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Submitted</p>
                    <p className="text-sm font-semibold text-gray-800">{formatDate(result.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Student</p>
                    <p className="text-sm font-semibold text-gray-800">{result.studentName}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between text-xs text-gray-400 font-semibold mb-1.5">
                    <span>Progress</span><span>{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, var(--au-navy), var(--au-red))" }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    {["Submitted", "In Review", "Resolved"].map((s, i) => (
                      <span key={s} className="text-xs font-bold"
                        style={{ color: progressPct >= (i === 0 ? 20 : i === 1 ? 55 : 100) ? "var(--au-red)" : "#d1d5db" }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.description}</p>
                </div>

                {result.adminReply && (
                  <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Admin Response</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{result.adminReply}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-extrabold text-gray-900 mb-5">🕒 Ticket Timeline</h3>
              <div className="relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5" style={{ background: "var(--au-gold)" }} />
                <div className="space-y-6">
                  {timeline.map((u, i) => (
                    <div key={i} className="flex gap-5 relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 text-white"
                        style={{
                          background: i === timeline.length - 1 ? "var(--au-red)" : "var(--au-navy)",
                          boxShadow: i === timeline.length - 1 ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
                        }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-xs text-gray-400 font-semibold mb-0.5">{u.sub}</p>
                        <p className="text-sm font-bold mb-0.5" style={{ color: "var(--au-navy)" }}>{u.label}</p>
                        <p className="text-sm text-gray-600 leading-relaxed">{u.msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Banner */}
            {result.status !== "Resolved" && result.status !== "Closed" ? (
              <div className="rounded-2xl p-4 text-center"
                style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.08)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--au-navy)" }}>
                  ⏳ Your ticket is being processed. We'll notify you once there's an update.
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-4 text-center">
                <p className="text-green-700 text-sm font-bold">
                  ✅ This ticket has been resolved. We hope your concern was addressed!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackPage;