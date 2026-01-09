import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import { getMyProfile } from "../../api"
import "../../styles/dashboard.css"
import "../../styles/managerDashboard.css"

import {
  getManagerDashboard,
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

  // Profile & Data
  const [supervisorProfile, setSupervisorProfile] = useState(null)
  const [allCotisations, setAllCotisations] = useState([])
  const [pending, setPending] = useState([])
  const [list, setList] = useState([])
  const [members, setMembers] = useState([])
  
  // Loading & Error States
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Filter States
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [activeFilter, setActiveFilter] = useState(null) // 'period' | 'member' | null
  
  // Modal State for Create Cotisation
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Stats
  const [stats, setStats] = useState({
    totalContributions: 0,
    totalCommissions: 0,
    totalNetAmount: 0,
    totalCommitteeShare: 0,
    totalManagerShare: 0,
    totalAdminShare: 0,
    memberCount: 0,
  })

  // ============================================================================
  // UTILS
  // ============================================================================

  const formatDate = (date) => {
    if (date && typeof date === 'object' && date._seconds) {
      const d = new Date(date._seconds * 1000)
      return d.toLocaleDateString("fr-FR")
    }
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
  
  const flattenContributions = (dashboardData) => {
    if (!dashboardData || !dashboardData.memberStats) return []
    
    const flattened = []
    dashboardData.memberStats.forEach((memberStat) => {
      if (memberStat.contributions && Array.isArray(memberStat.contributions)) {
        memberStat.contributions.forEach((contrib) => {
          flattened.push({
            ...contrib,
            memberName: memberStat.memberName || "Membre",
            memberId: memberStat.memberId,
          })
        })
      }
    })
    
    return flattened.sort((a, b) => {
      const dateA = a.createdAt?._seconds || 0
      const dateB = b.createdAt?._seconds || 0
      return dateB - dateA
    })
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setError("")

        // Load profile
        const profile = await getMyProfile()
        setSupervisorProfile(profile)

        // Load pending cotisations
        const pendingData = await getPendingForManager()
        setPending(Array.isArray(pendingData) ? pendingData : [])

        // Load committee members
        const usersData = await getUsers()
        setMembers(Array.isArray(usersData) ? usersData : [])

        // Load dashboard data
        const dashboardData = await getManagerDashboard()

        if (dashboardData) {
          // Extract statistics
          setStats({
            totalContributions: dashboardData.totalContributions || 0,
            totalCommissions: dashboardData.totalCommissions || 0,
            totalNetAmount: dashboardData.totalNetAmount || 0,
            totalCommitteeShare: dashboardData.totalCommitteeShare || 0,
            totalManagerShare: dashboardData.totalManagerShare || 0,
            totalAdminShare: dashboardData.totalAdminShare || 0,
            memberCount: dashboardData.memberCount || 0,
          })
          
          // Flatten contributions for display
          const flattened = flattenContributions(dashboardData)
          setAllCotisations(flattened)
          setList(flattened)
        }
      } catch (err) {
        console.error("Erreur init:", err)
        setError("Erreur lors du chargement des données")
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  // ============================================================================
  // DASHBOARD PROPS
  // ============================================================================

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

  // ============================================================================
  // FILTERS
  // ============================================================================

  const handleFilterPeriod = async () => {
    if (!from || !to) {
      setError("Veuillez sélectionner une date de début et de fin")
      return
    }
    
    try {
      setError("")
      setTableLoading(true)
      setActiveFilter('period')
      
      const data = await getManagerDashboardByPeriod(from, to)
      const flattened = flattenContributions(data)
      setList(flattened)
    } catch (err) {
      console.error("Erreur recherche période:", err)
      setError("Erreur lors de la recherche par période")
      setList([])
    } finally {
      setTableLoading(false)
    }
  }

  const handleMemberSelect = async () => {
    if (!selectedMemberId || selectedMemberId.trim() === "") {
      setError("Veuillez sélectionner un membre")
      return
    }
    
    try {
      setError("")
      setTableLoading(true)
      setActiveFilter('member')
      
      console.log("🔍 Recherche pour le membre:", selectedMemberId)
      
      const data = await getMemberContributionsForManagerAll(selectedMemberId)
      
      console.log("📊 Données reçues:", data)
      
      // Handle different response formats
      let contributions = []
      if (Array.isArray(data)) {
        contributions = data
      } else if (data?.memberStats) {
        contributions = flattenContributions(data)
      } else if (data?.contributions) {
        contributions = Array.isArray(data.contributions) ? data.contributions : []
      }
      
      setList(contributions)
      
      if (contributions.length === 0) {
        setError("Aucune cotisation trouvée pour ce membre")
      }
    } catch (err) {
      console.error("Erreur recherche membre:", err)
      const status = err.response?.status
      
      if (status === 404) {
        setError("Aucune cotisation trouvée pour ce membre")
      } else if (status === 403) {
        setError("Vous n'avez pas accès aux cotisations de ce membre")
      } else {
        setError(err.message || "Erreur lors de la recherche du membre")
      }
      setList([])
    } finally {
      setTableLoading(false)
    }
  }

  const handleReset = () => {
    setFrom("")
    setTo("")
    setSelectedMemberId("")
    setActiveFilter(null)
    setError("")
    setList(allCotisations)
  }

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const refreshData = async () => {
    try {
      // Refresh pending
      const updatedPending = await getPendingForManager()
      setPending(Array.isArray(updatedPending) ? updatedPending : [])
      
      // Refresh dashboard
      const dashboardData = await getManagerDashboard()
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
        
        const flattened = flattenContributions(dashboardData)
        setAllCotisations(flattened)
        
        // Only update list if no active filter
        if (!activeFilter) {
          setList(flattened)
        } else if (activeFilter === 'period' && from && to) {
          await handleFilterPeriod()
        } else if (activeFilter === 'member' && selectedMemberId) {
          await handleMemberSelect()
        }
      }
    } catch (err) {
      console.error("Erreur refresh:", err)
    }
  }

  const handleValidate = async (id) => {
    try {
      await validateCotisation(id)
      setError("")
      await refreshData()
    } catch (err) {
      console.error("Erreur validation:", err)
      setError(err.message || "Erreur validation cotisation")
    }
  }

  const handleReject = async (id) => {
    const reason = prompt("Raison du rejet:")
    if (!reason || reason.trim() === "") {
      alert("La raison du rejet est obligatoire")
      return
    }
    
    try {
      await rejectCotisation(id, reason)
      setError("")
      await refreshData()
    } catch (err) {
      console.error("Erreur rejet:", err)
      setError(err.message || "Erreur rejet cotisation")
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Chargement du tableau de bord...</p>
      </div>
    )
  }

  const committeeName =
    supervisorProfile?.committee?.name ||
    supervisorProfile?.committee?.libelle ||
    "Mon Comité"

  const getSelectedMemberName = () => {
    if (!selectedMemberId) return ""
    const member = members.find(m => (m.id || m._id) === selectedMemberId)
    return member ? `${member.name} ${member.surname || ""}`.trim() : ""
  }

  return (
    <DashboardLayout {...dashboardProps}>
      <div className="content-left">
        {/* Hero Card */}
        <div className="profile-hero-card">
          <div className="profile-hero-content">
            <div className="profile-avatar-large">
              {dashboardProps.getInitials(supervisorProfile?.name)}
            </div>
            <div className="profile-hero-info">
              <h2 className="profile-name">Tableau de bord - {committeeName}</h2>
              <p className="profile-role">Gestion des cotisations du comité</p>
              <div className="profile-actions" style={{ marginTop: "16px" }}>
                <button 
                  className="btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <span className="btn-icon">➕</span>
                  Soumettre une cotisation
                </button>
              </div>
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
            <div className="stat-value accent-value">{formatAmount(stats.totalNetAmount)}</div>
            <div className="stat-subtitle">Après commissions</div>
          </div>

          <div className="stat-card">
            <div className="stat-label">En Attente</div>
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

          {error && (
            <div className="error-banner">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          <div className="filters-section">
            {/* Filter by Period */}
            <div className="filter-group">
              <label className="filter-label">📅 Par période</label>
              <div className="filter-row">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="filter-input"
                  placeholder="Date de début"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="filter-input"
                  placeholder="Date de fin"
                />
                <button 
                  className="btn-primary" 
                  onClick={handleFilterPeriod}
                  disabled={tableLoading}
                >
                  {tableLoading && activeFilter === 'period' ? "⏳" : "🔍"} Filtrer
                </button>
              </div>
            </div>

            {/* Filter by Member */}
            <div className="filter-group">
              <label className="filter-label">👤 Par membre</label>
              <div className="filter-row">
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    console.log("🎯 Membre sélectionné:", e.target.value)
                    setSelectedMemberId(e.target.value)
                  }}
                  className="filter-input filter-select"
                >
                  <option value="">-- Sélectionner un membre --</option>
                  {members.map((member) => {
                    const memberId = member.id || member._id
                    const memberName = `${member.name || ""} ${member.surname || ""}`.trim()
                    return (
                      <option key={memberId} value={memberId}>
                        {memberName || memberId}
                      </option>
                    )
                  })}
                </select>
                <button 
                  className="btn-primary" 
                  onClick={handleMemberSelect}
                  disabled={tableLoading || !selectedMemberId}
                >
                  {tableLoading && activeFilter === 'member' ? "⏳" : "🔍"} Chercher
                </button>
              </div>
            </div>

            {/* Reset Button */}
            {activeFilter && (
              <button 
                className="btn-secondary" 
                onClick={handleReset}
                style={{ width: "100%" }}
              >
                ↺ Réinitialiser les filtres
              </button>
            )}
          </div>

          {/* Active Filter Indicator */}
          {activeFilter && (
            <div style={{ 
              marginTop: "16px", 
              padding: "12px", 
              background: "#eff6ff", 
              borderRadius: "8px",
              fontSize: "14px",
              color: "#1e40af"
            }}>
              {activeFilter === 'period' && (
                <span>📅 Filtre actif: Période du {from} au {to}</span>
              )}
              {activeFilter === 'member' && (
                <span>👤 Filtre actif: {getSelectedMemberName()}</span>
              )}
            </div>
          )}
        </div>

        {/* Cotisations List */}
        <div className="info-card">
          <h3 className="card-title">
            📋 Historique des Cotisations 
            {list.length > 0 && ` (${list.length})`}
          </h3>

          {tableLoading && (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
              <p>Chargement des données...</p>
            </div>
          )}

          {!tableLoading && list.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p style={{ fontSize: "48px", marginBottom: "16px" }}>📭</p>
              <p className="empty-text">
                {activeFilter 
                  ? "Aucune cotisation trouvée pour les critères sélectionnés" 
                  : "Aucune cotisation disponible"}
              </p>
            </div>
          )}

          {!tableLoading && list.length > 0 && (
            <div className="table-responsive">
              <table className="styled-table">
                <thead>
                  <tr>
                    <th>📅 Date</th>
                    <th>👤 Membre</th>
                    <th>💰 Montant</th>
                    <th>✨ Net</th>
                    <th>💳 Commission</th>
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
                        <strong>{formatAmount(cot.amount ?? cot.montant)}</strong>
                      </td>
                      <td className="amount-cell" style={{ color: "#10b981" }}>
                        {formatAmount(cot.netAmount ?? 0)}
                      </td>
                      <td className="amount-cell" style={{ color: "#6b7280" }}>
                        {formatAmount(cot.commission ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Pending */}
      <div className="content-right">
        <div className="widget-card pending-widget">
          <h3 className="widget-title">⏳ En attente ({pending.length})</h3>

          {pending.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
              <p style={{ fontSize: "48px", marginBottom: "8px" }}>✅</p>
              <p className="empty-widget-text">Aucune cotisation en attente</p>
            </div>
          )}

          {pending.map((cot) => (
            <div key={cot.id || cot._id} className="pending-item">
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

              <div className="pending-date">📅 {formatDate(cot.createdAt || cot.date)}</div>

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

      {/* Create Cotisation Modal */}
      {showCreateModal && (
        <CreateCotisationModal
          members={members}
          onClose={() => setShowCreateModal(false)}
          onSuccess={async () => {
            setShowCreateModal(false)
            await refreshData()
          }}
        />
      )}
    </DashboardLayout>
  )
}

// ============================================================================
// CREATE COTISATION MODAL COMPONENT
// ============================================================================

function CreateCotisationModal({ members, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    memberId: "",
    amount: "",
    method: "",
    operator: "",
    transactionId: "",
    reference: "",
    proof: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.memberId || !formData.amount || !formData.method) {
      setError("Veuillez remplir tous les champs obligatoires")
      return
    }

    try {
      setLoading(true)
      setError("")

      // Dynamic import to access ROOT client
      const axios = (await import("axios")).default
      const token = localStorage.getItem("idToken") || localStorage.getItem("token")
      
      const formDataToSend = new FormData()
      formDataToSend.append("memberId", formData.memberId)
      formDataToSend.append("amount", formData.amount)
      formDataToSend.append("method", formData.method)
      
      if (formData.operator) formDataToSend.append("operator", formData.operator)
      if (formData.transactionId) formDataToSend.append("transactionId", formData.transactionId)
      if (formData.reference) formDataToSend.append("reference", formData.reference)
      if (formData.proof) formDataToSend.append("proof", formData.proof)

      const res = await axios.post(
        "http://localhost:5000/cotisations/for-member",
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          }
        }
      )

      console.log("✅ Cotisation créée:", res.data)
      alert("Cotisation créée avec succès !")
      onSuccess()
    } catch (err) {
      console.error("❌ Erreur création cotisation:", err)
      setError(err.response?.data?.message || err.message || "Erreur lors de la création")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">➕ Soumettre une cotisation</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="error-banner" style={{ marginBottom: "16px" }}>
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}

          {/* Member Select */}
          <div className="form-group">
            <label className="form-label">
              👤 Membre <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={formData.memberId}
              onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
              className="form-input"
              required
            >
              <option value="">-- Sélectionner un membre --</option>
              {members.map((member) => {
                const memberId = member.id || member._id
                const memberName = `${member.name || ""} ${member.surname || ""}`.trim()
                return (
                  <option key={memberId} value={memberId}>
                    {memberName || memberId}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">
              💰 Montant (XOF) <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="form-input"
              placeholder="Ex: 50000"
              min="0"
              required
            />
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">
              💳 Méthode de paiement <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <select
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
              className="form-input"
              required
            >
              <option value="">-- Sélectionner --</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Wave">Wave</option>
              <option value="Free Money">Free Money</option>
              <option value="Espèces">Espèces</option>
              <option value="Virement">Virement</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          {/* Operator (optional) */}
          <div className="form-group">
            <label className="form-label">📱 Opérateur (optionnel)</label>
            <input
              type="text"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              className="form-input"
              placeholder="Ex: Orange, Wave, etc."
            />
          </div>

          {/* Transaction ID (optional) */}
          <div className="form-group">
            <label className="form-label">🔢 ID Transaction (optionnel)</label>
            <input
              type="text"
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              className="form-input"
              placeholder="Ex: TRX123456789"
            />
          </div>

          {/* Reference (optional) */}
          <div className="form-group">
            <label className="form-label">📝 Référence (optionnel)</label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="form-input"
              placeholder="Référence de paiement"
            />
          </div>

          {/* Proof Upload (optional) */}
          <div className="form-group">
            <label className="form-label">📎 Preuve de paiement (optionnel)</label>
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, proof: e.target.files[0] })}
              className="form-input"
              accept="image/*,application/pdf"
            />
            {formData.proof && (
              <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>
                Fichier sélectionné: {formData.proof.name}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={loading}
            >
              {loading ? "⏳ Envoi..." : "✓ Soumettre"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
