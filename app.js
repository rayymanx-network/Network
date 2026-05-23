// ─── React hooks from global (loaded via CDN) ────────────────────────────────
const { useState, useRef, useCallback, useEffect } = React;

// ─── Data constants ───────────────────────────────────────────────────────────
const DEVICE_TYPES = {
  core_switch:     { label: "Core Switch",         icon: "⬡", color: "#00d4ff" },
  dist_switch:     { label: "Distribution Switch", icon: "⬡", color: "#7c3aed" },
  access_switch:   { label: "Access Switch",       icon: "⬡", color: "#059669" },
  router:          { label: "Router",              icon: "◈", color: "#f59e0b" },
  firewall:        { label: "Firewall",            icon: "⛨", color: "#ef4444" },
  patch_panel:     { label: "Copper Patch Panel",  icon: "▦", color: "#6b7280" },
  fiber_panel:     { label: "Fiber Patch Panel",   icon: "◈", color: "#f97316" },
  fiber_tray:      { label: "Fiber Tray / ODF",    icon: "⟐", color: "#fb923c" },
  media_converter: { label: "Media Converter",     icon: "⇄", color: "#a3e635" },
  server:          { label: "Server",              icon: "▣", color: "#3b82f6" },
  wireless_ap:     { label: "Wireless AP",         icon: "◎", color: "#ec4899" },
  ups:             { label: "UPS",                 icon: "⚡", color: "#eab308" },
  isp_circuit:     { label: "ISP Circuit",         icon: "☁", color: "#94a3b8" },
};

const FIBER_DEVICES  = new Set(["fiber_panel", "fiber_tray", "media_converter"]);
const SWITCH_DEVICES = new Set(["core_switch", "dist_switch", "access_switch", "patch_panel"]);

const SERVICE_TYPES    = ["Data", "Voice (VoIP)", "Management", "Storage", "Guest WiFi", "Security/Camera", "Building Automation", "Out-of-Band"];
const PORT_SPEEDS      = ["10/100", "1G", "10G", "25G", "40G", "100G"];
const LINK_TYPES       = ["Copper RJ45", "Fiber SMF", "Fiber MMF", "DAC Twinax", "AOC"];
const FIBER_CONNECTORS = ["LC Duplex", "SC Duplex", "ST", "MPO-12", "MPO-24", "LC Simplex", "SC Simplex"];

const VLAN_DEFAULTS = [
  { id: 1,  name: "Default",    color: "#6b7280" },
  { id: 10, name: "Data",       color: "#3b82f6" },
  { id: 20, name: "Voice",      color: "#059669" },
  { id: 30, name: "Management", color: "#f59e0b" },
  { id: 40, name: "Guest",      color: "#ec4899" },
];

const LINK_SPEED_COLOR = {
  "10/100": "#64748b",
  "1G":     "#22d3ee",
  "10G":    "#a78bfa",
  "25G":    "#f472b6",
  "40G":    "#fb923c",
  "100G":   "#4ade80",
};

const FIBER_COLOR = "#f97316";
const NODE_W = 130;
const NODE_H = 82;

let nextId = 1;
const uid = () => `n${nextId++}`;

// ─── BFS shortest-path finder ─────────────────────────────────────────────────
function findAllPaths(devices, links, fromId, toId) {
  if (!fromId || !toId || fromId === toId) return [];

  const adj = {};
  devices.forEach(d => { adj[d.id] = []; });
  links.forEach(l => {
    if (adj[l.from] && adj[l.to]) {
      adj[l.from].push({ node: l.to,   link: l });
      adj[l.to].push(  { node: l.from, link: l });
    }
  });

  const queue   = [{ nodes: [fromId], links: [] }];
  const results = [];
  const visited = new Set();

  while (queue.length) {
    const { nodes, links: pathLinks } = queue.shift();
    const cur = nodes[nodes.length - 1];

    if (cur === toId) {
      results.push({ nodes, links: pathLinks });
      if (results.length >= 3) break;
      continue;
    }

    const key = cur + ":" + nodes.length;
    if (visited.has(key)) continue;
    visited.add(key);

    (adj[cur] || []).forEach(({ node, link }) => {
      if (!nodes.includes(node)) {
        queue.push({ nodes: [...nodes, node], links: [...pathLinks, link] });
      }
    });
  }
  return results;
}

