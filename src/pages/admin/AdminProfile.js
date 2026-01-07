import { useState } from "react"
import { useNavigate } from "react-router-dom"

import ProfileLayout from "../../components/ProfileLayout";
import DashboardLayout from "../../components/DashboardLayout";
import InfoRow from "../../components/InfoRow";
import { updateMyProfile } from "../../api";

export default function AdminProfile({ profile, setProfile }) {
  const handleSave = async (data) => {
    try {
      const res = await updateMyProfile(data);
      if (setProfile) setProfile(res.profile ?? res);
    } catch (err) {
      console.error(err);
    }
  };

  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState("profile")

  const handleHomeRedirect = () => {
    navigate("/dashboard") // adapte la route si besoin
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

  const dashboardProps = {
    getUserName: () => profile?.name,
    getInitials: (name) => (name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : ""),
    activeNav,
    setActiveNav,
    handleHomeRedirect,
    handleSignOut
  }

  return (
    <DashboardLayout {...dashboardProps}>
    <ProfileLayout
      profile={profile}
      roleLabel="Administrateur"
      editable={true}
      getUserName={() => profile?.name}
      getUserRole={() => "Administrateur"}
      getInitials={(name) => (name ? name.split(" ").map((n) => n[0]?.toUpperCase()).join("") : "")}
      onSave={handleSave}
    >
      {({ isEditing, editFormData, handleFieldChange }) => (
        <>
          <InfoRow label="Nom complet" value={profile?.name} isEditing={isEditing} fieldKey="name" editFormData={editFormData} handleFieldChange={handleFieldChange} />
          <InfoRow label="Rôle" value={profile?.role || "Administrateur"} />
          <InfoRow label="Email" value={profile?.email} isEditing={isEditing} fieldKey="email" editFormData={editFormData} handleFieldChange={handleFieldChange} type="email" />
          <InfoRow label="Téléphone" value={profile?.telephone} isEditing={isEditing} fieldKey="telephone" editFormData={editFormData} handleFieldChange={handleFieldChange} type="tel" />
          <InfoRow label="Adresse" value={profile?.address} isEditing={isEditing} fieldKey="address" editFormData={editFormData} handleFieldChange={handleFieldChange} />
          <InfoRow label="Âge" value={profile?.age} isEditing={isEditing} fieldKey="age" editFormData={editFormData} handleFieldChange={handleFieldChange} type="number" />
          <InfoRow label="Statut pro" value={profile?.professionalStatus} isEditing={isEditing} fieldKey="professionalStatus" editFormData={editFormData} handleFieldChange={handleFieldChange} />
        </>
      )}
    </ProfileLayout>
    </DashboardLayout>
  );
}
