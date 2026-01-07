import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import MemberCotisations from "./pages/member/MemberCotisations";
import ManagerDashboard from "./pages/supervisor/ManagerDashboard";
import SupervisorProfile from "./pages/supervisor/SupervisorProfile";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/member/cotisations" element={<MemberCotisations />} />
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/supervisor/profile" element={<SupervisorProfile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
