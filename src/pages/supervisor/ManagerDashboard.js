import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { getMyProfile } from "../../api"
import "../../styles/dashboard.css"
import "../../styles/managerDashboard.css"

import {
  getManagerDashboard,
  getManagerCotisationsHistory,
  getManagerDashboardByPeriod,
  getMemberContributionsForManagerAll,
  getPendingForManager,
  validateCotisation,
  rejectCotisation,
  parseDate,
  getUsers,
} from "../../api"

export default function ManagerDashboard() {
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState("home")

  const [supervisorProfile, setSupervisorProfile] = useState(null)
  const [allCotisations, setAllCotisations] = useState([]) // 🔥 IMPORTANT
  const [pending, setPending] = useState([])
  const [list, setList] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [hasFilters, setHasFilters] = useState(false)
  
 // 🔹 Stats dashboard
  const [stats, setStats] = useState({
    totalContributions: 0,
    totalCommissions: 0,
    totalNetAmount: 0,
    totalCommitteeShare: 0,
    totalManagerShare: 0,
    totalAdminShare: 0,
    memberCount: 0,
  })

  // ---------------- UTILS ----------------

  const normalizeStatus = (cot) => {
    const raw = cot.status ?? cot.etat
    if (!raw) return "pending"
    const s = String(raw).toLowerCase()
    if (s === "valide" || s === "validated") return "validated"
    if (s === "rejete" || s === "rejected") return "rejected"
    return "pending"
  }

  const formatDate = (date) => {
    const d = parseDate(date)
    return d ? d.toLocaleDateString("fr-FR") : "-"
  }

  const formatAmount = (amount) => {
    const num = parseFloat(amount) || 0
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
    }).format(num)
  }
  
  // Initialize: load profile, pending, and members
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)

        const profile = await getMyProfile()
        setSupervisorProfile(profile)

        const pendingData = await getPendingForManager()
        setPending(Array.isArray(pendingData) ? pendingData : [])

        const usersData = await getUsers()
        setMembers(Array.isArray(usersData) ? usersData : [])

        // 🔥 API QUI RENVOIE LE JSON DU SWAGGER
        const dashboardData = await getManagerDashboard()

        // Extract statistics
        if (dashboardData) {
          setStats({
            totalContributions: dashboardData.totalContributions || 0,
            totalCommissions: dashboardData.totalCommissions || 0,
            totalNetAmount: dashboardData.totalNetAmount || 0,
            totalCommitteeShare: dashboardData.totalCommitteeShare || 0,
            totalManagerShare: dashboardData.totalManagerShare || 0,
            totalAdminShare: dashboardData.totalAdminShare || 0,
            memberCount: dashboardData.memberCount || 0,
          })
        }

        const flattened = await getManagerCotisationsHistory()
        setAllCotisations(flattened)
        setList(flattened)
      } catch (err) {
        console.error(err)
        setError("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const dashboardProps = {
    getUserName: () => supervisorProfile?.name || "Superviseur",
    getInitials: (name) => {
      const parts = (supervisorProfile?.name || "SV").split(" ")
      return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "V")
    },
    activeNav,
    setActiveNav,
    handleHomeRedirect: () => navigate("/manager/dashboard"),
    handleProfileRedirect: () => navigate("/supervisor/profile"),
    handleSignOut: async () => {
      try {
        const { signOut } = await import("firebase/auth")
        const { auth } = await import("../../firebase/firebase")
        await signOut(auth).catch(() => {})
      } catch {}
      localStorage.removeItem("idToken")
      localStorage.removeItem("token")
      navigate("/")
    },
  }

    // ---------------- FILTERS ----------------
    const handleFilterPeriod = async () => {
    if (!from && !to) {
      setError("Veuillez sélectionner une période")
      return
    }
    try {
      setError("")
      setTableLoading(true)
      const data = await getManagerDashboardByPeriod(from, to)
      setList(Array.isArray(data) ? data : [])
      setHasFilters(true)
    } catch (err) {
      setError("Erreur recherche période")
      setList([])
      setHasFilters(true)
    } finally {
      setTableLoading(false)
    }
  }

  const handleMemberSelect = async () => {
    if (!selectedMemberId.trim()) {
      setError("Veuillez sélectionner un membre")
      return
    }
    try {
      setError("")
      setTableLoading(true)
      const data = await getMemberContributionsForManagerAll(selectedMemberId)
      setList(Array.isArray(data) ? data : [])
      setHasFilters(true)
    } catch (err) {
      console.error("Erreur recherche membre:", err)
      setError(err.response?.status === 404 ? "Aucune cotisation trouvée pour ce membre" : (err.message || "Erreur recherche membre"))
      setList([])
      setHasFilters(true)
    } finally {
      setTableLoading(false)
    }
  }

   const handleReset = () => {
    setFrom("")
    setTo("")
    setSelectedMemberId("")
    setHasFilters(false)
    setError("")
    setList(allCotisations) // 🔥
  }

  // ---------------- ACTIONS ----------------
  const handleValidate = async (id) => {
    try {
      await validateCotisation(id)
      setError("")
      const updatedPending = await getPendingForManager()
      setPending(Array.isArray(updatedPending) ? updatedPending : [])
      // Refresh list if filters are active
      if (from || to) await handleFilterPeriod()
      else if (selectedMemberId) await handleMemberSelect()
    } catch (err) {
      setError(err.message || "Erreur validation cotisation")
    }
  }

  const handleReject = async (id) => {
    const reason = prompt("Raison du rejet:")
    if (!reason) return
    try {
      await rejectCotisation(id, reason)
      setError("")
      const updatedPending = await getPendingForManager()
      setPending(Array.isArray(updatedPending) ? updatedPending : [])
      // Refresh list if filters are active
      if (from || to) await handleFilterPeriod()
      else if (selectedMemberId) await handleMemberSelect()
    } catch (err) {
      setError(err.message || "Erreur rejet cotisation")
    }
  }

  // Show loading screen while initializing
  if (loading) {
    return (
      <div className="dashboard-container" style={{ padding: "40px 20px" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <p style={{ fontSize: "16px", marginBottom: "10px" }}>Chargement du tableau de bord...</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  const committeeName =
    supervisorProfile?.committee?.name ||
    supervisorProfile?.committee?.libelle ||
    "Mon Comité"

   // ---------------- RENDER ----------------
  return (
    <DashboardLayout {...dashboardProps}>
      <div className="content-left">
        {/* Hero Card with Committee Name */}
        <div className="profile-hero-card">
          <div className="profile-hero-content">
            <div className="profile-avatar-large">
              {dashboardProps.getInitials(supervisorProfile?.name)}
            </div>
            <div className="profile-hero-info">
              <h2 className="profile-name">Tableau de bord - {committeeName}</h2>
              <p className="profile-role">Gestion des cotisations du comité</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Cotisations</div>
            <div className="stat-value">{formatAmount(stats.totalContributions)}</div>
            <div className="stat-subtitle">{stats.memberCount} membre(s)</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Commissions</div>
            <div className="stat-value">{formatAmount(stats.totalCommissions)}</div>
            <div className="stat-subtitle">Frais appliqués</div>
          </div>

          <div className="stat-card accent">
            <div className="stat-label">Cotisations Nettes</div>
            <div className="stat-label">Net comité</div><div className="stat-value accent-value">{formatAmount(stats.totalNetAmount)}</div>
            <div className="stat-subtitle">Après commissions</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Cotisations En Attente</div>
            <div className="stat-value">{pending.length}</div>
            <div className="stat-subtitle">À valider</div>
          </div>
        </div>

       {/* Distribution Card */}
        <div className="info-card">
          <h3 className="card-title">Distribution des Cotisations</h3>

          <div className="distribution-container">

            {[
              { label: "Comité", amount: stats.totalCommitteeShare, className: "committee" },
              { label: "Manager", amount: stats.totalManagerShare, className: "manager" },
              { label: "Admin", amount: stats.totalAdminShare, className: "admin" },
            ].map((item) => {
              const pct =
                stats.totalNetAmount > 0
                  ? (Number(item.amount || 0) / Number(stats.totalNetAmount)) * 100
                  : 0

              return (
                <div className="distribution-item" key={item.label}>
                  <div className="distribution-label">
                    <span className="distribution-name">{item.label}</span>
                    <span className="distribution-percent">{pct.toFixed(1)}%</span>
                  </div>

                  <div className="distribution-bar">
                    <div
                      className={`distribution-fill ${item.className}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="distribution-amount">
                    {formatAmount(item.amount)}
                  </div>
                </div>
              )
            })}

          </div>
        </div>


        {/* Filters Section */}
        <div className="info-card">
          <h3 className="card-title">Filtrer les cotisations</h3>

          {error && <div className="error-banner">{error}</div>}

          <div className="filters-section">
            {/* Filter by Period */}
            <div className="filter-group">
              <label className="filter-label">Par période</label>
              <div className="filter-row">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  placeholder="Date de début"
                  className="filter-input"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="Date de fin"
                  className="filter-input"
                />
                <button className="btn-primary" onClick={handleFilterPeriod}>
                  Filtrer
                </button>
              </div>
            </div>

            {/* Filter by Member Dropdown */}
            <div className="filter-group">
              <label className="filter-label">Par membre</label>
              <div className="filter-row">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="filter-input filter-select"
                >
                  <option value="">-- Sélectionner un membre --</option>
                  {members.map((member) => (
                    <option key={member.id || member._id} value={member.id || member._id}>
                      {member.name} {member.surname ? `${member.surname}` : ""}
                    </option>
                  ))}
                </select>
                <button className="btn-primary" onClick={handleMemberSelect}>
                  Chercher
                </button>
              </div>
            </div>

            <button className="btn-secondary" onClick={handleReset}>
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Cotisations List */}
        <div className="info-card">
          <h3 className="card-title">Historique des Cotisations</h3>

          {tableLoading && <p className="loading-text">Chargement des données...</p>}

          {!tableLoading && !hasFilters && (
            <p className="empty-text">
              Sélectionnez un filtre (période ou membre) pour afficher les cotisations.
            </p>
          )}

          {!tableLoading && list.length === 0 && hasFilters && (
            <p className="empty-text">
              Aucune cotisation trouvée pour les critères sélectionnés.
            </p>
          )}

          {!tableLoading && list.length > 0 && (
            <div className="table-responsive">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Membre</th>
                    <th>Montant</th>
                    <th>Méthode</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((cot) => (
                    <tr key={cot.id || cot._id}>
                      <td>{formatDate(cot.createdAt || cot.date)}</td>
                      <td>
                        {cot.memberName ||
                          cot.member?.name ||
                          cot.userName ||
                          cot.user?.name ||
                          "-"}
                      </td>
                      <td className="amount-cell">
                        {formatAmount(cot.amount ?? cot.montant)}
                      </td>
                      <td className="method-cell">
                        <span className="method-badge">{cot.method || cot.paymentMethod || cot.modePaiement || "-"}</span>
                      </td>
                      <td>
                        <span
                          className={`status-badge status-${(
                            cot.status || "pending"
                          ).toLowerCase()}`}
                        >
                          {cot.status ? cot.status.charAt(0).toUpperCase() + cot.status.slice(1) : "En attente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pending Cotisations Sidebar */}
      <div className="content-right">
        <div className="widget-card pending-widget">
          <h3 className="widget-title">⏳ En attente ({pending.length})</h3>

          {pending.length === 0 && (
            <p className="empty-widget-text">Aucune cotisation en attente</p>
          )}

          {pending.map((cot) => (
            <div key={cot.id || cot._id} className="pending-item">
              {/* Photo if available */}
              {(cot.proofUrl || cot.receipt || cot.photo || cot.image) && (
                <div className="pending-photo">
                  <img
                    src={cot.proofUrl || cot.receipt || cot.photo || cot.image}
                    alt="Receipt"
                    title="Reçu/Preuve de paiement"
                  />
                </div>
              )}

              <div className="pending-header">
                <strong className="pending-member">
                  {cot.memberName ||
                    cot.member?.name ||
                    cot.userName ||
                    cot.user?.name ||
                    "Membre"}
                </strong>
                <span className="pending-amount">
                  {formatAmount(cot.amount ?? cot.montant)}
                </span>
              </div>

              <div className="pending-date">{formatDate(cot.createdAt || cot.date)}</div>

              {/* Payment Method */}
              {(cot.method || cot.paymentMethod || cot.modePaiement) && (
                <div className="pending-payment-method">
                  💳 {cot.method || cot.paymentMethod || cot.modePaiement}
                </div>
              )}

              <div className="pending-actions">
                <button
                  className="btn-save"
                  onClick={() => handleValidate(cot.id || cot._id)}
                  title="Valider cette cotisation"
                >
                  ✓ Valider
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => handleReject(cot.id || cot._id)}
                  title="Rejeter cette cotisation"
                >
                  ✕ Rejeter
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

