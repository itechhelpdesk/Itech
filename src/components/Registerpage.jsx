// RegisterPage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)
// Colors update live when admin changes the palette.

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../Back_end/Firebase";
import { loadAndApplyTheme } from "../AdminDashboard/AdminPallete"; // adjust path as needed

// CSS variable defaults injected as a <style> tag — ensures vars work even before
// Firestore loads (avoids flash of unstyled content)
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

const RegisterPage = ({ setPage }) => {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    yearLevel: "", section: "", address: "", age: "",
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState(false);

  // Load saved palette from Firestore (in case App.jsx hasn't done it yet)
  useEffect(() => { loadAndApplyTheme(); }, []);

  const handle = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      setError("Please fill in all required fields."); return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters."); return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match."); return;
    }

    setLoading(true);
    try {
      const userCred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const user = userCred.user;

      await updateProfile(user, { displayName: form.name });

      await setDoc(doc(db, "students", user.uid), {
        uid:        user.uid,
        name:       form.name,
        email:      form.email,
        yearLevel:  form.yearLevel  || "",
        section:    form.section    || "",
        address:    form.address    || "",
        age:        form.age        || "",
        role:       "student",
        createdAt:  serverTimestamp(),
      });

      setSuccess(true);
      setTimeout(() => setPage("dashboard"), 2000);

    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── SUCCESS STATE ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-10 text-center max-w-md w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 animate-bounce">✅</div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-500 text-sm mb-1">Welcome to ORCA, <strong>{form.name}</strong>!</p>
          <p className="text-gray-400 text-xs mb-6">Redirecting you to your dashboard...</p>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="h-2 rounded-full animate-pulse" style={{ width: "80%", background: "var(--au-red)" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <style>{auStyles}</style>

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex flex-col justify-between w-[40%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 70%, var(--au-red-dark) 100%)" }}>
        <DotPattern id="reg-dots" />
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full opacity-20 translate-x-20 translate-y-20"
          style={{ background: "var(--au-red)" }} />

        <button onClick={() => setPage("home")} className="relative z-10">
          <img src="/itech.png" alt="iTech" style={{ height: "120px", width: "120px", objectFit: "contain" }} />
        </button>

        <div className="relative z-10">
          <div className="w-12 h-1 rounded-full mb-6" style={{ background: "var(--au-yellow)" }} />
          <h2 className="text-white text-4xl font-extrabold leading-tight mb-4">
            Join ITECH<br />Today!
          </h2>
          <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.75)" }}>
            Create your student account and start submitting tickets in minutes. Fast, easy, and secure.
          </p>
          <div className="space-y-3">
            {[
              { icon: "🎫", title: "Submit Tickets Easily",    sub: "No more falling in line" },
              { icon: "📊", title: "Track Your Concerns",      sub: "Real-time updates always" },
              { icon: "🔒", title: "100% Secure & Private",    sub: "Your data is protected" },
              { icon: "⚡", title: "Fast 24-Hour Response",    sub: "We prioritize your needs" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3 rounded-2xl p-3.5"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <span className="text-xl">{f.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{f.title}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{f.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>© 2026 ITECH. All rights reserved.</p>
      </div>

      {/* ── RIGHT PANEL / FORM ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg">

          {/* Mobile Logo */}
          <button onClick={() => setPage("home")} className="flex lg:hidden mb-6">
            <img src="/itech.png" alt="iTech" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
          </button>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(90deg, var(--au-navy), var(--au-red), var(--au-yellow))" }} />

            <h1 className="text-2xl font-extrabold text-gray-900 mb-0.5">Create an Account 📝</h1>
            <p className="text-gray-400 text-sm mb-6">Fill in your details to get started</p>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ── REQUIRED FIELDS ── */}
              <div className="pb-2">
                <p className="text-xs font-extrabold uppercase tracking-widest mb-3" style={{ color: "var(--au-red)" }}>
                  Required Information
                </p>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text" name="name" value={form.name} onChange={handle}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                    style={{ "--tw-ring-color": "var(--au-red)" }}
                    onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email" name="email" value={form.email} onChange={handle}
                    placeholder="e.g. student@school.edu"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                    onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                    onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>

                {/* Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        name="password" value={form.password} onChange={handle}
                        placeholder="Min. 6 characters"
                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                        onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                      />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm">
                        {showPass ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                      Confirm Password <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        name="confirmPassword" value={form.confirmPassword} onChange={handle}
                        placeholder="Re-enter password"
                        className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                        onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                      />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm">
                        {showConfirm ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── OPTIONAL FIELDS ── */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">
                  Optional Information
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Year Level</label>
                    <select
                      name="yearLevel" value={form.yearLevel} onChange={handle}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition text-gray-600"
                      onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    >
                      <option value="">-- Select --</option>
                      <option>1st Year</option>
                      <option>2nd Year</option>
                      <option>3rd Year</option>
                      <option>4th Year</option>
                      <option>5th Year</option>
                      <option>Graduate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Section</label>
                    <input
                      type="text" name="section" value={form.section} onChange={handle}
                      placeholder="e.g. BSCS 3A"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                      onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Age</label>
                    <input
                      type="number" name="age" value={form.age} onChange={handle}
                      placeholder="e.g. 20" min="15" max="60"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                      onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Address</label>
                    <input
                      type="text" name="address" value={form.address} onChange={handle}
                      placeholder="e.g. Quezon City"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition"
                      onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                      onBlur={e => e.target.style.borderColor = "#e5e7eb"}
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl px-4 py-3" style={{ background: "#FFF3F3", border: "1px solid #FFCDD2", borderLeft: "4px solid var(--au-red)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--au-red)" }}>⚠️ {error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                className="w-full font-extrabold py-3.5 rounded-xl text-sm transition active:scale-95 text-white"
                style={{
                  background: loading
                    ? "#C5C5C5"
                    : "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)",
                  boxShadow: loading ? "none" : "0 6px 20px rgba(0,0,0,0.2)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "⏳ Creating your account..." : "Create Account →"}
              </button>

              {/* Password strength */}
              {form.password.length > 0 && (
                <div className="flex gap-1.5 items-center">
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 6 ? "bg-green-400" : "bg-red-300"}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 8 ? "bg-green-400" : "bg-gray-200"}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 10 ? "bg-green-400" : "bg-gray-200"}`} />
                  <span className="text-xs text-gray-400 ml-1">
                    {form.password.length < 6 ? "Too short" : form.password.length < 8 ? "Fair" : form.password.length < 10 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </form>
          </div>

          {/* Sign in link */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <button onClick={() => setPage("login")} className="font-bold hover:underline" style={{ color: "var(--au-red)" }}>
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;