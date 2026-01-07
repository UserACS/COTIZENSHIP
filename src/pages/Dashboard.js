import { useState, useEffect } from "react";
import { getMyProfile } from "../api"; 

import MemberProfile from "./member/MemberProfile"
import MemberCotisations from "./member/MemberCotisations"
import SupervisorProfile from "./supervisor/SupervisorProfile"
import AdminProfile from "./admin/AdminProfile"

function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const activeNav = "profile";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p>Chargement du profil...</p>;
  if (error) return <p>{error}</p>;

  const role = profile?.role?.toLowerCase()
  // normalize some DB values (ex: 'gérant', 'gerant') to our internal role keys
  const normalizedRole = (r) => {
    if (!r) return r
    const map = {
      'gérant': 'supervisor',
      'gerant': 'supervisor',
      'superviseur': 'supervisor',
      'membre': 'member',
      'administrateur': 'admin',
    }
    return map[r] || r
  }

  const renderProfile = () => {
    if (!profile) return null
    const r = normalizedRole(role)

    if (r === "member") return <MemberProfile profile={profile} setProfile={setProfile} />
    if (r === "supervisor") return <SupervisorProfile profile={profile} setProfile={setProfile} />
    if (r === "admin") return <AdminProfile profile={profile} setProfile={setProfile} />

    return <p>Rôle non reconnu</p>
  }

  return (
    <main className="dashboard-main">
      {activeNav === "profile" && renderProfile()}
      {activeNav === "cotisations" && role === "member" && <MemberCotisations />}
    </main>
  )
}
export default Dashboard;