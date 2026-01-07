import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"

import ProfileLayout from "../../components/ProfileLayout"
import DashboardLayout from "../../components/DashboardLayout"
import InfoRow from "../../components/InfoRow"
import { updateMyProfile, getMyProfile } from "../../api"

export default function SupervisorProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState("profile")

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await getMyProfile()
        setProfile(data)
      } catch (err) {
        console.error("Erreur chargement profil superviseur:", err)
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  const committeeName =
    profile?.committee?.name || profile?.committee?.libelle || "Non assigné"

  const handleSave = async (data) => {
    try {
      const res = await updateMyProfile(data)
      if (setProfile) setProfile(res.profile ?? res)
    } catch (err) {
      console.error("Erreur lors de la mise à jour :", err)
    }
  }

  const handleHomeRedirect = () => {
    navigate("/manager/dashboard") // superviseur -> manager dashboard
  }

  const handleSignOut = async () => {
    try {
      const { signOut } = await import("firebase/auth")
      const { auth } = await import("../../firebase/firebase")
      await signOut(auth).catch(() => {})
    } catch {}
    localStorage.removeItem("idToken")
    localStorage.removeItem("token")
    navigate("/")
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <p style={{ padding: "20px" }}>Chargement du profil...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="dashboard-container">
        <p style={{ padding: "20px", color: "red" }}>Erreur chargement profil</p>
      </div>
    )
  }

  const dashboardProps = {
    getUserName: () => profile?.name,
    getInitials: (name) =>
      name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : "SV",
    activeNav,
    setActiveNav,
    handleHomeRedirect,
    handleProfileRedirect: () => setActiveNav("profile"),
    handleSignOut,
  }

  return (
    <DashboardLayout {...dashboardProps}>
      <ProfileLayout
        profile={profile}
        roleLabel="Superviseur"
        editable={true}
        getUserName={() => profile?.name}
        getUserRole={() => "Superviseur"}
        getInitials={(name) =>
          name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : "SV"
        }
        onSave={handleSave}
      >
        {({ isEditing, editFormData, handleFieldChange }) => (
          <>
            <InfoRow
              label="Nom complet"
              value={profile?.name}
              isEditing={isEditing}
              fieldKey="name"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
            />
            <InfoRow label="Rôle" value={profile?.role || "Superviseur"} />
            <InfoRow
              label="Email"
              value={profile?.email}
              isEditing={isEditing}
              fieldKey="email"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
              type="email"
            />
            <InfoRow
              label="Téléphone"
              value={profile?.telephone}
              isEditing={isEditing}
              fieldKey="telephone"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
              type="tel"
            />
            <InfoRow label="Comité géré" value={committeeName} />
            <InfoRow
              label="Adresse"
              value={profile?.address}
              isEditing={isEditing}
              fieldKey="address"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
            />
            <InfoRow
              label="Âge"
              value={profile?.age}
              isEditing={isEditing}
              fieldKey="age"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
              type="number"
            />
            <InfoRow
              label="Statut pro"
              value={profile?.professionalStatus}
              isEditing={isEditing}
              fieldKey="professionalStatus"
              editFormData={editFormData}
              handleFieldChange={handleFieldChange}
            />
          </>
        )}
      </ProfileLayout>
    </DashboardLayout>
  )
}
