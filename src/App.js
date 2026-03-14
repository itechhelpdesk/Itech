import { useState } from "react";
import Navbar           from "./components/Navbar";
import HomePage         from "./components/HomePage";
import AboutPage        from "./components/AboutPage";
import TrackPage        from "./components/TrackPage";
import LoginPage        from "./components/LoginPage";
import RegisterPage     from "./components/Registerpage";
import StudentDashboard from "./Studentdashboard/Studentdashboard";
import AdminDashboard from "./AdminDashboard/AdminDashboard";
import ForgotPasswordPage from "./components/ForgotPassword";

function App() {
  const [page, setPage] = useState(() => {
    return localStorage.getItem("page") || "home";
  });

  const navigate = (newPage) => {
    localStorage.setItem("page", newPage);
    setPage(newPage);
  };

  const noNav = ["login", "register", "dashboard", "admin"];

  return (
    <div className="min-h-screen bg-gray-50">
      {!noNav.includes(page) && (
        <Navbar page={page} setPage={navigate} />
      )}
      {page === "home"      && <HomePage         setPage={navigate} />}
      {page === "about"     && <AboutPage        setPage={navigate} />}
      {page === "track"     && <TrackPage />}
      {page === "login"     && <LoginPage        setPage={navigate} />}
      {page === "register"  && <RegisterPage     setPage={navigate} />}
      {page === "dashboard" && <StudentDashboard setPage={navigate} />}
      {page === "admin"     && <AdminDashboard   setPage={navigate} />}
       {page === "forgot-password" && <ForgotPasswordPage setPage={navigate} />}
    </div>
  );
}

export default App;