import { useState } from "react"
import "../styles/dashboard.css"

/**
 * ProfileLayout
 * - réutilise 100% ton CSS existant
 * - centralise édition + affichage
 */
export default function ProfileLayout({
  profile,
  roleLabel,
  getInitials,
  getUserName,
  getUserRole,
  onSave,
  editable = true,
  children,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState(profile ? { ...profile } : {})
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditFormData(profile ? { ...profile } : {})
    }
    setIsEditing(!isEditing)
    setSaveSuccess(false)
  }

  const handleFieldChange = (key, value) => {
    console.debug("handleFieldChange", key, value)
    setEditFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    try {
      setSaveLoading(true)
      setSaveError("")
      await onSave(editFormData)
      setIsEditing(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      console.error("Erreur sauvegarde profil:", err)
      setSaveError(err?.message || "Erreur lors de la sauvegarde")
    } finally {
      setSaveLoading(false)
    }
  }

  return (
    <div className="content-grid">
      {/* LEFT COLUMN */}
      <div className="content-left">
        {/* HERO CARD */}
        <div className="profile-hero-card">
          <div className="profile-hero-content">
            <div className="profile-avatar-large">
              {getInitials(getUserName())}
            </div>

            <div className="profile-hero-info">
              <h2 className="profile-name">{getUserName()}</h2>
              <p className="profile-role">{getUserRole()}</p>

              <div className="profile-actions">
                <button className="btn-primary">
                  <span className="btn-icon">✉</span> Address
                </button>
                <button className="btn-secondary">
                  <span className="btn-icon">☎</span> Contact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* PERSONAL INFORMATION */}
        <div className="info-card">
          <h3 className="card-title">Personal Information</h3>

          {editable && (
            <button
              className={`btn-edit ${isEditing ? "editing" : ""}`}
              onClick={handleEditToggle}
              disabled={saveLoading}
            >
              <span className="btn-icon">{isEditing ? "✕" : "✏"}</span>
              {isEditing ? "Annuler" : "Modifier"}
            </button>
          )}

          {saveSuccess && (
            <div className="success-banner">
              <span className="success-icon">✓</span>
              Profil mis à jour avec succès !
            </div>
          )}

          {saveError && (
            <div className="error-banner">
              <span className="error-icon">⚠</span>
              {saveError}
            </div>
          )}

          {isEditing && (
            <div className="edit-actions">
              <button className="btn-save" onClick={handleSave}>
                {saveLoading ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button className="btn-cancel" onClick={handleEditToggle}>
                Annuler
              </button>
            </div>
          )}

          {/* CONTENU SPÉCIFIQUE AU RÔLE */}
          <div className="info-grid">
            {children({ isEditing, editFormData, handleFieldChange })}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (widgets inchangés) */}
      <div className="content-right">
        <div className="widget-card">
          <h3 className="widget-title">Recent Activity</h3>
          <p className="widget-text">Recent Activity last 10 min</p>
        </div>

        <div className="widget-card">
          <h3 className="widget-title">Account Security</h3>
          <p className="widget-text">
            Account Security is an important part of your account.
          </p>
          <button className="btn-link">Learn more →</button>
        </div>
      </div>
    </div>
  )
}
