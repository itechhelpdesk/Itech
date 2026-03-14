// ForgotPasswordPage.jsx
// Sends a password reset email via Firebase Auth.
// Uses the same CSS variable design system as LoginPage / RegisterPage.

import { useState, useEffect } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../Back_end/Firebase";
import { loadAndApplyTheme } from "../AdminDashboard/AdminPallete";

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
`;

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

const ForgotPasswordPage = ({ setPage }) => {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [sent,    setSent]    = useState(false);

  useEffect(() => { loadAndApplyTheme(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address."); return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError("No account found with that email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait a moment and try again.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── SUCCESS STATE ── */
  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
        <style>{auStyles}</style>
        <div className="w-full max-w-md">
          {/* Logo */}
          <button onClick={() => setPage("home")} className="flex justify-center mx-auto mb-6">
            <img src="/itech.png" alt="iTech" style={{ height: "52px", width: "auto", objectFit: "contain" }} />
          </button>

          <div className="relative p-8 overflow-hidden text-center bg-white border border-gray-100 shadow-xl rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(90deg, var(--au-navy), var(--au-red), var(--au-yellow))" }} />

            {/* Icon */}
            <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 rounded-full"
              style={{ background: "linear-gradient(135deg, var(--au-navy), var(--au-red))" }}>
              <i className="text-3xl text-white fa-solid fa-envelope-circle-check" />
            </div>

            <h2 className="mb-2 text-2xl font-extrabold text-gray-900">Check Your Email</h2>
            <p className="mb-1 text-sm text-gray-500">
              We sent a password reset link to:
            </p>
            <p className="mb-4 text-sm font-bold break-all" style={{ color: "var(--au-navy)" }}>
              {email}
            </p>
            <p className="mb-6 text-xs leading-relaxed text-gray-400">
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </p>

            {/* Resend */}
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="w-full py-3 mb-3 text-sm font-extrabold transition border-2 rounded-xl"
              style={{ borderColor: "var(--au-navy)", color: "var(--au-navy)" }}
            >
              Try a different email
            </button>

            <button
              onClick={() => setPage("login")}
              className="w-full py-3 text-sm font-extrabold text-white transition rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--au-navy), var(--au-red))", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}
            >
              <i className="mr-2 fa-solid fa-arrow-left" /> Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── FORM STATE ── */
  return (
    <div className="flex min-h-screen bg-gray-50">
      <style>{auStyles}</style>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[40%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 70%, var(--au-red-dark) 100%)" }}>
        <DotPattern id="fp-dots" />
        <div className="absolute bottom-0 right-0 translate-x-20 translate-y-20 rounded-full w-72 h-72 opacity-20"
          style={{ background: "var(--au-red)" }} />

        <button onClick={() => setPage("home")} className="relative z-10">
          <img src="/itech.png" alt="iTech" style={{ height: "120px", width: "120px", objectFit: "contain" }} />
        </button>

        <div className="relative z-10">
          <div className="w-12 h-1 mb-6 rounded-full" style={{ background: "var(--au-yellow)" }} />
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">
            Reset Your<br />Password
          </h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Forgot your password? No worries. Enter your registered email and we'll send you a secure reset link right away.
          </p>
          <div className="space-y-3">
            {[
              { icon: "📧", title: "Check Your Inbox",       sub: "Reset link sent instantly" },
              { icon: "🔒", title: "Secure Reset Process",   sub: "Link expires after 1 hour" },
              { icon: "⚡", title: "Quick & Easy",           sub: "Back online in minutes" },
              { icon: "🛡️", title: "Your Data is Safe",     sub: "We never share your info" },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-3 rounded-2xl p-3.5"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{f.title}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© 2026 ITECH. All rights reserved.</p>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex items-center justify-center flex-1 px-6 py-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <button onClick={() => setPage("home")} className="flex mb-6 lg:hidden">
            <img src="/itech.png" alt="iTech" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
          </button>

          <div className="relative p-8 overflow-hidden bg-white border border-gray-100 shadow-xl rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(90deg, var(--au-navy), var(--au-red), var(--au-yellow))" }} />

            {/* Icon header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl shrink-0"
                style={{ background: "linear-gradient(135deg, var(--au-navy), var(--au-red))" }}>
                <i className="text-lg text-white fa-solid fa-key" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold leading-tight text-gray-900">Forgot Password?</h1>
                <p className="text-sm text-gray-400">We'll send a reset link to your email</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <i className="text-sm text-gray-300 fa-solid fa-envelope" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                    placeholder="e.g. student@school.edu"
                    autoFocus
                    className="w-full py-3 pl-10 pr-4 text-sm transition border border-gray-200 rounded-xl bg-gray-50 focus:outline-none"
                    onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  Enter the email address linked to your ORCA account.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl"
                  style={{ background: "#FFF3F3", border: "1px solid #FFCDD2", borderLeft: "4px solid var(--au-red)" }}>
                  <i className="fa-solid fa-circle-exclamation text-xs mt-0.5 shrink-0" style={{ color: "var(--au-red)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--au-red)" }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-extrabold py-3.5 rounded-xl text-sm transition active:scale-95 text-white flex items-center justify-center gap-2"
                style={{
                  background: loading
                    ? "#C5C5C5"
                    : "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)",
                  boxShadow: loading ? "none" : "0 6px 20px rgba(0,0,0,0.2)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? <><i className="fa-solid fa-spinner fa-spin" /> Sending Reset Link...</>
                  : <><i className="fa-solid fa-paper-plane" /> Send Reset Link</>}
              </button>
            </form>
          </div>

          {/* Back to login */}
          <p className="mt-5 text-sm text-center text-gray-500">
            Remembered your password?{" "}
            <button onClick={() => setPage("login")} className="font-bold hover:underline" style={{ color: "var(--au-red)" }}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;