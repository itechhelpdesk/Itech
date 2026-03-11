// AdminPalette.jsx
// Dynamic Color Theme Manager — Admin sets colors for the entire app.
// Saves to: settings/config/theme (Firestore)
// Applies:  document.documentElement CSS variables (--au-red, --au-navy, etc.)
//
// HOW TO USE IN AdminDashboard.jsx:
//   1. import AdminPalette from "./AdminPalette";
//   2. Add "Palette" to your nav tabs
//   3. Render <AdminPalette /> in the tab content
//   4. On app load, call loadAndApplyTheme() from this file to restore saved colors
//      export { loadAndApplyTheme } and call it in your main useEffect

import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../Back_end/Firebase";

/* ══════════════════════════════════════════════
   THEME DOCUMENT PATH
══════════════════════════════════════════════ */
const THEME_DOC = doc(db, "settings", "theme");

/* ══════════════════════════════════════════════
   DEFAULT PALETTE — Arellano University Official
══════════════════════════════════════════════ */
const AU_DEFAULT = {
  "--au-red":        "#DA291C",
  "--au-red-dark":   "#B52217",
  "--au-navy":       "#1B3A6B",
  "--au-navy-dark":  "#122850",
  "--au-yellow":     "#F5D000",
  "--au-gold":       "#F0C040",
};

/* ══════════════════════════════════════════════
   PRESET PALETTES
══════════════════════════════════════════════ */
const PRESETS = [
  {
    id: "arellano",
    name: "Arellano University",
    desc: "Official AU colors",
    emoji: "🎓",
    colors: { ...AU_DEFAULT },
  },
  {
    id: "midnight",
    name: "Midnight Blue",
    desc: "Deep professional look",
    emoji: "🌙",
    colors: {
      "--au-red":       "#4F8EF7",
      "--au-red-dark":  "#2563EB",
      "--au-navy":      "#0F172A",
      "--au-navy-dark": "#020617",
      "--au-yellow":    "#38BDF8",
      "--au-gold":      "#0EA5E9",
    },
  },
  {
    id: "emerald",
    name: "Emerald Campus",
    desc: "Fresh green tones",
    emoji: "🌿",
    colors: {
      "--au-red":       "#10B981",
      "--au-red-dark":  "#059669",
      "--au-navy":      "#064E3B",
      "--au-navy-dark": "#022C22",
      "--au-yellow":    "#FCD34D",
      "--au-gold":      "#F59E0B",
    },
  },
  {
    id: "royal",
    name: "Royal Purple",
    desc: "Bold academic purple",
    emoji: "👑",
    colors: {
      "--au-red":       "#7C3AED",
      "--au-red-dark":  "#6D28D9",
      "--au-navy":      "#2E1065",
      "--au-navy-dark": "#1E0A4A",
      "--au-yellow":    "#FDE68A",
      "--au-gold":      "#F59E0B",
    },
  },
  {
    id: "sunset",
    name: "Sunset Campus",
    desc: "Warm orange energy",
    emoji: "🌅",
    colors: {
      "--au-red":       "#F97316",
      "--au-red-dark":  "#EA580C",
      "--au-navy":      "#7C2D12",
      "--au-navy-dark": "#431407",
      "--au-yellow":    "#FEF08A",
      "--au-gold":      "#FDE047",
    },
  },
  {
    id: "monochrome",
    name: "Monochrome",
    desc: "Clean grayscale",
    emoji: "⚫",
    colors: {
      "--au-red":       "#374151",
      "--au-red-dark":  "#1F2937",
      "--au-navy":      "#111827",
      "--au-navy-dark": "#030712",
      "--au-yellow":    "#D1D5DB",
      "--au-gold":      "#9CA3AF",
    },
  },
];

/* ══════════════════════════════════════════════
   APPLY THEME TO DOM
   Call this anywhere to update CSS variables live
══════════════════════════════════════════════ */
export const applyThemeToDom = (colors) => {
  const root = document.documentElement;
  Object.entries(colors).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
};

/* ══════════════════════════════════════════════
   LOAD & APPLY FROM FIRESTORE (call on app boot)
══════════════════════════════════════════════ */
export const loadAndApplyTheme = async () => {
  try {
    const snap = await getDoc(THEME_DOC);
    if (snap.exists() && snap.data().colors) {
      applyThemeToDom(snap.data().colors);
    }
  } catch (e) {
    console.warn("Theme load failed:", e);
  }
};

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};
const luminance = (hex) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};
const textOn = (bg) => (luminance(bg) > 0.5 ? "#111827" : "#ffffff");

