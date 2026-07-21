import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";
import {
  LayoutDashboard, TrendingUp, Landmark, FileText, Coins, Handshake,
  Calculator, CalendarClock, Plus, Trash2, ChevronRight, Wallet,
  ArrowUpRight, ArrowDownRight, X, Check, Send, MessageCircle, Mail,
} from "lucide-react";

/* ============================================================
   CONFIG — à personnaliser
   ============================================================ */
const BRAND = {
  name: "IZIINVEST",
  tagline: "Investir sur la BRVM depuis l'étranger",
  advisorEmail: "contact@azalai-invest.com", // à remplacer par ton email
  advisorWhatsapp: "221770000000", // à remplacer par ton numéro (format international, sans +)
  calendlyUrl: "https://calendly.com/ton-identifiant/rendez-vous-iziinvest", // à remplacer par ton lien Calendly
};

const ASSET_CLASSES = [
  { key: "actions", label: "Actions", short: "Actions cotées", color: "#0ECB81", icon: TrendingUp, defaultRate: 10 },
  { key: "obligations_pme", label: "Obligations PME", short: "Dette privée cotée", color: "#F0B90B", icon: FileText, defaultRate: 8 },
  { key: "oat", label: "OAT — Emprunts obligataires États", short: "Dette souveraine", color: "#5B8DEF", icon: Landmark, defaultRate: 6.5 },
  { key: "bat", label: "BAT — Bons du Trésor", short: "Court terme États", color: "#8FA0B8", icon: Landmark, defaultRate: 5.5 },
  { key: "sukuk", label: "Sukuk", short: "Finance islamique", color: "#B47FE5", icon: Coins, defaultRate: 6 },
  { key: "private_credit", label: "Private Credit", short: "Prêts privés aux PME", color: "#E2604F", icon: Handshake, defaultRate: 12 },
];

const ACC = (k) => ASSET_CLASSES.find((c) => c.key === k);

// Cours / références indicatifs — à actualiser régulièrement (voir note en bas de l'app)
const REFERENCE_DATA = {
  actions: [
    { code: "SNTS", name: "Sonatel", price: 15500 },
    { code: "ORAC", name: "Orange Côte d'Ivoire", price: 8200 },
    { code: "ECOC", name: "Ecobank Côte d'Ivoire", price: 13 },
    { code: "BOAB", name: "Bank of Africa Bénin", price: 3700 },
    { code: "BICC", name: "BICI Côte d'Ivoire", price: 5900 },
    { code: "SGBC", name: "Société Générale Côte d'Ivoire", price: 13500 },
    { code: "NSBC", name: "NSIA Banque Côte d'Ivoire", price: 6100 },
    { code: "CFAC", name: "CFAO Motors Côte d'Ivoire", price: 950 },
    { code: "TTLC", name: "TotalEnergies Marketing CI", price: 2600 },
    { code: "SIVC", name: "SIVOA", price: 2800 },
  ],
  obligations_pme: [
    { code: "OPME1", name: "Obligation PME Agro-Transformation 2027", rate: 7.5 },
    { code: "OPME2", name: "Obligation PME Logistique 2026", rate: 7.0 },
  ],
  oat: [
    { code: "OATSN31", name: "OAT Sénégal 6,25% 2031", rate: 6.25 },
    { code: "OATCI33", name: "OAT Côte d'Ivoire 6% 2033", rate: 6.0 },
    { code: "OATBJ30", name: "OAT Bénin 6,5% 2030", rate: 6.5 },
  ],
  bat: [
    { code: "BATSN6M", name: "BAT Sénégal 6 mois", rate: 5.3 },
    { code: "BATBF12M", name: "BAT Burkina Faso 12 mois", rate: 5.9 },
  ],
  sukuk: [
    { code: "SUKSN29", name: "Sukuk Trésor Sénégal 2029", rate: 6.0 },
    { code: "SUKBOAD28", name: "Sukuk BOAD 2028", rate: 5.8 },
  ],
  private_credit: [
    { code: "PC1", name: "Prêt privé PME Transformation Agro", rate: 12.0 },
    { code: "PC2", name: "Prêt privé PME BTP & Négoce", rate: 13.0 },
  ],
};

const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const fmtPct = (n) => `${n >= 0 ? "+" : ""}${n.toFixed(2)} %`;
const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================
   STORAGE HELPERS (localStorage — persistance locale au navigateur)
   ============================================================ */
