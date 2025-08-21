import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Info, Search, Shield, TriangleAlert } from "lucide-react";

/**
 * How to use this page (quick):
 * 1) Host this single file on any static host (Cloudflare Pages, Netlify, Vercel, OSS static site, Nginx).
 * 2) Replace DATA_MODE="inline" with "remote" and set DATA_URL to your versions.json endpoint.
 * 3) Your CI should overwrite versions.json on each approved release.
 *
 * Minimal versions.json schema (array of records):
 * [
 *   {
 *     "product_code": "PW-SEN-AL7700",
 *     "product_name": "Pacwave PIR Ceiling Sensor",
 *     "hardware_rev": "A2",
 *     "channel": "approved", // or "beta"
 *     "version": "1.4.2",
 *     "released_at": "2025-08-20T09:15:00Z",
 *     "notes": "Improved UART framing; fix delayed IRS."
 *   }
 * ]
 */

const DATA_MODE: "inline" | "remote" = "inline"; // change to "remote" when you have a JSON URL
const DATA_URL = "/versions.json"; // e.g., https://fw.yourdomain.com/versions.json (must allow CORS)

// --- Inline sample data (delete in production) ---
const INLINE_DATA = [
  {
    product_code: "PW-SEN-AL7700",
    product_name: "Pacwave PIR Ceiling Sensor",
    hardware_rev: "A2",
    channel: "approved",
    version: "1.4.2",
    released_at: "2025-08-20T09:15:00Z",
    notes: "Improved UART framing; fix delayed IRS."
  },
  {
    product_code: "PW-SEN-AL7700",
    product_name: "Pacwave PIR Ceiling Sensor",
    hardware_rev: "A2",
    channel: "beta",
    version: "1.5.0-beta.2",
    released_at: "2025-08-21T02:01:00Z",
    notes: "Adds anti-rollback check."
  },
  {
    product_code: "BL652-GW",
    product_name: "Silvair BLE Mesh Gateway",
    hardware_rev: "B1",
    channel: "approved",
    version: "3.2.0",
    released_at: "2025-08-15T18:00:00Z",
    notes: "Gateway stability fixes for 100+ nodes."
  },
  {
    product_code: "AL1039-I-CB",
    product_name: "DALI Controller (Casambi)",
    hardware_rev: "C0",
    channel: "approved",
    version: "2.7.1",
    released_at: "2025-08-10T01:10:00Z",
    notes: "DT8 RGBW mapping safeguard."
  }
];

export default function FirmwareDashboard() {
  const [records, setRecords] = useState(INLINE_DATA);
  const [loading, setLoading] = useState(DATA_MODE === "remote");
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showBeta, setShowBeta] = useState(false);
  const [sortKey, setSortKey] = useState<"product_name" | "product_code" | "version" | "released_at">("product_name");

  useEffect(() => {
    if (DATA_MODE === "remote") {
      setLoading(true);
      fetch(DATA_URL, { cache: "no-store" })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((json) => {
          setRecords(json);
          setError(null);
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    }
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return records
      .filter((r) => (showBeta ? true : r.channel !== "beta"))
      .filter(
        (r) =>
          r.product_name.toLowerCase().includes(needle) ||
          r.product_code.toLowerCase().includes(needle) ||
          (r.hardware_rev || "").toLowerCase().includes(needle)
      )
      .sort((a, b) => {
        if (sortKey === "released_at") {
          return new Date(b.released_at).getTime() - new Date(a.released_at).getTime();
        }
        if (sortKey === "version") {
          // naive semver-ish sort: fallback to string
          return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
        }
        return String(a[sortKey]).localeCompare(String(b[sortKey]));
      });
  }, [records, q, showBeta, sortKey]);

  const lastUpdated = useMemo(() => {
    const latest = records.reduce((acc, r) => (new Date(r.released_at) > new Date(acc) ? r.released_at : acc), "1970-01-01T00:00:00Z");
    return new Date(latest);
  }, [records]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8" /> Latest Approved Firmware
          </h1>
          <div className="text-sm text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Info className="w-4 h-4" />
              {loading ? "Refreshing…" : error ? `Error: ${error}` : `Last updated: ${lastUpdated.toLocaleString()}`}
            </span>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-1 md:col-span-2 flex items-center gap-2 bg-white rounded-2xl shadow p-3">
            <Search className="w-5 h-5" />
            <input
              className="w-full outline-none text-base"
              placeholder="Search product name, code, or HW rev…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between gap-2 bg-white rounded-2xl shadow p-3">
            <label className="text-sm font-medium">Sort by</label>
            <select
              className="rounded-xl border px-3 py-2"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
            >
              <option value="product_name">Product name</option>
              <option value="product_code">Product code</option>
              <option value="released_at">Release date</option>
              <option value="version">Version</option>
            </select>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showBeta} onChange={(e) => setShowBeta(e.target.checked)} /> Show beta
            </label>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <article key={`${r.product_code}-${r.version}-${r.channel}`} className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold leading-tight">{r.product_name}</h2>
                  <div className="text-sm text-gray-600">{r.product_code}{r.hardware_rev ? ` • HW ${r.hardware_rev}` : ""}</div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${
                    r.channel === "approved"
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-amber-50 text-amber-700 border border-amber-200"
                  }`}
                  title={r.channel === "approved" ? "Approved (factory should use this)" : "Beta (for internal/QA)"}
                >
                  {r.channel === "approved" ? <CheckCircle className="w-3 h-3" /> : <TriangleAlert className="w-3 h-3" />}
                  {r.channel === "approved" ? "Approved" : "Beta"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Version</div>
                  <div className="font-mono text-base">{r.version}</div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="text-gray-500">Release date (UTC)</div>
                  <div className="font-mono text-base">{new Date(r.released_at).toISOString().replace(".000Z", "Z")}</div>
                </div>
              </div>

              {r.notes && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <div className="text-gray-500">Notes</div>
                  <div>{r.notes}</div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                SOP: Factory should only flash the latest <b>Approved</b> version for the matching HW rev.
              </div>
            </article>
          ))}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Firmware Dashboard • This page intentionally hosts <b>info only</b> (no binaries)
        </footer>
      </div>
    </div>
  );
}