/* ══════════════════════════════════════════════
   COLOR SLOT CONFIG — labels & descriptions
══════════════════════════════════════════════ */
const COLOR_SLOTS = [
  {
    group: "Primary Action",
    slots: [
      { key: "--au-red",      label: "Primary / Action",  desc: "Buttons, active nav, tags" },
      { key: "--au-red-dark", label: "Primary Dark",      desc: "Button hover, shadows" },
    ],
  },
  {
    group: "Background & Sidebar",
    slots: [
      { key: "--au-navy",      label: "Sidebar / Header", desc: "Main sidebar background" },
      { key: "--au-navy-dark", label: "Sidebar Dark",     desc: "Deeper sidebar shade" },
    ],
  },
  {
    group: "Accent & Highlights",
    slots: [
      { key: "--au-yellow", label: "Accent / Text",    desc: "Icon colors, highlights" },
      { key: "--au-gold",   label: "Border / Divider", desc: "Header border, decorative lines" },
    ],
  },
];

/* ══════════════════════════════════════════════
   LIVE PREVIEW COMPONENT
══════════════════════════════════════════════ */
const LivePreview = ({ colors }) => {
  const red       = colors["--au-red"]       || AU_DEFAULT["--au-red"];
  const redDark   = colors["--au-red-dark"]  || AU_DEFAULT["--au-red-dark"];
  const navy      = colors["--au-navy"]      || AU_DEFAULT["--au-navy"];
  const navyDark  = colors["--au-navy-dark"] || AU_DEFAULT["--au-navy-dark"];
  const yellow    = colors["--au-yellow"]    || AU_DEFAULT["--au-yellow"];
  const gold      = colors["--au-gold"]      || AU_DEFAULT["--au-gold"];

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-md" style={{ fontSize: 11 }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ background: navy, borderBottom: `2px solid ${gold}` }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-black" style={{ background: red, color: "#fff" }}>A</div>
          <span className="font-bold text-[11px]" style={{ color: yellow }}>ORCA Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 8 }}>🔔</span>
          </div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: red, color: "#fff" }}>SA</div>
        </div>
      </div>

      <div className="flex" style={{ height: 120 }}>
        {/* Sidebar */}
        <div className="flex flex-col gap-0.5 p-1.5 shrink-0" style={{ background: navyDark, width: 72 }}>
          {/* Active nav item */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md" style={{ background: red }}>
            <span style={{ color: "#fff", fontSize: 7 }}>🎫</span>
            <span className="font-semibold" style={{ color: "#fff", fontSize: 9 }}>Tickets</span>
          </div>
          {/* Inactive items */}
          {["📊 Dashboard", "🔧 Maintain", "🎨 Palette"].map((item) => (
            <div key={item} className="flex items-center gap-1.5 px-2 py-1 rounded-md" style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>
              {item}
            </div>
          ))}
          {/* Yellow accent */}
          <div className="mt-auto flex items-center gap-1 px-1.5 py-1 rounded-md" style={{ background: `${red}22` }}>
            <span style={{ color: yellow, fontSize: 7 }}>⭐</span>
            <span style={{ color: yellow, fontSize: 8 }}>Super</span>
          </div>
        </div>

        {/* Main content preview */}
        <div className="flex-1 p-2 space-y-1.5" style={{ background: "#f0f2f5" }}>
          {/* Stat cards */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { label: "Open", val: "12", color: navy },
              { label: "Pending", val: "5", color: red },
              { label: "Resolved", val: "28", color: "#16a34a" },
            ].map((s) => (
              <div key={s.label} className="rounded-md p-1.5 text-center" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
                <p className="font-black" style={{ color: s.color, fontSize: 12 }}>{s.val}</p>
                <p style={{ color: "#6b7280", fontSize: 8 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex gap-1">
            <div className="px-2 py-1 rounded-md text-[8px] font-bold" style={{ background: red, color: textOn(red) }}>
              Primary Btn
            </div>
            <div className="px-2 py-1 rounded-md text-[8px] font-bold" style={{ background: navy, color: textOn(navy) }}>
              Navy Btn
            </div>
            <div className="px-2 py-1 rounded-md text-[8px] font-bold border" style={{ background: `${yellow}33`, color: navy, borderColor: gold }}>
              Accent
            </div>
          </div>

          {/* Mock ticket row */}
          <div className="rounded-md px-2 py-1.5 flex items-center gap-2" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
            <span className="font-mono font-bold text-[8px]" style={{ color: navy }}>#TKT-001</span>
            <span className="flex-1 text-[8px] text-gray-500 truncate">Cannot login to portal</span>
            <span className="px-1.5 py-0.5 rounded text-[7px] font-bold" style={{ background: `${red}18`, color: red }}>Urgent</span>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-3 py-1 flex items-center gap-2" style={{ background: navy }}>
        <div className="h-1 flex-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
          <div className="h-full rounded-full w-2/3" style={{ background: `linear-gradient(90deg, ${red}, ${gold})` }} />
        </div>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8 }}>Preview</span>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════
   MAIN — AdminPalette
══════════════════════════════════════════════ */
const AdminPalette = () => {
  const [colors,       setColors]       = useState({ ...AU_DEFAULT });
  const [savedColors,  setSavedColors]  = useState({ ...AU_DEFAULT });
  const [activePreset, setActivePreset] = useState("arellano");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [resetConfirm, setResetConfirm] = useState(false);

  /* Load saved theme on mount */
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(THEME_DOC);
        if (snap.exists() && snap.data().colors) {
          const saved = snap.data().colors;
          setColors(saved);
          setSavedColors(saved);
          applyThemeToDom(saved);
          // detect if it matches a preset
          const match = PRESETS.find(p =>
            Object.entries(p.colors).every(([k, v]) => saved[k] === v)
          );
          setActivePreset(match?.id || "custom");
        }
      } catch (e) { console.warn("Load theme:", e); }
      setLoading(false);
    })();
  }, []);

  /* Apply to DOM live as user changes */
  useEffect(() => {
    applyThemeToDom(colors);
  }, [colors]);

  const handleColorChange = (key, val) => {
    setColors(prev => ({ ...prev, [key]: val }));
    setActivePreset("custom");
  };

  const applyPreset = (preset) => {
    setColors({ ...preset.colors });
    setActivePreset(preset.id);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(THEME_DOC, {
        colors,
        updatedAt:  serverTimestamp(),
        appliedBy:  "admin",
      });
      setSavedColors({ ...colors });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error("Save theme:", e); }
    setSaving(false);
  };

  const handleReset = () => {
    setColors({ ...AU_DEFAULT });
    setActivePreset("arellano");
    setResetConfirm(false);
  };

  const hasUnsaved = JSON.stringify(colors) !== JSON.stringify(savedColors);
  const isDefault  = JSON.stringify(colors) === JSON.stringify(AU_DEFAULT);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="fa-solid fa-spinner fa-spin text-blue-400 text-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i className="fa-solid fa-palette" style={{ color: "var(--au-red)" }} />
            Theme & Color Palette
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Customize the app colors. Changes apply live across the entire interface.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsaved && (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-lg font-medium flex items-center gap-1">
              <i className="fa-solid fa-circle text-[6px]" /> Unsaved changes
            </span>
          )}
          {!isDefault && (
            <button
              onClick={() => setResetConfirm(true)}
              className="px-3 py-2 text-xs font-medium border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition flex items-center gap-1.5"
            >
              <i className="fa-solid fa-rotate-left" /> Reset Default
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasUnsaved}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            style={{ background: saved ? "#16a34a" : "var(--au-red)" }}
          >
            {saving ? (
              <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
            ) : saved ? (
              <><i className="fa-solid fa-circle-check" /> Saved!</>
            ) : (
              <><i className="fa-solid fa-floppy-disk" /> Save Theme</>
            )}
          </button>
        </div>
      </div>

      {/* ── Reset Confirm ── */}
      {resetConfirm && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-orange-700">
            <i className="fa-solid fa-triangle-exclamation" />
            <span>Reset to Arellano University default colors?</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition">Yes, Reset</button>
            <button onClick={() => setResetConfirm(false)} className="px-3 py-1.5 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-white transition">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* ── LEFT: Controls (3/5) ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Preset Palettes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-swatchbook" style={{ color: "var(--au-navy)" }} />
              Quick Presets
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PRESETS.map(preset => {
                const isActive = activePreset === preset.id;
                const primaryColor = preset.colors["--au-red"];
                const navyColor    = preset.colors["--au-navy"];
                const accentColor  = preset.colors["--au-yellow"];
                return (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    className={`relative p-3 rounded-xl border-2 transition text-left group ${
                      isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <i className="fa-solid fa-check text-white" style={{ fontSize: 7 }} />
                      </span>
                    )}
                    {/* Color swatches */}
                    <div className="flex gap-1 mb-2">
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: primaryColor }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: navyColor }} />
                      <div className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0" style={{ background: accentColor }} />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{preset.emoji} {preset.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{preset.desc}</p>
                  </button>
                );
              })}
              {/* Custom tag */}
              {activePreset === "custom" && (
                <div className="p-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col justify-center items-center text-center">
                  <i className="fa-solid fa-pen-nib text-purple-400 text-sm mb-1" />
                  <p className="text-xs font-semibold text-purple-600">Custom</p>
                  <p className="text-[10px] text-purple-400 mt-0.5">Your mix</p>
                </div>
              )}
            </div>
          </div>

          {/* Color Pickers */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <i className="fa-solid fa-eyedropper" style={{ color: "var(--au-red)" }} />
              Custom Colors
            </h3>
            <div className="space-y-5">
              {COLOR_SLOTS.map((group) => (
                <div key={group.group}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">{group.group}</p>
                  <div className="space-y-2">
                    {group.slots.map(({ key, label, desc }) => {
                      const current = colors[key] || "#000000";
                      return (
                        <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition">
                          {/* Color picker */}
                          <div className="relative shrink-0">
                            <div
                              className="w-10 h-10 rounded-xl border-2 border-white shadow-md cursor-pointer overflow-hidden"
                              style={{ background: current }}
                            >
                              <input
                                type="color"
                                value={current}
                                onChange={e => handleColorChange(key, e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                title={`Pick ${label} color`}
                              />
                            </div>
                            {/* Checkered pattern for transparency reference */}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800">{label}</p>
                            <p className="text-[10px] text-gray-400">{desc}</p>
                          </div>

                          {/* Hex input */}
                          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                            <span className="text-gray-300 text-xs font-mono">#</span>
                            <input
                              type="text"
                              value={current.replace("#", "").toUpperCase()}
                              onChange={e => {
                                const raw = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
                                if (raw.length === 6) handleColorChange(key, `#${raw}`);
                              }}
                              className="w-14 text-xs font-mono text-gray-700 outline-none bg-transparent uppercase"
                              placeholder="DA291C"
                              maxLength={6}
                            />
                          </div>

                          {/* Text contrast preview */}
                          <div
                            className="shrink-0 px-2 py-1 rounded-md text-[9px] font-bold"
                            style={{ background: current, color: textOn(current) }}
                          >
                            Aa
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Preview (2/5) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Live Preview */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sticky top-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <i className="fa-solid fa-eye" style={{ color: "var(--au-navy)" }} />
              Live Preview
              <span className="ml-auto text-[10px] text-green-500 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Live
              </span>
            </h3>
            <LivePreview colors={colors} />

            {/* Color summary */}
            <div className="mt-4 grid grid-cols-3 gap-1.5">
              {[
                { key: "--au-red",   label: "Primary" },
                { key: "--au-navy",  label: "Sidebar" },
                { key: "--au-yellow",label: "Accent"  },
              ].map(({ key, label }) => (
                <div key={key} className="text-center">
                  <div
                    className="w-full h-6 rounded-md mb-1 border border-white shadow-sm"
                    style={{ background: colors[key] || "#ccc" }}
                  />
                  <p className="text-[9px] text-gray-400">{label}</p>
                  <p className="text-[9px] font-mono text-gray-600">{(colors[key] || "").toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* How it works info card */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
              <i className="fa-solid fa-circle-info" /> How It Works
            </p>
            <ul className="space-y-1.5 text-[11px] text-blue-600">
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check-circle mt-0.5 shrink-0" />
                Changes preview <strong>live</strong> before saving
              </li>
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check-circle mt-0.5 shrink-0" />
                Saved to Firestore — persists across sessions
              </li>
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check-circle mt-0.5 shrink-0" />
                Applies to <strong>all admin & student</strong> views
              </li>
              <li className="flex items-start gap-1.5">
                <i className="fa-solid fa-check-circle mt-0.5 shrink-0" />
                Reset anytime to Arellano default
              </li>
            </ul>
          </div>

          {/* Current active preset tag */}
          <div className="border border-gray-200 rounded-xl p-3 bg-white flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: `${colors["--au-red"]}18` }}>
              {PRESETS.find(p => p.id === activePreset)?.emoji || "🎨"}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700">
                {activePreset === "custom"
                  ? "Custom Palette"
                  : PRESETS.find(p => p.id === activePreset)?.name || "Unknown"}
              </p>
              <p className="text-[10px] text-gray-400">Currently active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPalette;