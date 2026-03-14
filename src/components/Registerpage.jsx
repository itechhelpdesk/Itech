// RegisterPage.jsx
// Uses CSS variables set by AdminPalette (--au-red, --au-navy, --au-yellow, --au-gold)
// Year Level options are fetched dynamically from Firestore: settings/config/yearLevels

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDocs, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../Back_end/Firebase";
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

const FALLBACK_YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"];

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

  // ── Year Levels from Firestore ──
  const [yearLevels,    setYearLevels]    = useState([]);
  const [loadingYls,    setLoadingYls]    = useState(true);

  useEffect(() => {
    loadAndApplyTheme();

    // Fetch year levels
    getDocs(collection(db, "settings/config/yearLevels"))
      .then(snap => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(y => y.enabled !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        setYearLevels(data);
      })
      .catch(console.error)
      .finally(() => setLoadingYls(false));
  }, []);

  // Use DB list if available, otherwise hardcoded fallback
  const yearLevelOptions = yearLevels.length > 0
    ? yearLevels.map(y => y.name)
    : FALLBACK_YEAR_LEVELS;

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

  const inputStyle = {
    onFocus: e => e.target.style.borderColor = "var(--au-navy)",
    onBlur:  e => e.target.style.borderColor = "#e5e7eb",
  };
  const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none transition";

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 bg-gray-50">
        <div className="w-full max-w-md p-10 text-center bg-white border border-gray-100 shadow-xl rounded-3xl">
          <div className="flex items-center justify-center w-20 h-20 mx-auto mb-5 text-4xl bg-green-100 rounded-full animate-bounce">✅</div>
          <h2 className="mb-2 text-2xl font-extrabold text-gray-900">Registration Successful!</h2>
          <p className="mb-1 text-sm text-gray-500">Welcome to ORCA, <strong>{form.name}</strong>!</p>
          <p className="mb-6 text-xs text-gray-400">Redirecting you to your dashboard...</p>
          <div className="w-full h-2 bg-gray-100 rounded-full">
            <div className="h-2 rounded-full animate-pulse" style={{ width: "80%", background: "var(--au-red)" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <style>{auStyles}</style>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-[40%] p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 70%, var(--au-red-dark) 100%)" }}>
        <DotPattern id="reg-dots" />
        <div className="absolute bottom-0 right-0 translate-x-20 translate-y-20 rounded-full w-72 h-72 opacity-20"
          style={{ background: "var(--au-red)" }} />
        <button onClick={() => setPage("home")} className="relative z-10">
          <img src="/itech.png" alt="iTech" style={{ height: "120px", width: "120px", objectFit: "contain" }} />
        </button>
        <div className="relative z-10">
          <div className="w-12 h-1 mb-6 rounded-full" style={{ background: "var(--au-yellow)" }} />
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-white">Join ITECH<br />Today!</h2>
          <p className="mb-8 text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
            Create your student account and start submitting tickets in minutes. Fast, easy, and secure.
          </p>
          <div className="space-y-3">
            {[
              { icon: "🎫", title: "Submit Tickets Easily",   sub: "No more falling in line" },
              { icon: "📊", title: "Track Your Concerns",     sub: "Real-time updates always" },
              { icon: "🔒", title: "100% Secure & Private",   sub: "Your data is protected" },
              { icon: "⚡", title: "Fast 24-Hour Response",   sub: "We prioritize your needs" },
            ].map(f => (
              <div key={f.title} className="flex items-center gap-3 p-3.5 rounded-2xl"
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
      <div className="flex items-center justify-center flex-1 px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg">
          <button onClick={() => setPage("home")} className="flex mb-6 lg:hidden">
            <img src="/itech.png" alt="iTech" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
          </button>

          <div className="relative p-8 overflow-hidden bg-white border border-gray-100 shadow-xl rounded-3xl">
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ background: "linear-gradient(90deg, var(--au-navy), var(--au-red), var(--au-yellow))" }} />

            <h1 className="mb-0.5 text-2xl font-extrabold text-gray-900">Create an Account 📝</h1>
            <p className="mb-6 text-sm text-gray-400">Fill in your details to get started</p>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Required fields */}
              <div className="pb-2">
                <p className="mb-3 text-xs font-extrabold tracking-widest uppercase" style={{ color: "var(--au-red)" }}>
                  Required Information
                </p>

                <div className="mb-3">
                  <label className="block mb-1.5 text-sm font-bold text-gray-700">Full Name <span className="text-red-400">*</span></label>
                  <input type="text" name="name" value={form.name} onChange={handle} placeholder="e.g. Juan Dela Cruz" className={inputCls} {...inputStyle} />
                </div>

                <div className="mb-3">
                  <label className="block mb-1.5 text-sm font-bold text-gray-700">Email Address <span className="text-red-400">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handle} placeholder="e.g. student@school.edu" className={inputCls} {...inputStyle} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} name="password" value={form.password} onChange={handle}
                        placeholder="Min. 6 characters" className={`${inputCls} pr-10`} {...inputStyle} />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute text-sm text-gray-300 -translate-y-1/2 right-3 top-1/2 hover:text-gray-500">
                        {showPass ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">Confirm Password <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <input type={showConfirm ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={handle}
                        placeholder="Re-enter password" className={`${inputCls} pr-10`} {...inputStyle} />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute text-sm text-gray-300 -translate-y-1/2 right-3 top-1/2 hover:text-gray-500">
                        {showConfirm ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional fields */}
              <div className="pt-4 border-t border-gray-100">
                <p className="mb-3 text-xs font-extrabold tracking-widest text-gray-400 uppercase">Optional Information</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* ✅ Year Level — dynamic from Firestore */}
                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">
                      Year Level
                      {loadingYls && <i className="fa-solid fa-spinner fa-spin text-gray-300 ml-1 text-[10px]" />}
                    </label>
                    <select name="yearLevel" value={form.yearLevel} onChange={handle}
                      disabled={loadingYls}
                      className={`${inputCls} text-gray-600`}
                      onFocus={e => e.target.style.borderColor = "var(--au-navy)"}
                      onBlur={e => e.target.style.borderColor = "#e5e7eb"}>
                      {loadingYls ? (
                        <option value="">Loading...</option>
                      ) : (
                        <>
                          <option value="">-- Select --</option>
                          {yearLevelOptions.map(yl => (
                            <option key={yl} value={yl}>{yl}</option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">Section</label>
                    <input type="text" name="section" value={form.section} onChange={handle}
                      placeholder="e.g. BSCS 3A" className={inputCls} {...inputStyle} />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">Age</label>
                    <input type="number" name="age" value={form.age} onChange={handle}
                      placeholder="e.g. 20" min="15" max="60" className={inputCls} {...inputStyle} />
                  </div>

                  <div>
                    <label className="block mb-1.5 text-sm font-bold text-gray-700">Address</label>
                    <input type="text" name="address" value={form.address} onChange={handle}
                      placeholder="e.g. Quezon City" className={inputCls} {...inputStyle} />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-4 py-3 rounded-xl" style={{ background: "#FFF3F3", border: "1px solid #FFCDD2", borderLeft: "4px solid var(--au-red)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--au-red)" }}>⚠️ {error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full font-extrabold py-3.5 rounded-xl text-sm transition active:scale-95 text-white"
                style={{
                  background: loading ? "#C5C5C5" : "linear-gradient(135deg, var(--au-navy) 0%, var(--au-red) 100%)",
                  boxShadow: loading ? "none" : "0 6px 20px rgba(0,0,0,0.2)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}>
                {loading ? "⏳ Creating your account..." : "Create Account →"}
              </button>

              {/* Password strength */}
              {form.password.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 6 ? "bg-green-400" : "bg-red-300"}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 8 ? "bg-green-400" : "bg-gray-200"}`} />
                  <div className={`h-1.5 flex-1 rounded-full transition-all ${form.password.length >= 10 ? "bg-green-400" : "bg-gray-200"}`} />
                  <span className="ml-1 text-xs text-gray-400">
                    {form.password.length < 6 ? "Too short" : form.password.length < 8 ? "Fair" : form.password.length < 10 ? "Good" : "Strong"}
                  </span>
                </div>
              )}
            </form>
          </div>

          <p className="mt-5 text-sm text-center text-gray-500">
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