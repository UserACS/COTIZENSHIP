import { useState } from "react"
import { useNavigate } from "react-router-dom"

import ProfileLayout from "../../components/ProfileLayout";
import DashboardLayout from "../../components/DashboardLayout";
import InfoRow from "../../components/InfoRow";
import { updateMyProfile } from "../../api";

export default function MemberProfile({ profile, setProfile }) {
  const committeeName = profile?.committee?.name || profile?.committee?.libelle || "Aucun comité";

  const handleSave = async (data) => {
    try {
      const res = await updateMyProfile(data);
      if (setProfile) setProfile(res.profile ?? res);
    } catch (err) {
      console.error("Erreur lors de la mise à jour :", err);
    }
  };

   const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState("profile")

  const handleHomeRedirect = () => {
    navigate("/member/cotisations") // members go to their cotisations page
  }

  const handleSignOut = async () => {
    try {
      // ensure firebase sign out if used
      const { signOut } = await import("firebase/auth")
      const { auth } = await import("../../firebase/firebase")
      await signOut(auth).catch(() => {})
    } catch {}
    localStorage.removeItem("idToken")
    localStorage.removeItem("token")
    navigate("/")
  }

  const dashboardProps = {
    getUserName: () => profile?.name,
    getInitials: (name) => (name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : ""),
    activeNav,
    setActiveNav,
    handleHomeRedirect,
    handleProfileRedirect: () => navigate("/dashboard"), // stay on profile (or self-link)
    handleSignOut
  }

  return (
    <DashboardLayout {...dashboardProps}>
    <ProfileLayout
      profile={profile}
      roleLabel="Membre"
      editable={true}
      getUserName={() => profile?.name}
      getUserRole={() => "Membre"}
      getInitials={(name) => (name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : "")}
      onSave={handleSave}
    >
      {({ isEditing, editFormData, handleFieldChange }) => (
        <>
          <InfoRow label="Nom complet" value={profile?.name} isEditing={isEditing} fieldKey="name" editFormData={editFormData} handleFieldChange={handleFieldChange} />
          <InfoRow label="Role" value={profile?.role} />
          <InfoRow label="Email" value={profile?.email} />
          <InfoRow label="Téléphone" value={profile?.telephone} isEditing={isEditing} fieldKey="telephone" editFormData={editFormData} handleFieldChange={handleFieldChange} type="tel" />
          <InfoRow label="Comité" value={committeeName} />
          <InfoRow label="Adresse" value={profile?.address} isEditing={isEditing} fieldKey="address" editFormData={editFormData} handleFieldChange={handleFieldChange} />
          <InfoRow label="Âge" value={profile?.age} isEditing={isEditing} fieldKey="age" editFormData={editFormData} handleFieldChange={handleFieldChange} type="number" />
          <InfoRow label="Statut pro" value={profile?.professionalStatus} isEditing={isEditing} fieldKey="professionalStatus" editFormData={editFormData} handleFieldChange={handleFieldChange} />
          <InfoRow label="Moyen de paiement préféré" value={profile?.preferredPaymentMethod} isEditing={isEditing} fieldKey="preferredPaymentMethod" editFormData={editFormData} handleFieldChange={handleFieldChange} />
        </>
      )}
    </ProfileLayout>
    </DashboardLayout>
  );
}
