import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import DashboardLayout from "../../components/DashboardLayout"
import "../../styles/cotisationsMember.css"
import { getMemberCotisationsHistory, getMemberCotisationsByPeriod, createCotisation, getMyProfile, parseDate } from "../../api"

export default function MemberCotisations() {
  const [cotisations, setCotisations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("")
  const [success, setSuccess] = useState("")
  const [profile, setProfile] = useState(null)

  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState("home")

  const dashboardProps = {
    getUserName: () => profile?.name || "Membre",
    getInitials: (name) => (name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : ""),
    activeNav,
    setActiveNav,
    handleHomeRedirect: () => navigate("/member/cotisations"),
    handleProfileRedirect: () => navigate("/dashboard"),
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

  const fetchProfile = async () => {
    try {
      const data = await getMyProfile()
      setProfile(data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError("")
      const data = await getMemberCotisationsHistory()
      if (!Array.isArray(data) || data.length === 0) {
        setCotisations([])
        setError("Aucune cotisation trouvée.")
      } else {
        setCotisations(data)
      }
    } catch (err) {
      setError(err.message || "Erreur chargement historique")
      setCotisations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchHistory()
  }, [])

  /* Partie recherche normal avec le backend qui supporte les filtres de date
  const handleSearch = async () => {
    if (!from && !to) {
      setError("Veuillez sélectionner au moins une date de début ou de fin")
      return
    }
    try {
      setError("")
      setSuccess("")
      setLoading(true)
      const data = await getMemberCotisationsByPeriod(from, to)
    
      if (!Array.isArray(data) || data.length === 0) {
        setCotisations([])
        setError("Aucune cotisation pour cette période.")
      } else {
        setCotisations(data)
      }
    } catch (err) {
      setError(err.message || "Erreur lors de la recherche")
      setCotisations([])
    } finally {
      setLoading(false)
    }
  } =;*/

  const handleSearch = async () => {
    if (!from && !to) {
      setError("Veuillez sélectionner au moins une date")
      return
    }

    const start = from ? new Date(from) : null
    const end = to ? new Date(to + "T23:59:59.999") : null

    const filtered = cotisations.filter((c) => {
      const d = parseDate(c.createdAt || c.date)
      if (!d) return false
      if (start && d < start) return false
      if (end && d > end) return false
      return true
    })

    if (filtered.length === 0) {
      setError("Aucune cotisation pour cette période.")
    } else {
      setError("")
    }

    setCotisations(filtered)
  }

  const handleSubmit = async () => {
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) {
      setError("Le montant doit être un nombre positif")
      return
    }
    if (!method.trim()) {
      setError("Veuillez choisir une méthode de paiement")
      return
    }

    try {
      setError("")
      setSuccess("")
      const formData = new FormData()
      // API accepte amount/montant and method/paymentMethod/modePaiement
      formData.append("amount", value)
      formData.append("montant", value)
      formData.append("method", method.trim())
      formData.append("paymentMethod", method.trim())
      formData.append("modePaiement", method.trim())

      const res = await createCotisation(formData)
      setAmount("")
      setMethod("")
      setSuccess("Cotisation soumise avec succès ✅")
      fetchHistory()
    } catch (err) {
      setError(err.message || "Erreur lors de la soumission")
    }
  }

  if (loading) return <p>Chargement des cotisations...</p>

  return (
    <DashboardLayout {...dashboardProps}>
      <div className="info-card">
        <h3 className="card-title">Historique des cotisations</h3>

        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {/* Recherche */}
        <div className="search-bar">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="btn-primary" onClick={handleSearch}>Rechercher</button>
          <button className="btn-secondary" onClick={() => { setFrom(""); setTo(""); setError(""); fetchHistory(); }}>Toutes les cotisations</button>
        </div>

        {/* Liste */}
        <table className="styled-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Montant</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {cotisations.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: "center" }}>Aucune cotisation à afficher</td>
              </tr>
            )}
            {cotisations.map((c) => {
              return (
                <tr key={c.id || c._id}>
                  <td>{parseDate(c.date || c.createdAt)?.toLocaleDateString("fr-FR") ?? "N/A"}</td>
                  <td>{c.amount ?? c.montant} FCFA</td>
                  <td>{c.status}</td>
                </tr>
              )
            })}

          </tbody>
        </table>

        {/* Soumission */}
        <div className="submit-box">
          <h4>Soumettre une cotisation</h4>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant positif"
          />
          <input
            type="text"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="Méthode de paiement (ex: Orange Money)"
          />
          <button className="btn-save" onClick={handleSubmit}>Soumettre</button>
        </div>
      </div>
    </DashboardLayout>
  )
}
