// LoginPage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)
// Colors update live when admin changes the palette.

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../Back_end/Firebase";
import { loadAndApplyTheme } from "./../AdminDashboard/AdminPallete"; // adjust path as needed

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

// CSS variable defaults (fallback if theme hasn't loaded yet)
const auStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700;800&display=swap');
  :root {
    --au-red:        #DA291C;
    --au-red-dark:   #B52217;
    --au-navy:       #1B3A6B;
    --au-navy-dark:  #122850;
    --au-yellow:     #F5D000;
    --au-gold:       #F0C040;
  }
  .au-font { font-family: 'Source Sans 3', sans-serif; }
  .au-heading { font-family: 'Playfair Display', serif; }
`;

// ─────────────────────────────────────────────
//  🔐 HARDCODED ADMIN BYPASS
// ─────────────────────────────────────────────
const HARDCODED_ADMIN = { email: "admin", password: "admin" };

const LoginPage = ({ setPage }) => {
  const [show, setShow]       = useState(false);
  const [email, setEmail]     = useState("");
  const [pw, setPw]           = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  // Load saved palette from Firestore (in case App.jsx hasn't done it yet)
  useEffect(() => { loadAndApplyTheme(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !pw) { setErr("Please fill in all fields."); return; }

    if (
      email.trim().toLowerCase() === HARDCODED_ADMIN.email &&
      pw === HARDCODED_ADMIN.password
    ) {
      localStorage.setItem("page", "admin");
      localStorage.setItem("hardcoded_admin", "true");
      setPage("admin");
      return;
    }

    setLoading(true);
    try {
      const userCred = await signInWithEmailAndPassword(auth, email, pw);
      const user     = userCred.user;
      localStorage.removeItem("hardcoded_admin");

      const adminSnap = await getDoc(doc(db, "admins", user.uid));
      if (adminSnap.exists()) { localStorage.setItem("page", "admin"); setPage("admin"); return; }

      const studentSnap = await getDoc(doc(db, "students", user.uid));
      if (studentSnap.exists()) { localStorage.setItem("page", "dashboard"); setPage("dashboard"); return; }

      localStorage.setItem("page", "dashboard");
      setPage("dashboard");
    } catch (err) {
      console.error("Login Error:", err.code);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setErr("Email not found. Please register first.");
      } else if (err.code === "auth/wrong-password") {
        setErr("Incorrect password. Please try again.");
      } else if (err.code === "auth/invalid-email") {
        setErr("Invalid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setErr("Too many failed attempts. Please try again later.");
      } else {
        setErr(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: "🎫", title: "Submit a Ticket", sub: "Report concerns in seconds",  borderColor: "var(--au-red)"      },
    { icon: "📊", title: "Track Progress",  sub: "Real-time status updates",    borderColor: "var(--au-yellow)"   },
    { icon: "🎧", title: "24/7 Support",    sub: "Always ready to help",        borderColor: "var(--au-navy)"     },
  ];

  return (
    <div className="au-font" style={{ minHeight: "100vh", display: "flex", background: "#F8F5EF" }}>
      <style>{auStyles}</style>

      {/* ── LEFT PANEL ── */}
      <div style={{
        display: "none",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "45%",
        background: "linear-gradient(145deg, var(--au-navy) 0%, var(--au-red) 70%, var(--au-red-dark) 100%)",
        padding: "48px",
        position: "relative",
        overflow: "hidden",
      }} className="lg-panel">
        <style>{`.lg-panel { display: none; } @media (min-width: 1024px) { .lg-panel { display: flex !important; } }`}</style>

        {/* Gold top accent */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "5px", background: "linear-gradient(90deg, var(--au-yellow), var(--au-gold), var(--au-yellow))" }} />
        <DotPattern id="login-dots" />

        {/* Decorative circles */}
        <div style={{ position: "absolute", bottom: "-60px", right: "-40px", width: "260px", height: "260px", background: "var(--au-red)", borderRadius: "50%", opacity: 0.2 }} />
        <div style={{ position: "absolute", top: "30%", left: "-30px", width: "140px", height: "140px", background: "var(--au-yellow)", borderRadius: "50%", opacity: 0.1 }} />

        {/* Logo */}
          <button
          onClick={() => setPage("home")}
          style={{ position: "relative", zIndex: 10, background: "none", border: "none", cursor: "pointer" }}
        >
          <img src="/itech.png" alt="iTech" style={{ height: "120px", width: "120px", objectFit: "contain" }} />
        </button>

        {/* Middle content */}
        <div style={{ position: "relative", zIndex: 10 }}>
          <div style={{ width: "48px", height: "4px", background: "var(--au-yellow)", borderRadius: "2px", marginBottom: "24px" }} />
          <h2 className="au-heading" style={{ color: "#FFFFFF", fontSize: "2.2rem", fontWeight: 900, lineHeight: 1.2, marginBottom: "16px" }}>
            Student Support<br />Made Simple.
          </h2>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", lineHeight: 1.7, marginBottom: "32px" }}>
            Submit tickets, track your concerns, and get help from your school's support team — fast and easy.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {features.map((f) => (
              <div key={f.title} style={{
                display: "flex", alignItems: "center", gap: "14px",
                background: "rgba(255,255,255,0.08)", borderRadius: "16px",
                padding: "16px", border: "1px solid rgba(255,255,255,0.12)",
                borderLeft: `4px solid ${f.borderColor}`,
              }}>
                <span style={{ fontSize: "22px" }}>{f.icon}</span>
                <div>
                  <p style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "14px", marginBottom: "2px" }}>{f.title}</p>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px" }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ position: "relative", zIndex: 10, color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>© 2026 ITECH ·  All rights reserved.</p>
      </div>

      {/* ── RIGHT PANEL (Form) ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: "440px" }}>

          {/* Mobile logo */}
          <button
            onClick={() => setPage("home")}
            style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px", background: "none", border: "none", cursor: "pointer" }}
            className="mobile-logo"
          >
            <style>{`.mobile-logo { } @media (min-width: 1024px) { .mobile-logo { display: none !important; } }`}</style>
             <img src="/itech.png" alt="iTech" style={{ height: "44px", width: "auto", objectFit: "contain" }} />

          </button>

          {/* Card */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
            border: "1px solid #E8E0D0",
            padding: "36px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Top accent bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, var(--au-navy), var(--au-red), var(--au-yellow))" }} />

            <h1 className="au-heading" style={{ fontSize: "1.9rem", fontWeight: 900, color: "#1A1A1A", marginBottom: "4px" }}>Welcome back! 👋</h1>
            <p style={{ color: "#999", fontSize: "14px", marginBottom: "28px" }}>Sign in to your student portal</p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

              {/* Email */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#333", marginBottom: "6px" }}>Email Address</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErr(""); }}
                  placeholder="e.g. student@school.edu"
                  style={{
                    width: "100%", padding: "12px 16px", border: "1.5px solid #E0D8CC",
                    borderRadius: "12px", fontSize: "14px", background: "#FAFAF8",
                    outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                    fontFamily: "'Source Sans 3', sans-serif",
                  }}
                  onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                  onBlur={e => e.target.style.borderColor = "#E0D8CC"}
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#333", marginBottom: "6px" }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={show ? "text" : "password"}
                    value={pw}
                    onChange={(e) => { setPw(e.target.value); setErr(""); }}
                    placeholder="Enter your password"
                    style={{
                      width: "100%", padding: "12px 44px 12px 16px", border: "1.5px solid #E0D8CC",
                      borderRadius: "12px", fontSize: "14px", background: "#FAFAF8",
                      outline: "none", boxSizing: "border-box", transition: "border-color 0.2s",
                      fontFamily: "'Source Sans 3', sans-serif",
                    }}
                    onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                    onBlur={e => e.target.style.borderColor = "#E0D8CC"}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "14px" }}
                  >
                    {show ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#777", cursor: "pointer" }}>
                  <input type="checkbox" style={{ accentColor: "var(--au-red)" }} /> Remember me
                </label>
                <button type="button" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "var(--au-navy)", fontWeight: 700 }}>
                  Forgot password?
                </button>
              </div>

              {/* Error */}
              {err && (
                <div style={{ background: "#FFF3F3", border: "1px solid #FFCDD2", borderRadius: "12px", padding: "12px 16px", borderLeft: "4px solid var(--au-red)" }}>
                  <p style={{ color: "var(--au-red)", fontSize: "12px", fontWeight: 600 }}>⚠️ {err}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 800,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  background: loading
                    ? "#C5C5C5"
                    : "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)",
                  color: "#FFFFFF",
                  boxShadow: loading ? "none" : "0 6px 20px rgba(0,0,0,0.2)",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  fontFamily: "'Source Sans 3', sans-serif",
                }}
                onMouseOver={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {loading ? "⏳ Signing in..." : "Sign In →"}
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: "13px", color: "#888", marginTop: "20px" }}>
              Wala pang account?{" "}
              <button
                onClick={() => setPage("register")}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--au-red)", fontWeight: 700, fontSize: "13px" }}
              >
                Register here
              </button>
            </p>
          </div>

          {/* Track without login */}
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={() => setPage("track")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#AAA", transition: "color 0.15s" }}
              onMouseOver={e => e.currentTarget.style.color = "var(--au-navy)"}
              onMouseOut={e => e.currentTarget.style.color = "#AAA"}
            >
              🔍 Track a ticket without signing in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;