// ─── SVG device icons ─────────────────────────────────────────────────────────
function DeviceIcon({ type, size = 40, color }) {
  const cfg = DEVICE_TYPES[type] || DEVICE_TYPES.server;
  const c   = color || cfg.color;

  if (type === "wireless_ap") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="17" fill="none" stroke={c} strokeWidth="1.5" opacity="0.25" />
      <circle cx="20" cy="20" r="11" fill="none" stroke={c} strokeWidth="1.5" opacity="0.5" />
      <circle cx="20" cy="20" r="5"  fill={c} />
      <circle cx="20" cy="20" r="1.5" fill="#0f172a" />
    </svg>
  );

  if (type === "router") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <polygon points="20,3 37,30 3,30" fill="none" stroke={c} strokeWidth="2" />
      <circle cx="20" cy="19" r="5" fill={c} />
    </svg>
  );

  if (type === "firewall") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d="M20 2 L36 10 L36 22 C36 30 28 37 20 38 C12 37 4 30 4 22 L4 10 Z" fill="none" stroke={c} strokeWidth="2" />
      <text x="20" y="25" textAnchor="middle" fill={c} fontSize="13">⛨</text>
    </svg>
  );

  if (SWITCH_DEVICES.has(type)) return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="2" y="11" width="36" height="18" rx="3" fill="none" stroke={c} strokeWidth="2" />
      {[8, 14, 20, 26, 32].map((x, i) => (
        <rect key={i} x={x - 2} y="17" width="4" height="7" rx="1" fill={c} opacity={i < 4 ? 1 : 0.3} />
      ))}
      <circle cx="33" cy="14" r="2" fill={c} opacity="0.5" />
      <circle cx="33" cy="26" r="2" fill="#059669" />
    </svg>
  );

  if (type === "fiber_panel") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="2" y="10" width="36" height="20" rx="3" fill="none" stroke={c} strokeWidth="2" />
      {[7, 13, 19, 25, 31].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="17" r="2.5" fill="none" stroke={c} strokeWidth="1.5" />
          <circle cx={x} cy="23" r="2.5" fill="none" stroke={c} strokeWidth="1.5" />
          <line x1={x} y1="17" x2={x} y2="10" stroke={c} strokeWidth="1" opacity="0.4" />
        </g>
      ))}
    </svg>
  );

  if (type === "fiber_tray") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="3" y="8" width="34" height="24" rx="4" fill="none" stroke={c} strokeWidth="2" />
      <path d="M8 20 Q14 12 20 20 Q26 28 32 20" fill="none" stroke={c} strokeWidth="2" />
      <circle cx="8"  cy="20" r="2.5" fill={c} />
      <circle cx="32" cy="20" r="2.5" fill={c} />
      <rect x="17" y="27" width="6" height="3" rx="1" fill={c} opacity="0.5" />
    </svg>
  );

  if (type === "media_converter") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="4" y="8" width="32" height="24" rx="4" fill="none" stroke={c} strokeWidth="2" />
      <line x1="4" y1="20" x2="36" y2="20" stroke={c} strokeWidth="0.5" opacity="0.3" />
      <text x="20" y="16" textAnchor="middle" fill={c} fontSize="8" fontFamily="monospace">Cu</text>
      <text x="20" y="28" textAnchor="middle" fill={c} fontSize="8" fontFamily="monospace">Fo</text>
      <path d="M14 20 L20 14 L26 20 L20 26 Z" fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );

  if (type === "server") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="6" y="4"  width="28" height="9" rx="2" fill="none" stroke={c} strokeWidth="2" />
      <rect x="6" y="15" width="28" height="9" rx="2" fill="none" stroke={c} strokeWidth="2" />
      <rect x="6" y="27" width="28" height="7" rx="2" fill="none" stroke={c} strokeWidth="1.5" opacity="0.5" />
      <circle cx="29" cy="8.5"  r="2" fill={c} />
      <circle cx="29" cy="19.5" r="2" fill="#059669" />
    </svg>
  );

  if (type === "isp_circuit") return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d="M8 24 Q6 16 12 14 Q10 6 18 8 Q20 4 26 6 Q32 4 34 10 Q40 10 38 18 Q42 22 36 24 Z"
            fill="none" stroke={c} strokeWidth="2" />
      <line x1="20" y1="24" x2="20" y2="33" stroke={c} strokeWidth="2" />
      <circle cx="20" cy="35" r="2" fill={c} />
    </svg>
  );

  // generic fallback
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <rect x="4" y="4" width="32" height="32" rx="4" fill="none" stroke={c} strokeWidth="2" />
      <text x="20" y="26" textAnchor="middle" fill={c} fontSize="18">{cfg.icon}</text>
    </svg>
  );
}

