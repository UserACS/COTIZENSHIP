import React, { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase/firebase";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg"; // Importe le logo SVG
import "../styles/login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();
      setMessage({ type: "success", text: "Identifiants corrects — connexion réussie." });
      localStorage.setItem("idToken", token);
      navigate("/dashboard");
    } catch (err) {
      setMessage({ type: "error", text: "Identifiants incorrects ou erreur : " + (err.message || "Erreur") });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Veuillez saisir votre email pour réinitialiser le mot de passe." });
      return;
    }
    setMessage(null);
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage({ type: "success", text: "Email de réinitialisation envoyé. Vérifiez votre boîte mail." });
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de l'envoi de l'email : " + (err.message || "Erreur") });
    } finally {
      setResetLoading(false);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        {/* Logo intégré */}
        <div className="login-logo">
          <img src={logo} alt="Cotizenship Logo" />
        </div>
        
        <h2>Connexion à Cotizenship</h2>
        <p>Gérez vos cotisations en toute sécurité</p>

        <div className="input-group">
          <label className="login-label" htmlFor="email">Email</label>
          <div className="input-wrapper">
            <span className="input-icon">✉️</span> {/* Emoji pour email */}
            <input
              id="email"
              className="login-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
            />
          </div>
        </div>

        <div className="input-group">
          <label className="login-label" htmlFor="password">Mot de passe</label>
          <div className="input-wrapper">
            <span className="input-icon">🔒</span> {/* Emoji pour mot de passe */}
            <input
              id="password"
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="********"
            />
          </div>
        </div>

        <button className="login-button" type="submit" disabled={loading}>
          <span className="button-icon">🚀</span> {/* Emoji pour connexion */}
          {loading ? "Connexion..." : "Se connecter"}
        </button>

        <button
          className="login-reset-button"
          type="button"
          onClick={handleForgotPassword}
          disabled={resetLoading}
        >
          <span className="button-icon">🔑</span> {/* Emoji pour mot de passe oublié */}
          {resetLoading ? "Envoi en cours..." : "Mot de passe oublié ?"}
        </button>

        <div className="login-links">
          <p>
            Pas encore de compte ?{" "}
            <span className="login-link" onClick={() => navigate("/register")}>
              Créer un compte
            </span>
          </p>
        </div>

        {message && (
          <div className={`login-message ${message.type}`}>
            <span className="message-icon">
              {message.type === "success" ? "✅" : "⚠️"} {/* Emojis pour messages */}
            </span>
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}

export default Login;