const STORAGE_KEY = "iziinvest:state";
async function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Erreur de sauvegarde", e);
  }
}

const emptyPortfolio = () =>
  Object.fromEntries(ASSET_CLASSES.map((c) => [c.key, []]));

/* ============================================================
   ROOT APP
   ============================================================ */
export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [portfolio, setPortfolio] = useState(emptyPortfolio());
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    (async () => {
      const s = await loadState();
      if (s) {
        setPortfolio({ ...emptyPortfolio(), ...(s.portfolio || {}) });
        setAppointments(s.appointments || []);
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState({ portfolio, appointments });
  }, [portfolio, appointments, ready]);

  const addHolding = (classKey, holding) => {
    setPortfolio((p) => ({ ...p, [classKey]: [...p[classKey], { id: uid(), ...holding }] }));
  };
  const removeHolding = (classKey, id) => {
    setPortfolio((p) => ({ ...p, [classKey]: p[classKey].filter((h) => h.id !== id) }));
  };

  const valuations = useMemo(() => computeValuations(portfolio), [portfolio]);

  return (
    <div className="app-root">
      <style>{CSS}</style>
      <Sidebar tab={tab} setTab={setTab} totalValue={valuations.total} />
      <main className="main">
        <TopTicker />
        <div className="content">
          {tab === "dashboard" && <Dashboard portfolio={portfolio} valuations={valuations} setTab={setTab} />}
          {tab === "simulateur" && <Simulator />}
          {tab === "rendezvous" && (
            <Appointments appointments={appointments} setAppointments={setAppointments} />
          )}
          {ASSET_CLASSES.some((c) => c.key === tab) && (
            <AssetClassView
              classKey={tab}
              holdings={portfolio[tab]}
              addHolding={(h) => addHolding(tab, h)}
              removeHolding={(id) => removeHolding(tab, id)}
              valuations={valuations}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* ============================================================
   VALUATION LOGIC
   ============================================================ */
function computeValuations(portfolio) {
  const byClass = {};
  let total = 0;
  let invested = 0;
  ASSET_CLASSES.forEach((c) => {
    const items = portfolio[c.key] || [];
    let value = 0;
    let inv = 0;
    items.forEach((h) => {
      if (c.key === "actions") {
        const qty = Number(h.quantite) || 0;
        const cours = Number(h.coursActuel) || Number(h.prixAchat) || 0;
        const achat = Number(h.prixAchat) || 0;
        value += qty * cours;
        inv += qty * achat;
      } else {
        const montant = Number(h.montant) || 0;
        value += montant;
        inv += montant;
      }
    });
    byClass[c.key] = { value, invested: inv, gain: value - inv };
    total += value;
    invested += inv;
  });
  return { byClass, total, invested, gain: total - invested };
}

/* ============================================================
   SIDEBAR
   ============================================================ */
function Sidebar({ tab, setTab, totalValue }) {
  const items = [
    { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    ...ASSET_CLASSES.map((c) => ({ key: c.key, label: c.label, icon: c.icon })),
    { key: "simulateur", label: "Simulateur", icon: Calculator },
    { key: "rendezvous", label: "Rendez-vous", icon: CalendarClock },
  ];
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Iz</div>
        <div>
          <div className="brand-name">{BRAND.name}</div>
          <div className="brand-tagline">{BRAND.tagline}</div>
        </div>
      </div>

      <div className="side-total">
        <span className="side-total-label">Valeur du portefeuille</span>
        <span className="side-total-value">{fmt(totalValue)} <em>FCFA</em></span>
      </div>

      <nav className="nav">
        {items.map((it) => (
          <button
            key={it.key}
            className={"nav-item" + (tab === it.key ? " active" : "")}
            onClick={() => setTab(it.key)}
          >
            <it.icon size={17} strokeWidth={1.8} />
            <span>{it.label}</span>
            {tab === it.key && <ChevronRight size={14} className="nav-chev" />}
          </button>
        ))}
      </nav>

      <div className="side-foot">Mon Patrimoine dans l'UEMOA</div>
    </aside>
  );
}

/* ============================================================
   TOP TICKER (signature element)
   ============================================================ */
function TopTicker() {
  const items = useMemo(() => {
    const list = [];
    REFERENCE_DATA.actions.forEach((a) => {
      const change = (Math.random() * 4 - 1.5);
      list.push({ code: a.code, price: a.price, change });
    });
    return list;
  }, []);
  const loop = [...items, ...items];
  return (
    <div className="ticker">
      <div className="ticker-track">
        {loop.map((it, i) => (
          <span className="ticker-item" key={i}>
            <b>{it.code}</b>
            <span>{fmt(it.price)}</span>
            <span className={it.change >= 0 ? "up" : "down"}>
              {it.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {fmtPct(it.change)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   DASHBOARD
   ============================================================ */
function Dashboard({ portfolio, valuations, setTab }) {
  const pieData = ASSET_CLASSES.map((c) => ({
    name: c.label,
    value: valuations.byClass[c.key].value,
    color: c.color,
  })).filter((d) => d.value > 0);

  const hasData = valuations.total > 0;

  const evolution = useMemo(() => buildSyntheticEvolution(valuations), [valuations]);

  return (
    <div>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de ton portefeuille UEMOA" />

      <div className="cards-row">
        <StatCard label="Valeur totale" value={`${fmt(valuations.total)} FCFA`} icon={Wallet} tone="neutral" />
        <StatCard
          label="Plus/moins-value"
          value={`${valuations.gain >= 0 ? "+" : ""}${fmt(valuations.gain)} FCFA`}
          icon={valuations.gain >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={valuations.gain >= 0 ? "up" : "down"}
        />
        <StatCard label="Capital investi" value={`${fmt(valuations.invested)} FCFA`} icon={TrendingUp} tone="neutral" />
        <StatCard
          label="Lignes en portefeuille"
          value={ASSET_CLASSES.reduce((s, c) => s + (portfolio[c.key]?.length || 0), 0)}
          icon={FileText}
          tone="neutral"
        />
      </div>

      {!hasData ? (
        <div className="empty-state">
          <p>Ton portefeuille est vide pour le moment.</p>
          <p className="muted">Ajoute une première ligne — actions, obligations, OAT, BAT, Sukuk ou private credit — pour voir ton allocation ici.</p>
          <div className="empty-actions">
            {ASSET_CLASSES.map((c) => (
              <button key={c.key} className="chip" style={{ borderColor: c.color }} onClick={() => setTab(c.key)}>
                + {c.short}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div className="panel">
            <h3>Répartition par classe d'actifs</h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.color} stroke="none" />
                    ))}
                  </Pie>
                  <RTooltip
                    formatter={(v) => `${fmt(v)} FCFA`}
                    contentStyle={{ background: "#1E2329", border: "1px solid #2B3139", borderRadius: 8, color: "#EAECEF" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="legend-list">
              {pieData.map((d, i) => (
                <li key={i}>
                  <span className="dot" style={{ background: d.color }} />
                  {d.name} — <b>{fmt(d.value)} FCFA</b>
                </li>
              ))}
            </ul>
          </div>

          <div className="panel">
            <h3>Simulation d'évolution (12 derniers mois)</h3>
            <p className="muted small">
              Projection indicative basée sur le rendement moyen pondéré de tes classes d'actifs — à connecter aux données historiques réelles de la BRVM.
            </p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="evo" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
                  <XAxis dataKey="mois" stroke="#848E9C" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#848E9C" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={60} />
                  <RTooltip
                    formatter={(v) => `${fmt(v)} FCFA`}
                    contentStyle={{ background: "#1E2329", border: "1px solid #2B3139", borderRadius: 8, color: "#EAECEF" }}
                  />
                  <Area type="monotone" dataKey="valeur" stroke="#F0B90B" fill="url(#evo)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop: 20 }}>
        <h3>Détail par classe d'actifs</h3>
        <table className="table">
          <thead>
            <tr><th>Classe</th><th>Valeur</th><th>Investi</th><th>Résultat</th><th>Lignes</th></tr>
          </thead>
          <tbody>
            {ASSET_CLASSES.map((c) => {
              const v = valuations.byClass[c.key];
              return (
                <tr key={c.key} onClick={() => setTab(c.key)} className="clickable">
                  <td><span className="dot" style={{ background: c.color }} />{c.label}</td>
                  <td>{fmt(v.value)} FCFA</td>
                  <td>{fmt(v.invested)} FCFA</td>
                  <td className={v.gain >= 0 ? "up" : "down"}>{v.gain >= 0 ? "+" : ""}{fmt(v.gain)} FCFA</td>
                  <td>{(portfolio[c.key] || []).length}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function buildSyntheticEvolution(valuations) {
  const months = ["Août", "Sept", "Oct", "Nov", "Déc", "Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil"];
  const invested = valuations.invested || 1000000;
  let weightedRate = 0;
  let totalW = 0;
  ASSET_CLASSES.forEach((c) => {
    const v = valuations.byClass[c.key].value;
    weightedRate += v * c.defaultRate;
    totalW += v;
  });
  const annualRate = totalW > 0 ? weightedRate / totalW : 8;
  const monthlyRate = annualRate / 100 / 12;
  const start = invested > 0 ? invested / Math.pow(1 + monthlyRate, 11) : 0;
  return months.map((m, i) => ({ mois: m, valeur: start * Math.pow(1 + monthlyRate, i) }));
}

/* ============================================================
   SMALL COMPONENTS
   ============================================================ */
function PageHeader({ title, subtitle }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {subtitle && <p className="muted">{subtitle}</p>}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone }) {
  return (
    <div className="stat-card">
      <div className={"stat-icon " + tone}><Icon size={18} strokeWidth={1.8} /></div>
      <div>
        <div className="stat-label">{label}</div>
        <div className={"stat-value " + tone}>{value}</div>
      </div>
    </div>
  );
}

/* ============================================================
   ASSET CLASS VIEW (actions vs. produits de taux)
   ============================================================ */
function AssetClassView({ classKey, holdings, addHolding, removeHolding, valuations }) {
  const cfg = ACC(classKey);
  const [showForm, setShowForm] = useState(false);
  const v = valuations.byClass[classKey];
  const isEquity = classKey === "actions";

  return (
    <div>
      <PageHeader title={cfg.label} subtitle={cfg.short} />

      <div className="cards-row">
        <StatCard label="Valeur" value={`${fmt(v.value)} FCFA`} icon={Wallet} tone="neutral" />
        <StatCard label="Investi" value={`${fmt(v.invested)} FCFA`} icon={TrendingUp} tone="neutral" />
        <StatCard
          label="Résultat"
          value={`${v.gain >= 0 ? "+" : ""}${fmt(v.gain)} FCFA`}
          icon={v.gain >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={v.gain >= 0 ? "up" : "down"}
        />
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Lignes en portefeuille</h3>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Ajouter
          </button>
        </div>

        {holdings.length === 0 ? (
          <p className="muted">Aucune ligne pour l'instant.</p>
        ) : (
          <table className="table">
            <thead>
              {isEquity ? (
                <tr><th>Titre</th><th>Quantité</th><th>Prix d'achat</th><th>Cours actuel</th><th>Valeur</th><th></th></tr>
              ) : (
                <tr><th>Émetteur</th><th>Montant</th><th>Taux</th><th>Échéance</th><th></th></tr>
              )}
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.id}>
                  {isEquity ? (
                    <>
                      <td><b>{h.ticker}</b> — {h.nom}</td>
                      <td>{fmt(h.quantite)}</td>
                      <td>{fmt(h.prixAchat)} FCFA</td>
                      <td>{fmt(h.coursActuel)} FCFA</td>
                      <td>{fmt(h.quantite * h.coursActuel)} FCFA</td>
                    </>
                  ) : (
                    <>
                      <td>{h.emetteur}</td>
                      <td>{fmt(h.montant)} FCFA</td>
                      <td>{h.taux} %</td>
                      <td>{h.echeance || "—"}</td>
                    </>
                  )}
                  <td>
                    <button className="icon-btn danger" onClick={() => removeHolding(h.id)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <h3>Cours / références indicatifs</h3>
        <p className="muted small">À actualiser régulièrement depuis la BRVM — voir note en bas de page.</p>
        <table className="table compact">
          <thead>
            {isEquity ? <tr><th>Code</th><th>Société</th><th>Cours indicatif</th></tr>
              : <tr><th>Code</th><th>Émetteur</th><th>Taux indicatif</th></tr>}
          </thead>
          <tbody>
            {REFERENCE_DATA[classKey].map((r) => (
              <tr key={r.code}>
                <td>{r.code}</td>
                <td>{r.name}</td>
                <td>{isEquity ? `${fmt(r.price)} FCFA` : `${r.rate} %`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <HoldingForm
          classKey={classKey}
          isEquity={isEquity}
          onClose={() => setShowForm(false)}
          onSubmit={(h) => { addHolding(h); setShowForm(false); }}
        />
      )}
    </div>
  );
}

function HoldingForm({ classKey, isEquity, onClose, onSubmit }) {
  const refs = REFERENCE_DATA[classKey];
  const [ticker, setTicker] = useState(refs[0].code);
  const [quantite, setQuantite] = useState(10);
  const [prixAchat, setPrixAchat] = useState(refs[0].price || 0);
  const [coursActuel, setCoursActuel] = useState(refs[0].price || 0);

  const [emetteur, setEmetteur] = useState(refs[0].code);
  const [montant, setMontant] = useState(500000);
  const [taux, setTaux] = useState(refs[0].rate || ACC(classKey).defaultRate);
  const [echeance, setEcheance] = useState("");

  const handleRefChange = (code) => {
    const r = refs.find((x) => x.code === code);
    if (isEquity) {
      setTicker(code);
      setPrixAchat(r.price);
      setCoursActuel(r.price);
    } else {
      setEmetteur(code);
      setTaux(r.rate);
    }
  };

  const submit = () => {
    if (isEquity) {
      const r = refs.find((x) => x.code === ticker);
      onSubmit({ ticker, nom: r?.name || ticker, quantite: Number(quantite), prixAchat: Number(prixAchat), coursActuel: Number(coursActuel) });
    } else {
      const r = refs.find((x) => x.code === emetteur);
      onSubmit({ emetteur: r?.name || emetteur, montant: Number(montant), taux: Number(taux), echeance });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Ajouter une ligne — {ACC(classKey).label}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {isEquity ? (
          <div className="form-grid">
            <label>Titre
              <select value={ticker} onChange={(e) => handleRefChange(e.target.value)}>
                {refs.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.name}</option>)}
              </select>
            </label>
            <label>Quantité
              <input type="number" min="1" value={quantite} onChange={(e) => setQuantite(e.target.value)} />
            </label>
            <label>Prix d'achat (FCFA)
              <input type="number" min="0" value={prixAchat} onChange={(e) => setPrixAchat(e.target.value)} />
            </label>
            <label>Cours actuel (FCFA)
              <input type="number" min="0" value={coursActuel} onChange={(e) => setCoursActuel(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="form-grid">
            <label>Émetteur
              <select value={emetteur} onChange={(e) => handleRefChange(e.target.value)}>
                {refs.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
              </select>
            </label>
            <label>Montant investi (FCFA)
              <input type="number" min="0" value={montant} onChange={(e) => setMontant(e.target.value)} />
            </label>
            <label>Taux annuel (%)
              <input type="number" step="0.1" value={taux} onChange={(e) => setTaux(e.target.value)} />
            </label>
            <label>Échéance
              <input type="date" value={echeance} onChange={(e) => setEcheance(e.target.value)} />
            </label>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={submit}><Check size={15} /> Ajouter au portefeuille</button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SIMULATOR
   ============================================================ */
function Simulator() {
  const [classKey, setClassKey] = useState("actions");
  const [initial, setInitial] = useState(1000000);
  const [monthly, setMonthly] = useState(50000);
  const [rate, setRate] = useState(ACC("actions").defaultRate);
  const [years, setYears] = useState(10);

  useEffect(() => { setRate(ACC(classKey).defaultRate); }, [classKey]);

  const { rows, chartData, finalValue, finalInvested } = useMemo(
    () => simulate(Number(initial), Number(monthly), Number(rate), Number(years)),
    [initial, monthly, rate, years]
  );

  return (
    <div>
      <PageHeader title="Simulateur d'investissement" subtitle="Projette la croissance de ton capital selon la classe d'actifs choisie" />

      <div className="grid-2">
        <div className="panel">
          <h3>Paramètres</h3>
          <div className="form-grid">
            <label>Classe d'actifs
              <select value={classKey} onChange={(e) => setClassKey(e.target.value)}>
                {ASSET_CLASSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label>Montant initial (FCFA)
              <input type="number" min="0" value={initial} onChange={(e) => setInitial(e.target.value)} />
            </label>
            <label>Versement mensuel (FCFA)
              <input type="number" min="0" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </label>
            <label>Rendement annuel attendu (%)
              <input type="number" step="0.1" value={rate} onChange={(e) => setRate(e.target.value)} />
            </label>
            <label>Durée (années)
              <input type="number" min="1" max="30" value={years} onChange={(e) => setYears(e.target.value)} />
            </label>
          </div>
          <p className="muted small">
            Taux indicatif de la classe sélectionnée : {ACC(classKey).defaultRate}% / an. Modifiable selon tes hypothèses.
          </p>
        </div>

        <div className="panel">
          <h3>Résultat à {years} ans</h3>
          <div className="cards-row single-col">
            <StatCard label="Valeur projetée" value={`${fmt(finalValue)} FCFA`} icon={Wallet} tone="up" />
            <StatCard label="Capital investi" value={`${fmt(finalInvested)} FCFA`} icon={TrendingUp} tone="neutral" />
            <StatCard label="Gain estimé" value={`+${fmt(finalValue - finalInvested)} FCFA`} icon={ArrowUpRight} tone="up" />
          </div>
        </div>
      </div>

      <div className="panel">
        <h3>Projection de croissance</h3>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="simVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F0B90B" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#F0B90B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="simInv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8FA0B8" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8FA0B8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2B3139" vertical={false} />
              <XAxis dataKey="annee" stroke="#848E9C" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#848E9C" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} width={70} />
              <RTooltip
                formatter={(v) => `${fmt(v)} FCFA`}
                contentStyle={{ background: "#1E2329", border: "1px solid #2B3139", borderRadius: 8, color: "#EAECEF" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "#848E9C" }} />
              <Area type="monotone" dataKey="investi" name="Capital investi" stroke="#8FA0B8" fill="url(#simInv)" strokeWidth={2} />
              <Area type="monotone" dataKey="valeur" name="Valeur projetée" stroke="#F0B90B" fill="url(#simVal)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h3>Détail année par année</h3>
        <table className="table">
          <thead><tr><th>Année</th><th>Capital investi</th><th>Valeur projetée</th><th>Gain cumulé</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.annee}>
                <td>{r.annee}</td>
                <td>{fmt(r.investi)} FCFA</td>
                <td>{fmt(r.valeur)} FCFA</td>
                <td className="up">+{fmt(r.valeur - r.investi)} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function simulate(initial, monthly, rateAnnual, years) {
  const monthlyRate = rateAnnual / 100 / 12;
  let balance = initial;
  let invested = initial;
  const chartData = [{ annee: "0", valeur: balance, investi: invested }];
  const rows = [];
  for (let m = 1; m <= years * 12; m++) {
    balance = balance * (1 + monthlyRate) + monthly;
    invested += monthly;
    if (m % 12 === 0) {
      const annee = m / 12;
      chartData.push({ annee: String(annee), valeur: Math.round(balance), investi: Math.round(invested) });
      rows.push({ annee, valeur: Math.round(balance), investi: Math.round(invested) });
    }
  }
  return { rows, chartData, finalValue: balance, finalInvested: invested };
}

/* ============================================================
   CALENDLY
   ============================================================ */
function CalendlyWidget({ url }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const existing = document.querySelector('script[src="https://assets.calendly.com/assets/external/widget.js"]');
    const init = () => {
      if (window.Calendly && containerRef.current) {
        containerRef.current.innerHTML = "";
        window.Calendly.initInlineWidget({ url, parentElement: containerRef.current });
      }
    };
    if (existing && window.Calendly) {
      init();
    } else {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = init;
      document.body.appendChild(script);
    }
  }, [url]);

  return <div ref={containerRef} className="calendly-embed" />;
}

/* ============================================================
   RENDEZ-VOUS
   ============================================================ */
function Appointments({ appointments, setAppointments }) {
  const [form, setForm] = useState({
    nom: "", email: "", telephone: "", pays: "", theme: "Général", date: "", message: "",
  });
  const [sent, setSent] = useState(null);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.nom || !form.email) return;
    const entry = { id: uid(), ...form, createdAt: new Date().toISOString() };
    setAppointments((a) => [entry, ...a]);
    setSent(entry);
  };

  const waText = (e) =>
    encodeURIComponent(
      `Bonjour, je souhaite prendre rendez-vous.\nNom : ${e.nom}\nPays : ${e.pays}\nThème : ${e.theme}\nDate souhaitée : ${e.date}\nMessage : ${e.message}`
    );
  const mailtoLink = (e) =>
    `mailto:${BRAND.advisorEmail}?subject=${encodeURIComponent("Demande de rendez-vous — " + e.theme)}&body=${waText(e)}`;

  return (
    <div>
      <PageHeader title="Prendre rendez-vous" subtitle="Planifie un échange sur ton projet d'investissement à la BRVM" />

      <div className="panel">
        <h3>Réserver un créneau</h3>
        <p className="muted small">Choisis directement un horaire disponible dans l'agenda ci-dessous.</p>
        <CalendlyWidget url={BRAND.calendlyUrl} />
      </div>

      <div className="grid-2">
        <div className="panel">
          <h3>Ou envoyer une demande directe</h3>
          <p className="muted small">Pas de créneau qui te convient ? Décris ta demande, elle te sera transmise par email ou WhatsApp.</p>
          <div className="form-grid">
            <label>Nom complet
              <input value={form.nom} onChange={(e) => update("nom", e.target.value)} placeholder="Ton nom" />
            </label>
            <label>Email
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="toi@email.com" />
            </label>
            <label>Téléphone / WhatsApp
              <input value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="+33 6 ..." />
            </label>
            <label>Pays de résidence
              <input value={form.pays} onChange={(e) => update("pays", e.target.value)} placeholder="France, USA, ..." />
            </label>
            <label>Thème
              <select value={form.theme} onChange={(e) => update("theme", e.target.value)}>
                <option>Général</option>
                {ASSET_CLASSES.map((c) => <option key={c.key}>{c.label}</option>)}
              </select>
            </label>
            <label>Date souhaitée
              <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} />
            </label>
            <label className="full">Message
              <textarea rows={3} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Décris brièvement ton projet..." />
            </label>
          </div>
          <button className="btn-primary" onClick={submit}><Send size={15} /> Envoyer la demande</button>

          {sent && (
            <div className="confirm-box">
              <p><Check size={15} /> Demande enregistrée. Finalise l'envoi via :</p>
              <div className="confirm-actions">
                <a className="btn-ghost" href={mailtoLink(sent)}><Mail size={15} /> Email</a>
                <a className="btn-ghost" target="_blank" rel="noreferrer" href={`https://wa.me/${BRAND.advisorWhatsapp}?text=${waText(sent)}`}>
                  <MessageCircle size={15} /> WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>Historique des demandes</h3>
          {appointments.length === 0 ? (
            <p className="muted">Aucune demande enregistrée pour le moment.</p>
          ) : (
            <ul className="appt-list">
              {appointments.map((a) => (
                <li key={a.id}>
                  <div>
                    <b>{a.nom}</b> — {a.theme}
                    <div className="muted small">{a.pays} · {a.date || "date à définir"}</div>
                  </div>
                  <button className="icon-btn danger" onClick={() => setAppointments((list) => list.filter((x) => x.id !== a.id))}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.app-root {
  --bg: #0B0E11;
  --surface: #181A20;
  --surface-2: #1E2329;
  --border: #2B3139;
  --text: #EAECEF;
  --muted: #848E9C;
  --emerald: #0ECB81;
  --gold: #F0B90B;
  --coral: #F6465D;
  display: flex;
  min-height: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: 'IBM Plex Sans', sans-serif;
}
.app-root * { box-sizing: border-box; }
.app-root h1, .app-root h3 { font-family: 'Fraunces', serif; font-weight: 500; margin: 0; }

.sidebar {
  width: 250px;
  min-width: 250px;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  gap: 18px;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 6px; }
.brand-mark {
  width: 34px; height: 34px; border-radius: 8px;
  background: var(--gold);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', serif; font-weight: 600; color: #0B0E11; font-size: 13px;
}
.brand-name { font-family: 'Fraunces', serif; font-size: 15px; letter-spacing: 0.5px; }
.brand-tagline { font-size: 11px; color: var(--muted); }

.side-total {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.side-total-label { font-size: 11px; color: var(--muted); }
.side-total-value { font-family: 'IBM Plex Mono', monospace; font-size: 18px; }
.side-total-value em { font-style: normal; font-size: 11px; color: var(--muted); }

.nav { display: flex; flex-direction: column; gap: 2px; flex: 1; overflow-y: auto; }
.nav-item {
  display: flex; align-items: center; gap: 10px;
  background: none; border: none; color: var(--muted);
  padding: 9px 10px; border-radius: 8px; text-align: left;
  font-size: 13.5px; cursor: pointer; position: relative;
}
.nav-item:hover { background: var(--surface-2); color: var(--text); }
.nav-item.active { background: var(--surface-2); color: var(--text); }
.nav-item.active::before {
  content: ''; position: absolute; left: -14px; top: 0; bottom: 0; width: 3px;
  background: var(--gold); border-radius: 2px;
}
.nav-item span { flex: 1; }
.nav-chev { color: var(--gold); }
.side-foot { font-size: 10.5px; color: var(--muted); padding: 0 6px; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.ticker {
  background: var(--surface-2); border-bottom: 1px solid var(--border);
  overflow: hidden; white-space: nowrap; padding: 8px 0;
}
.ticker-track { display: inline-flex; animation: scroll 40s linear infinite; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.ticker-item {
  display: inline-flex; align-items: center; gap: 6px; margin-right: 28px;
  font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--muted);
}
.ticker-item b { color: var(--text); }
.ticker-item .up { color: var(--emerald); display: flex; align-items: center; }
.ticker-item .down { color: var(--coral); display: flex; align-items: center; }

.content { padding: 26px 32px 60px; overflow-y: auto; }
.page-header { margin-bottom: 18px; }
.page-header h1 { font-size: 24px; margin-bottom: 4px; }
.muted { color: var(--muted); font-size: 13.5px; }
.muted.small { font-size: 12px; margin: 4px 0 12px; }

.cards-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.cards-row.single-col { grid-template-columns: 1fr; }
.stat-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px 16px; display: flex; align-items: center; gap: 12px;
}
.stat-icon { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: var(--surface-2); }
.stat-icon.up { color: var(--emerald); } .stat-icon.down { color: var(--coral); } .stat-icon.neutral { color: var(--gold); }
.stat-label { font-size: 11.5px; color: var(--muted); margin-bottom: 2px; }
.stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 16px; }
.stat-value.up { color: var(--emerald); } .stat-value.down { color: var(--coral); }

.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.panel {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 18px 20px; margin-bottom: 16px;
}
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.panel h3 { font-size: 15.5px; margin-bottom: 10px; }

.table { width: 100%; border-collapse: collapse; font-size: 13px; }
.table th { text-align: left; color: var(--muted); font-weight: 500; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.4px; padding: 8px 6px; border-bottom: 1px solid var(--border); }
.table td { padding: 10px 6px; border-bottom: 1px solid var(--border); }
.table tr:last-child td { border-bottom: none; }
.table.compact td, .table.compact th { padding: 6px 6px; font-size: 12.5px; }
.table .up { color: var(--emerald); } .table .down { color: var(--coral); }
.table tr.clickable { cursor: pointer; }
.table tr.clickable:hover { background: var(--surface-2); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 8px; }

.legend-list { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; color: var(--muted); }

.empty-state { background: var(--surface); border: 1px dashed var(--border); border-radius: 12px; padding: 32px; text-align: center; }
.empty-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 16px; }
.chip { background: var(--surface-2); border: 1px solid; color: var(--text); padding: 7px 12px; border-radius: 20px; font-size: 12.5px; cursor: pointer; }
.chip:hover { filter: brightness(1.2); }

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--gold); color: #0B0E11; border: none; border-radius: 8px;
  padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
}
.btn-primary:hover { filter: brightness(1.08); }
.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border); border-radius: 8px;
  padding: 9px 14px; font-size: 13px; cursor: pointer; text-decoration: none;
}
.icon-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 4px; border-radius: 6px; }
.icon-btn:hover { background: var(--surface-2); color: var(--text); }
.icon-btn.danger:hover { color: var(--coral); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.form-grid label.full { grid-column: 1 / -1; }
.form-grid label { display: flex; flex-direction: column; gap: 5px; font-size: 12.5px; color: var(--muted); }
.form-grid input, .form-grid select, .form-grid textarea {
  background: var(--surface-2); border: 1px solid var(--border); color: var(--text);
  border-radius: 7px; padding: 8px 10px; font-size: 13px; font-family: inherit;
}
.form-grid input:focus, .form-grid select:focus, .form-grid textarea:focus { outline: 1.5px solid var(--emerald); }

.modal-overlay { position: fixed; inset: 0; background: rgba(5,10,18,0.65); display: flex; align-items: center; justify-content: center; z-index: 50; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; width: 460px; max-width: 92vw; }
.modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

.confirm-box { margin-top: 14px; padding: 12px 14px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px; font-size: 13px; }
.confirm-box p { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; color: var(--emerald); }
.confirm-actions { display: flex; gap: 10px; }

.appt-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.appt-list li { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--surface-2); border: 1px solid var(--border); border-radius: 9px; font-size: 13px; }

.calendly-embed { min-height: 700px; border-radius: 10px; overflow: hidden; }

@media (max-width: 900px) {
  .grid-2 { grid-template-columns: 1fr; }
  .cards-row { grid-template-columns: repeat(2, 1fr); }
  .sidebar { width: 210px; min-width: 210px; }
}
`;
