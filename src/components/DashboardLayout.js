import { useState } from "react"
import "../styles/dashboard.css"

export default function DashboardLayout({
  children,
  getUserName,
  getInitials,
  activeNav,
  setActiveNav,
  handleHomeRedirect,
  handleSignOut,
  handleProfileRedirect,
}) {
  return (
    <div className="dashboard-container">
      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-avatar">
            {getInitials(getUserName())}
          </div>
          <h3 className="sidebar-username">{getUserName()}</h3>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeNav === "home" ? "active" : ""}`}
            onClick={handleHomeRedirect}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Home</span>
          </button>

          <button
            className={`nav-item ${activeNav === "profile" ? "active" : ""}`}
            onClick={() => {
              if (handleProfileRedirect) handleProfileRedirect();
              else setActiveNav("profile");
            }}
          >
            <span className="nav-icon">👤</span>
            <span className="nav-label">Profile</span>
          </button>

          <button
            className={`nav-item ${activeNav === "settings" ? "active" : ""}`}
            onClick={() => setActiveNav("settings")}
          >
            <span className="nav-icon">⚙</span>
            <span className="nav-label">Settings</span>
          </button>

          <button className="nav-item logout-item" onClick={handleSignOut}>
            <span className="nav-icon">🚪</span>
            <span className="nav-label">Logout</span>
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="dashboard-main">{children}</main>
    </div>
  )
}