// ─── Device Form ──────────────────────────────────────────────────────────────
function DeviceForm({ onAdd }) {
  const [type,          setType]          = useState("access_switch");
  const [name,          setName]          = useState("");
  const [location,      setLocation]      = useState("");
  const [ports,         setPorts]         = useState("24");
  const [portSpeed,     setPortSpeed]     = useState("1G");
  const [uplinkPorts,   setUplinkPorts]   = useState("2");
  const [uplinkSpeed,   setUplinkSpeed]   = useState("10G");
  const [fiberPorts,    setFiberPorts]    = useState("12");
  const [fiberConn,     setFiberConn]     = useState("LC Duplex");
  const [services,      setServices]      = useState([]);
  const [vlans,         setVlans]         = useState([]);
  const [mgmtIP,        setMgmtIP]        = useState("");
  const [notes,         setNotes]         = useState("");

  const toggle = (arr, setArr, v) =>
    setArr(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const isFiber  = FIBER_DEVICES.has(type);
  const showPorts = SWITCH_DEVICES.has(type);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd({
      id: uid(), type, name: name.trim(), location,
      ports:       parseInt(ports)      || 0, portSpeed,
      uplinkPorts: parseInt(uplinkPorts)|| 0, uplinkSpeed,
      fiberPorts:  parseInt(fiberPorts) || 0, fiberConnector: fiberConn,
      services, vlans, mgmtIP, notes,
      x: 120 + Math.random() * 380,
      y: 100 + Math.random() * 280,
    });
    setName(""); setLocation(""); setMgmtIP(""); setNotes("");
    setServices([]); setVlans([]);
  };

  return (
    <div>
      <div className="field-group">
        <label className="field-label">Device Type</label>
        <select className="field-select" value={type} onChange={e => setType(e.target.value)}>
          {Object.entries(DEVICE_TYPES).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Hostname / Label *</label>
        <input className="field-input" placeholder="e.g. FP-IDF-01" value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()} />
      </div>

      <div className="field-group">
        <label className="field-label">Location / Rack</label>
        <input className="field-input" placeholder="e.g. IDF-2 / U4" value={location}
          onChange={e => setLocation(e.target.value)} />
      </div>

      {showPorts && (
        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">Access Ports</label>
            <input className="field-input" type="number" value={ports}
              onChange={e => setPorts(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Speed</label>
            <select className="field-select" value={portSpeed}
              onChange={e => setPortSpeed(e.target.value)}>
              {PORT_SPEEDS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Uplinks</label>
            <input className="field-input" type="number" value={uplinkPorts}
              onChange={e => setUplinkPorts(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Uplink Speed</label>
            <select className="field-select" value={uplinkSpeed}
              onChange={e => setUplinkSpeed(e.target.value)}>
              {PORT_SPEEDS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {isFiber && (
        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">Fiber Ports</label>
            <input className="field-input" type="number" value={fiberPorts}
              onChange={e => setFiberPorts(e.target.value)} />
          </div>
          <div className="field-group">
            <label className="field-label">Connector</label>
            <select className="field-select" value={fiberConn}
              onChange={e => setFiberConn(e.target.value)}>
              {FIBER_CONNECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="field-group">
        <label className="field-label">Mgmt IP</label>
        <input className="field-input" placeholder="10.0.0.1/24" value={mgmtIP}
          onChange={e => setMgmtIP(e.target.value)} />
      </div>

      <div className="field-group">
        <label className="field-label">Services</label>
        <div className="chip-group">
          {SERVICE_TYPES.map(s => (
            <button key={s}
              className={`chip ${services.includes(s) ? "on" : ""}`}
              onClick={() => toggle(services, setServices, s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">VLANs</label>
        <div className="chip-group">
          {VLAN_DEFAULTS.map(v => (
            <button key={v.id}
              className={`chip ${vlans.includes(v.id) ? "on" : ""}`}
              style={vlans.includes(v.id) ? { borderColor: v.color, color: v.color, background: v.color + "18" } : {}}
              onClick={() => toggle(vlans, setVlans, v.id)}>
              {v.id}–{v.name}
            </button>
          ))}
        </div>
      </div>

      <div className="field-group">
        <label className="field-label">Notes</label>
        <textarea className="field-input field-textarea" value={notes}
          onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="add-btn" onClick={handleAdd}>＋ Add Device</button>
    </div>
  );
}

// ─── Link Form ────────────────────────────────────────────────────────────────
function LinkForm({ devices, onAdd }) {
  const [from,      setFrom]      = useState("");
  const [to,        setTo]        = useState("");
  const [speed,     setSpeed]     = useState("1G");
  const [linkType,  setLinkType]  = useState("Copper RJ45");
  const [connector, setConnector] = useState("LC Duplex");
  const [strands,   setStrands]   = useState("2");
  const [portLabel, setPortLabel] = useState("");

  const isFiber = linkType.includes("Fiber");

  const handleAdd = () => {
    if (!from || !to || from === to) return;
    onAdd({
      id: uid(), from, to, speed, linkType,
      connector: isFiber ? connector : "",
      strands:   isFiber ? (parseInt(strands) || 2) : 0,
      label: portLabel,
    });
    setPortLabel("");
  };

  return (
    <div>
      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">From</label>
          <select className="field-select" value={from} onChange={e => setFrom(e.target.value)}>
            <option value="">Select…</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">To</label>
          <select className="field-select" value={to} onChange={e => setTo(e.target.value)}>
            <option value="">Select…</option>
            {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="field-group">
          <label className="field-label">Speed</label>
          <select className="field-select" value={speed} onChange={e => setSpeed(e.target.value)}>
            {PORT_SPEEDS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label className="field-label">Media</label>
          <select className="field-select" value={linkType} onChange={e => setLinkType(e.target.value)}>
            {LINK_TYPES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {isFiber && (
        <div className="grid-2">
          <div className="field-group">
            <label className="field-label">Connector</label>
            <select className="field-select" value={connector} onChange={e => setConnector(e.target.value)}>
              {FIBER_CONNECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field-group">
            <label className="field-label">Strands</label>
            <input className="field-input" type="number" value={strands}
              onChange={e => setStrands(e.target.value)} />
          </div>
        </div>
      )}

      <div className="field-group">
        <label className="field-label">Port / Label (optional)</label>
        <input className="field-input" placeholder="Gi1/0/1 → Gi0/1" value={portLabel}
          onChange={e => setPortLabel(e.target.value)} />
      </div>

      <button className="add-btn" onClick={handleAdd}>⟵⟶ Add Link</button>
    </div>
  );
}

// ─── Path Panel ───────────────────────────────────────────────────────────────
function PathPanel({ devices, links, activePath, setActivePath }) {
  const [src,    setSrc]    = useState("");
  const [dst,    setDst]    = useState("");
  const [paths,  setPaths]  = useState([]);
  const [selIdx, setSelIdx] = useState(0);
  const [error,  setError]  = useState("");

  const trace = () => {
    setError("");
    const found = findAllPaths(devices, links, src, dst);
    if (!found.length) {
      setError("No path found between these devices.");
      setPaths([]);
      setActivePath(null);
      return;
    }
    setPaths(found);
    setSelIdx(0);
    setActivePath(found[0]);
  };

  const pickPath = i => { setSelIdx(i); setActivePath(paths[i]); };

  const clear = () => {
    setPaths([]); setActivePath(null); setError("");
    setSrc(""); setDst("");
  };

  const nameOf = id => devices.find(d => d.id === id)?.name || id;

  return (
    <div>
      <p className="path-help">
        Select a source and destination to trace and highlight every hop — including fiber runs — across your topology.
      </p>

      <div className="field-group">
        <label className="field-label">Source Device</label>
        <select className="field-select" value={src} onChange={e => setSrc(e.target.value)}>
          <option value="">Select…</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="field-group">
        <label className="field-label">Destination Device</label>
        <select className="field-select" value={dst} onChange={e => setDst(e.target.value)}>
          <option value="">Select…</option>
          {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      <div className="path-btn-row" style={{ marginBottom: "10px" }}>
        <button className="add-btn orange" style={{ flex: 1 }} onClick={trace}>⟐ Trace Path</button>
        {paths.length > 0 &&
          <button className="add-btn ghost" style={{ width: "40px", flex: "none" }} onClick={clear}>✕</button>}
      </div>

      {error && <div className="path-error">{error}</div>}

      {paths.length > 0 && (
        <div style={{ marginTop: "12px" }}>
          <div className="section-title">{paths.length} PATH{paths.length > 1 ? "S" : ""} FOUND</div>

          {paths.map((p, i) => (
            <div key={i} className={`path-card ${selIdx === i ? "selected" : ""}`} onClick={() => pickPath(i)}>
              <div className="path-card-header">
                <span className="path-card-label" style={{ color: selIdx === i ? "#f97316" : "#64748b" }}>
                  Path {i + 1}
                </span>
                <span className="path-card-hops">{p.nodes.length - 1} hop{p.nodes.length > 2 ? "s" : ""}</span>
              </div>

              {p.nodes.map((nid, ni) => {
                const lnk = p.links[ni - 1];
                const isEnd = ni === 0 || ni === p.nodes.length - 1;
                return (
                  <div key={ni}>
                    {ni > 0 && (
                      <div className="path-hop-link">
                        <div className="path-hop-line" />
                        <span className="path-hop-meta" style={{
                          color: lnk?.linkType?.includes("Fiber")
                            ? FIBER_COLOR
                            : (LINK_SPEED_COLOR[lnk?.speed] || "#475569")
                        }}>
                          {lnk?.linkType?.includes("Fiber") ? "◈ Fiber" : "● "}
                          {lnk?.speed} · {lnk?.linkType}
                          {lnk?.connector ? " · " + lnk.connector : ""}
                        </span>
                      </div>
                    )}
                    <div className="path-hop-node">
                      <div className="path-hop-dot"
                        style={{ background: isEnd ? "#f97316" : "#334155" }} />
                      <span className="path-hop-name"
                        style={{ color: isEnd ? "#f1f5f9" : "#94a3b8" }}>
                        {nameOf(nid)}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="path-summary">
                {p.links.filter(l => l.linkType?.includes("Fiber")).length} fiber ·{" "}
                {p.links.filter(l => !l.linkType?.includes("Fiber")).length} copper segments
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [tab,        setTab]        = useState("device");
  const [devices,    setDevices]    = useState([]);
  const [links,      setLinks]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [dragging,   setDragging]   = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pan,        setPan]        = useState({ x: 0, y: 0 });
  const [isPanning,  setIsPanning]  = useState(false);
  const [panStart,   setPanStart]   = useState({ x: 0, y: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [activePath, setActivePath] = useState(null);
  const svgRef = useRef(null);

  const addDevice = useCallback(d => setDevices(p => [...p, d]), []);
  const addLink   = useCallback(l => setLinks(p => [...p, l]),   []);

  const deleteSelected = () => {
    if (!selected) return;
    if (selected.startsWith("n")) {
      setDevices(p => p.filter(d => d.id !== selected));
      setLinks(p => p.filter(l => l.from !== selected && l.to !== selected));
      if (activePath) setActivePath(null);
    } else {
      setLinks(p => p.filter(l => l.id !== selected));
    }
    setSelected(null);
  };

  const getCenter = id => {
    const d = devices.find(x => x.id === id);
    return d ? { x: d.x + NODE_W / 2, y: d.y + NODE_H / 2 } : { x: 0, y: 0 };
  };

  const onNodeDown = (e, id) => {
    e.stopPropagation();
    setSelected(id);
    const d = devices.find(x => x.id === id);
    const r = svgRef.current.getBoundingClientRect();
    setDragging(id);
    setDragOffset({
      x: (e.clientX - r.left) / zoom - pan.x - d.x,
      y: (e.clientY - r.top)  / zoom - pan.y - d.y,
    });
  };

  const onSvgDown = e => {
    if (e.target === svgRef.current || e.target.tagName === "svg") {
      setSelected(null);
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const onMouseMove = e => {
    const r = svgRef.current?.getBoundingClientRect();
    if (dragging && r) {
      setDevices(p => p.map(d => d.id === dragging ? {
        ...d,
        x: (e.clientX - r.left) / zoom - pan.x - dragOffset.x,
        y: (e.clientY - r.top)  / zoom - pan.y - dragOffset.y,
      } : d));
    }
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  };

  const onMouseUp = () => { setDragging(null); setIsPanning(false); };

  const onWheel = useCallback(e => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.25, z * (e.deltaY > 0 ? 0.9 : 1.11))));
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (el) el.addEventListener("wheel", onWheel, { passive: false });
    return () => { if (el) el.removeEventListener("wheel", onWheel); };
  }, [onWheel]);

  const activePathLinkIds = new Set((activePath?.links || []).map(l => l.id));
  const activePathNodeIds = new Set(activePath?.nodes || []);

  const selDevice = selected ? devices.find(d => d.id === selected) : null;
  const selLink   = selected ? links.find(l => l.id === selected)   : null;

  return (
    <div className="app-root">

      {/* ══════════ SIDEBAR ══════════ */}
      <div className="sidebar">

        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-mark">◈</div>
          <div>
            <div className="logo-title">NetDraw</div>
            <div className="logo-sub">Comm Closet Diagram Builder</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[["device", "Devices"], ["link", "Links"], ["path", "Paths"], ["inventory", "Inventory"]].map(([k, l]) => (
            <button key={k}
              className={`tab-btn ${tab === k ? (k === "path" && activePath ? "active-path" : "active") : ""}`}
              onClick={() => setTab(k)}>
              {k === "path" && activePath ? <span style={{ color: "#f97316" }}>◈ {l}</span> : l}
            </button>
          ))}
        </div>

        {/* Tab body */}
        <div className="sidebar-body">
          {tab === "device"    && <DeviceForm onAdd={addDevice} />}
          {tab === "link"      && <LinkForm devices={devices} onAdd={addLink} />}
          {tab === "path"      && <PathPanel devices={devices} links={links} activePath={activePath} setActivePath={setActivePath} />}
          {tab === "inventory" && (
            <div>
              <div className="section-title">Devices ({devices.length})</div>
              {!devices.length && <div className="dim-text">No devices yet</div>}
              {devices.map(d => (
                <div key={d.id} className={`inv-item ${selected === d.id ? "selected" : ""}`}
                  onClick={() => setSelected(d.id)}>
                  <span style={{ color: DEVICE_TYPES[d.type].color, marginRight: 6, fontSize: 14 }}>
                    {DEVICE_TYPES[d.type].icon}
                  </span>
                  <span className="inv-item-name">{d.name}</span>
                  <span className="inv-item-type">{DEVICE_TYPES[d.type].label}</span>
                </div>
              ))}

              <div className="section-title" style={{ marginTop: 16 }}>Links ({links.length})</div>
              {!links.length && <div className="dim-text">No links yet</div>}
              {links.map(l => {
                const f = devices.find(d => d.id === l.from);
                const t = devices.find(d => d.id === l.to);
                const isFib = l.linkType?.includes("Fiber");
                return (
                  <div key={l.id} className={`inv-item ${selected === l.id ? "selected" : ""}`}
                    onClick={() => setSelected(l.id)}>
                    <span style={{ color: isFib ? FIBER_COLOR : (LINK_SPEED_COLOR[l.speed] || "#94a3b8"), marginRight: 6, fontSize: 12 }}>
                      {isFib ? "◈" : "⟷"}
                    </span>
                    <span className="inv-item-name" style={{ fontSize: 11 }}>{f?.name} ↔ {t?.name}</span>
                    <span className="inv-item-type">{l.speed}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Inspector */}
        {(selDevice || selLink) && (
          <div className="inspector">
            <div className="inspector-header">
              <div className="inspector-title">{selDevice ? selDevice.name : "Link"}</div>
              <button className="delete-btn" onClick={deleteSelected}>✕ Delete</button>
            </div>
            {selDevice && (
              <div>
                <div className="info-row"><span className="info-key">Type:</span>{DEVICE_TYPES[selDevice.type].label}</div>
                {selDevice.location   && <div className="info-row"><span className="info-key">Location:</span>{selDevice.location}</div>}
                {selDevice.mgmtIP     && <div className="info-row"><span className="info-key">Mgmt IP:</span>{selDevice.mgmtIP}</div>}
                {selDevice.ports > 0  && <div className="info-row"><span className="info-key">Ports:</span>{selDevice.ports}× {selDevice.portSpeed} + {selDevice.uplinkPorts}× {selDevice.uplinkSpeed}</div>}
                {selDevice.fiberPorts > 0 && <div className="info-row"><span className="info-key">Fiber:</span>{selDevice.fiberPorts}× {selDevice.fiberConnector}</div>}
                {selDevice.services.length > 0 && <div className="info-row"><span className="info-key">Services:</span>{selDevice.services.join(", ")}</div>}
                {selDevice.vlans.length > 0    && <div className="info-row"><span className="info-key">VLANs:</span>{selDevice.vlans.join(", ")}</div>}
                {selDevice.notes && <div className="info-row"><span className="info-key">Notes:</span>{selDevice.notes}</div>}
              </div>
            )}
            {selLink && (
              <div>
                <div className="info-row"><span className="info-key">Speed:</span>{selLink.speed}</div>
                <div className="info-row"><span className="info-key">Media:</span>{selLink.linkType}</div>
                {selLink.connector && <div className="info-row"><span className="info-key">Connector:</span>{selLink.connector}</div>}
                {selLink.strands > 0 && <div className="info-row"><span className="info-key">Strands:</span>{selLink.strands}</div>}
                {selLink.label       && <div className="info-row"><span className="info-key">Ports:</span>{selLink.label}</div>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════ CANVAS ══════════ */}
      <div className="canvas-area"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>

        {/* Toolbar */}
        <div className="canvas-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="toolbar-hint">Drag nodes · Scroll zoom · Drag canvas to pan</span>
            {activePath && (
              <div className="path-badge">
                <div className="path-badge-dot" />
                <span className="path-badge-text">Path active — {activePath.nodes.length - 1} hops</span>
                <button className="path-badge-close" onClick={() => setActivePath(null)}>✕</button>
              </div>
            )}
          </div>
          <div className="toolbar-zoom">
            <button className="toolbar-btn" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>＋</button>
            <button className="toolbar-btn" onClick={() => setZoom(1)}>1:1</button>
            <button className="toolbar-btn" onClick={() => setZoom(z => Math.max(0.25, z * 0.83))}>－</button>
            <span className="toolbar-zoom-pct">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Empty state */}
        {!devices.length && (
          <div className="canvas-empty">
            <div className="canvas-empty-icon">◈</div>
            <div className="canvas-empty-text">Add devices from the left panel</div>
            <div className="canvas-empty-sub">Switches · Fiber Panels · Routers · Servers</div>
          </div>
        )}

        {/* SVG diagram */}
        <svg
          ref={svgRef}
          className="canvas-svg"
          style={{ cursor: isPanning ? "grabbing" : "grab" }}
          onMouseDown={onSvgDown}>

          <defs>
            {/* Grid pattern */}
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x * zoom},${pan.y * zoom}) scale(${zoom})`}>
              <path d="M40 0 L0 0 0 40" fill="none" stroke="#111f33" strokeWidth="0.5" />
            </pattern>

            {/* Glow filters */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="pathGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>

            {/* Arrow markers per speed */}
            {PORT_SPEEDS.map(s => (
              <marker key={s} id={`arr-${s}`} markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 Z" fill={LINK_SPEED_COLOR[s] || "#64748b"} />
              </marker>
            ))}
            <marker id="arr-path" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 Z" fill="#f97316" />
            </marker>
          </defs>

          {/* Background grid */}
          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x * zoom},${pan.y * zoom}) scale(${zoom})`}>

            {/* ── LINKS ── */}
            {links.map(l => {
              const f = getCenter(l.from), t = getCenter(l.to);
              const mx = (f.x + t.x) / 2, my = (f.y + t.y) / 2;
              const isFib  = l.linkType?.includes("Fiber");
              const isPath = activePathLinkIds.has(l.id);
              const isSel  = selected === l.id;
              const dim    = activePath && !isPath;
              const c      = isFib ? FIBER_COLOR : (LINK_SPEED_COLOR[l.speed] || "#94a3b8");
              const dx = t.x - f.x, dy = t.y - f.y;
              const cx1 = f.x + dx * 0.25 - dy * 0.15, cy1 = f.y + dy * 0.25 + dx * 0.15;
              const cx2 = f.x + dx * 0.75 - dy * 0.15, cy2 = f.y + dy * 0.75 + dx * 0.15;
              const pd = `M${f.x},${f.y} C${cx1},${cy1} ${cx2},${cy2} ${t.x},${t.y}`;

              return (
                <g key={l.id} onClick={() => setSelected(l.id)} style={{ cursor: "pointer" }}>
                  {/* invisible hit area */}
                  <path d={pd} fill="none" stroke="transparent" strokeWidth="14" />

                  {/* path glow */}
                  {isPath && (
                    <path d={pd} fill="none" stroke="#f97316" strokeWidth="8" opacity="0.2"
                      filter="url(#pathGlow)"
                      style={{ animation: "pathPulse 2s ease-in-out infinite" }} />
                  )}

                  {/* main stroke */}
                  <path d={pd} fill="none"
                    stroke={isPath ? "#f97316" : c}
                    strokeWidth={isPath ? 3 : isSel ? 2.5 : isFib ? 2 : 1.5}
                    strokeDasharray={isPath ? "12,6" : isFib ? "8,4" : undefined}
                    opacity={dim ? 0.12 : isSel || isPath ? 1 : 0.75}
                    filter={isSel || isPath ? "url(#glow)" : undefined}
                    markerEnd={isPath ? "url(#arr-path)" : `url(#arr-${l.speed})`}
                    style={isPath ? { animation: "flowDash 0.8s linear infinite", strokeDasharray: "12,6" } : undefined}
                  />

                  {/* speed badge */}
                  {!dim && (
                    <g>
                      <rect x={mx - 24} y={my - 9} width={isFib ? 54 : 48} height={17} rx={4}
                        fill="#0b1a2e" stroke={isPath ? "#f97316" : c} strokeWidth={isPath ? 1 : 0.5} opacity="0.95" />
                      <text x={mx} y={my + 4} textAnchor="middle"
                        fill={isPath ? "#f97316" : c} fontSize="9" fontFamily="'JetBrains Mono',monospace">
                        {isFib ? "◈ " : ""}{l.speed}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* ── NODES ── */}
            {devices.map(d => {
              const cfg       = DEVICE_TYPES[d.type];
              const isSel     = selected === d.id;
              const isPathNode = activePathNodeIds.has(d.id);
              const isEndpoint = activePath && (
                activePath.nodes[0] === d.id ||
                activePath.nodes[activePath.nodes.length - 1] === d.id
              );
              const dim   = activePath && !isPathNode;
              const vDots = d.vlans.map(v => VLAN_DEFAULTS.find(x => x.id === v)).filter(Boolean);

              return (
                <g key={d.id} transform={`translate(${d.x},${d.y})`}
                  onMouseDown={e => onNodeDown(e, d.id)}
                  style={{ cursor: "grab" }}>

                  {/* path endpoint ring */}
                  {isEndpoint && (
                    <rect x="-6" y="-6" width={NODE_W + 12} height={NODE_H + 12} rx="14"
                      fill="none" stroke="#f97316" strokeWidth="2.5"
                      filter="url(#pathGlow)"
                      style={{ animation: "pathPulse 1.5s ease-in-out infinite" }} />
                  )}
                  {/* path midpoint ring */}
                  {isPathNode && !isEndpoint && (
                    <rect x="-4" y="-4" width={NODE_W + 8} height={NODE_H + 8} rx="12"
                      fill="none" stroke="#f9731660" strokeWidth="1.5" />
                  )}
                  {/* selection ring */}
                  {isSel && (
                    <rect x="-4" y="-4" width={NODE_W + 8} height={NODE_H + 8} rx="12"
                      fill="none" stroke={cfg.color} strokeWidth="2" opacity="0.6" filter="url(#glow)" />
                  )}

                  {/* card background */}
                  <rect width={NODE_W} height={NODE_H} rx="8"
                    fill={dim ? "#080f1a" : "#0e1c30"}
                    stroke={isSel ? cfg.color : isPathNode ? "#f97316" : "#1e293b"}
                    strokeWidth={isSel || isPathNode ? 1.5 : 1}
                    opacity={dim ? 0.3 : 1} />

                  {/* colour bar */}
                  <rect width={NODE_W} height="3" rx="2" fill={cfg.color} opacity={dim ? 0.2 : 0.85} />

                  {/* icon */}
                  <g transform="translate(8,13)" opacity={dim ? 0.25 : 1}>
                    <DeviceIcon type={d.type} size={32} color={cfg.color} />
                  </g>

                  {/* hostname */}
                  <text x="48" y="27" fill={dim ? "#1e293b" : "#f1f5f9"} fontSize="11" fontWeight="600"
                    fontFamily="'JetBrains Mono',monospace" style={{ userSelect: "none" }}>
                    {d.name.length > 13 ? d.name.slice(0, 12) + "…" : d.name}
                  </text>

                  {/* type label */}
                  <text x="48" y="40" fill={dim ? "#1e293b" : "#475569"} fontSize="9"
                    fontFamily="'JetBrains Mono',monospace" style={{ userSelect: "none" }}>
                    {cfg.label.length > 17 ? cfg.label.slice(0, 16) + "…" : cfg.label}
                  </text>

                  {/* rack location */}
                  {d.location && (
                    <text x="48" y="51" fill={dim ? "#111f33" : "#334155"} fontSize="8"
                      fontFamily="'JetBrains Mono',monospace" style={{ userSelect: "none" }}>
                      {d.location.length > 17 ? d.location.slice(0, 16) + "…" : d.location}
                    </text>
                  )}

                  {/* mgmt IP */}
                  {d.mgmtIP && (
                    <text x="48" y="61" fill={dim ? "#111f33" : "#1e40af"} fontSize="8"
                      fontFamily="'JetBrains Mono',monospace" style={{ userSelect: "none" }}>
                      {d.mgmtIP}
                    </text>
                  )}

                  {/* VLAN dots */}
                  {vDots.length > 0 && !dim && (
                    <g transform={`translate(${NODE_W - 6 - vDots.length * 10},${NODE_H - 13})`}>
                      {vDots.map((v, i) =>
                        <circle key={v.id} cx={i * 10} cy="5" r="4" fill={v.color} opacity="0.85" />)}
                    </g>
                  )}

                  {/* copper port badge */}
                  {d.ports > 0 && !dim && (
                    <g transform={`translate(4,${NODE_H - 15})`}>
                      <rect width={d.uplinkPorts > 0 ? 52 : 30} height={12} rx={3} fill="#0b1a2e" />
                      <text x="4" y="9" fill="#334155" fontSize="8" fontFamily="'JetBrains Mono',monospace">
                        {d.ports}p/{d.portSpeed}
                      </text>
                      {d.uplinkPorts > 0 && (
                        <text x="30" y="9" fill="#334155" fontSize="8" fontFamily="'JetBrains Mono',monospace">
                          ↑{d.uplinkPorts}p
                        </text>
                      )}
                    </g>
                  )}

                  {/* fiber port badge */}
                  {d.fiberPorts > 0 && !dim && (
                    <g transform={`translate(${d.ports > 0 ? 58 : 4},${NODE_H - 15})`}>
                      <rect width={44} height={12} rx={3} fill="#1a0c00" />
                      <text x="4" y="9" fill={FIBER_COLOR} fontSize="8" fontFamily="'JetBrains Mono',monospace">
                        ◈{d.fiberPorts} {(d.fiberConnector || "").split(" ")[0]}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Legend */}
        {links.length > 0 && (
          <div className="legend">
            <div className="legend-title">Link Speed</div>
            {Object.entries(LINK_SPEED_COLOR).map(([sp, c]) => (
              <div key={sp} className="legend-row">
                <div className="legend-swatch" style={{ background: c }} />
                <span className="legend-label" style={{ color: c }}>{sp}</span>
              </div>
            ))}
            <div className="legend-divider">
              <div className="legend-row">
                <div className="legend-swatch" style={{ height: 0, borderTop: `2px dashed ${FIBER_COLOR}` }} />
                <span className="legend-label" style={{ color: FIBER_COLOR }}>Fiber</span>
              </div>
              <div className="legend-row">
                <div className="legend-swatch" style={{ background: "#64748b" }} />
                <span className="legend-label" style={{ color: "#475569" }}>Copper</span>
              </div>
              {activePath && (
                <div className="legend-row">
                  <div className="legend-swatch" style={{ background: "#f97316", boxShadow: "0 0 4px #f97316" }} />
                  <span className="legend-label" style={{ color: "#f97316" }}>Active Path</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
