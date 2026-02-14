import { memo, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../app/providers/AuthProvider";
import { getApiBaseUrl } from "../../shared/config/env";
import { usePageStyles } from "../../shared/hooks/usePageStyles";
import { applyLanguage, getAppAlertMessage, getDocumentTitle, normalizeLanguage, type Language } from "./landingI18n";

const LandingSections = memo(function LandingSections({ html }: { html: string }) {
  return <div id="landing-sections" dangerouslySetInnerHTML={{ __html: html }} />;
});

function splitName(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return { first_name: "", last_name: "" };
  const parts = trimmed.split(/\s+/);
  return {
    first_name: parts[0] || "",
    last_name: parts.slice(1).join(" "),
  };
}

export function LandingPage() {
  usePageStyles("/css/style.css");

  const navigate = useNavigate();
  const { login, register, access, isReady } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [language, setLanguage] = useState<Language>(() =>
    normalizeLanguage(localStorage.getItem("selectedLanguage")),
  );

  const navRef = useRef<HTMLElement | null>(null);
  const langDropdownRef = useRef<HTMLLIElement | null>(null);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupNickname, setSignupNickname] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword1, setSignupPassword1] = useState("");
  const [signupPassword2, setSignupPassword2] = useState("");

  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [sectionsHtml, setSectionsHtml] = useState<string>("");

  function scrollToSection(sectionId: string) {
    setIsMobileNavOpen(false);
    setIsLangOpen(false);
    const el = document.getElementById(sectionId);
    if (!el) return;
    if (el.classList.contains("loading")) el.classList.add("loaded");
    const headerHeight = document.querySelector<HTMLElement>(".header")?.offsetHeight ?? 0;
    const top = window.scrollY + el.getBoundingClientRect().top - (headerHeight + 12);
    window.scrollTo({ top, behavior: "smooth" });
  }

  function openAuthModal(tab: "login" | "signup" = "login") {
    setIsMobileNavOpen(false);
    setIsLangOpen(false);
    setAuthTab(tab);
    setIsAuthOpen(true);
  }

  function closeAuthModal() {
    setIsAuthOpen(false);
  }

  function changeLanguage(next: Language) {
    setLanguage(next);
    localStorage.setItem("selectedLanguage", next);
    document.documentElement.lang = next;
    setIsLangOpen(false);
  }

  useEffect(() => {
    function onDocumentMouseDown(e: MouseEvent) {
      if (isLangOpen) {
        const dropdown = langDropdownRef.current;
        if (dropdown && e.target instanceof Node && !dropdown.contains(e.target)) setIsLangOpen(false);
      }

      if (isMobileNavOpen) {
        const nav = navRef.current;
        if (nav && e.target instanceof Node && !nav.contains(e.target)) setIsMobileNavOpen(false);
      }
    }

    function onDocumentKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setIsLangOpen(false);
      setIsMobileNavOpen(false);
    }

    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("keydown", onDocumentKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("keydown", onDocumentKeyDown);
    };
  }, [isLangOpen, isMobileNavOpen]);

  async function onLoginSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await login(loginEmail, loginPassword);
      navigate("/dashboard");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      const msg = raw.includes("Invalid email or password") ? "Email yoki parol noto‘g‘ri." : raw;
      alert(msg || "Login ishlamadi. Backend (`scripts\\dev.cmd`) ishga tushganini tekshiring.");
    }
  }

  async function onSignupSubmit(e: FormEvent) {
    e.preventDefault();
    if (signupPassword1 !== signupPassword2) {
      alert("Parollar mos emas");
      return;
    }
    if (signupPassword1.trim().length < 8) {
      alert("Parol kamida 8 ta belgidan iborat bo‘lishi kerak.");
      return;
    }
    const { first_name, last_name } = splitName(signupNickname);
    try {
      await register({
        first_name,
        last_name,
        email: signupEmail,
        password: signupPassword1,
      });
      navigate("/dashboard");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      let msg = raw;
      if (raw.includes("Ensure this field has at least 8 characters")) {
        msg = "Parol kamida 8 ta belgidan iborat bo‘lishi kerak.";
      } else if (raw.includes("Email is already registered")) {
        msg = "Bu email bilan oldin ro‘yxatdan o‘tilgan.";
      }
      alert(msg || "Ro'yxatdan o'tish ishlamadi. Backend (`scripts\\dev.cmd`) ishga tushganini tekshiring.");
    }
  }

  async function onContactSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${apiBaseUrl}/contact/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: contactName.trim(), phone: contactPhone.trim(), message: "" }),
      });
      if (!res.ok) {
        alert("Xatolik yuz berdi. Qaytadan urinib ko'ring.");
        return;
      }
      alert("Biz siz bilan tez orada aloqaga chiqamiz!");
      setContactName("");
      setContactPhone("");
    } catch {
      alert("Ulanishda xatolik. Backend ishlayotganini tekshiring.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/landing-sections.html")
      .then((r) => r.text())
      .then((html) => {
        if (!cancelled) setSectionsHtml(html);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useLayoutEffect(() => {
    document.documentElement.lang = language;
    document.title = getDocumentTitle(language);
    applyLanguage(language);
  }, [language, sectionsHtml]);

  useEffect(() => {
    if (!sectionsHtml) return;

    const targets = Array.from(document.querySelectorAll<HTMLElement>(".loading"));
    if (!targets.length) return;

    const markLoaded = (el: HTMLElement) => el.classList.add("loaded");

    const hero = document.querySelector<HTMLElement>(".hero.loading");
    if (hero) markLoaded(hero);

    if (!("IntersectionObserver" in window)) {
      targets.forEach(markLoaded);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            markLoaded(entry.target as HTMLElement);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );

    for (const el of targets) observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [sectionsHtml]);

  useEffect(() => {
    // Bridge legacy inline handlers inside injected HTML.
    (window as any).openAuthModal = (arg?: unknown) => {
      if (arg && typeof (arg as { preventDefault?: () => void }).preventDefault === "function") {
        (arg as { preventDefault: () => void }).preventDefault();
      }

      if (arg === "signup" || arg === "login") openAuthModal(arg);
      else openAuthModal("signup");
    };
    (window as any).setLanguage = (lang: string) => changeLanguage(normalizeLanguage(lang));
    (window as any).toggleStats = () => undefined;
    (window as any).showAppAlert = (e: Event) => {
      e.preventDefault();
      const lang = normalizeLanguage(localStorage.getItem("selectedLanguage"));
      alert(getAppAlertMessage(lang));
    };

    return () => {
      delete (window as any).openAuthModal;
      delete (window as any).setLanguage;
      delete (window as any).toggleStats;
      delete (window as any).showAppAlert;
    };
  }, []);

  return (
    <>
      <header className="header">
        <nav className="nav" ref={navRef}>
          <a
            href="#"
            className="logo"
            onClick={(e) => {
              e.preventDefault();
              setIsMobileNavOpen(false);
              setIsLangOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <img
              src="/images/removebg.png"
              alt="seero logo"
              style={{ height: 32, verticalAlign: "middle" }}
            />
          </a>
          <ul className={`nav-links ${isMobileNavOpen ? "open" : ""}`}>
            <li>
              <a
                data-i18n="navAbout"
                href="#about"
                id="nav-about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("about");
                }}
              >
                Biz haqimizda
              </a>
            </li>
            <li>
              <a
                data-i18n="navHow"
                href="#how"
                id="nav-how"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("how");
                }}
              >
                Qanday ishlaydi
              </a>
            </li>
            <li>
              <a
                data-i18n="navMethods"
                href="#methods"
                id="nav-methods"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("methods");
                }}
              >
                Metodikalar
              </a>
            </li>
            <li>
              <a
                data-i18n="navContact"
                href="#contact"
                id="nav-contact"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection("contact");
                }}
              >
                Bog'lanish
              </a>
            </li>
            <li ref={langDropdownRef} className={`dropdown ${isLangOpen ? "open" : ""}`}>
              <a
                href="#"
                className="dropdown-toggle"
                id="lang-toggle"
                data-i18n="navLang"
                onClick={(e) => {
                  e.preventDefault();
                  setIsLangOpen((v) => !v);
                }}
              >
                Tillar ▼
              </a>
              <ul style={{ listStyleType: "none" }} className="dropdown-menu" id="lang-menu">
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      changeLanguage("en");
                    }}
                  >
                    <img
                      src="https://flagcdn.com/16x12/gb.png"
                      alt="English"
                      style={{ width: 18, verticalAlign: "middle", marginRight: 6 }}
                    />
                    <span data-i18n="langEn">English</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      changeLanguage("ru");
                    }}
                  >
                    <img
                      src="https://flagcdn.com/16x12/ru.png"
                      alt="Russian"
                      style={{ width: 18, verticalAlign: "middle", marginRight: 6 }}
                    />
                    <span data-i18n="langRu">Russian</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      changeLanguage("uz");
                    }}
                  >
                    <img
                      src="https://flagcdn.com/16x12/uz.png"
                      alt="Uzbek"
                      style={{ width: 18, verticalAlign: "middle", marginRight: 6 }}
                    />
                    <span data-i18n="langUz">Uzbek</span>
                  </a>
                </li>
              </ul>
            </li>
            <li className="mobile-only">
              <a
                href="#"
                className="login-btn"
                data-i18n="login"
                onClick={(e) => {
                  e.preventDefault();
                  if (isReady && access) navigate("/dashboard");
                  else openAuthModal("login");
                }}
              >
                Kirish
              </a>
            </li>
          </ul>
          <div className="nav-actions">
            <button
              type="button"
              className="mobile-nav-toggle"
              aria-label="Menu"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((v) => !v)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <a
              href="#"
              className="login-btn"
              id="login-btn"
              data-i18n="login"
              onClick={(e) => {
                e.preventDefault();
                setIsMobileNavOpen(false);
                if (isReady && access) navigate("/dashboard");
                else openAuthModal("login");
              }}
            >
              Kirish
            </a>
            <a
              href="#"
              className="get-started-btn"
              id="get-started-btn"
              data-i18n="getStarted"
              onClick={(e) => {
                e.preventDefault();
                setIsMobileNavOpen(false);
                if (isReady && access) navigate("/dashboard");
                else openAuthModal("signup");
              }}
            >
              Boshlash
            </a>
          </div>
        </nav>
      </header>

      {sectionsHtml ? <LandingSections html={sectionsHtml} /> : null}

      <footer className="footer" id="contact">
        <div className="footer-content">
          <div className="footer-left">
            <div className="logo" />
            <nav className="footer-nav">
              <a href="#about" data-i18n="navAbout">
                Biz haqimizda
              </a>
              <a href="#how" data-i18n="navHow">
                Qanday ishlaydi
              </a>
              <a href="#methods" data-i18n="navMethods">
                Metodikalar
              </a>
              <a href="#blog" data-i18n="navBlog">
                Blog
              </a>
            </nav>

            <div>
              <div className="contact-badge" data-i18n="contactBadge">
                Biz bilan bog'lanish!
              </div>
              <div className="contact-info">
                <p data-i18n="contactEmail">Email: seerostartup@Gmail.com</p>
                <p data-i18n="contactPhone">Phone: +998 91-878-60-85</p>
              </div>
            </div>
          </div>

          <div className="newsletter-section">
            <div className="newsletter-title">
              <h3
                data-i18n="newsletterTitle"
                style={{
                  marginBottom: 12,
                  color: "#17633a",
                  fontSize: "1.3rem",
                  fontWeight: 700,
                }}
              >
                Tez orada siz bilan bog'lanamiz! <br />
                Telefon raqamingizni va ismingizni qoldiring:
              </h3>
            </div>
            <form
              className="newsletter-form"
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
              onSubmit={onContactSubmit}
            >
              <input
                type="text"
                className="newsletter-input"
                placeholder="Ismingizni"
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #d1e7dd",
                  fontSize: "1rem",
                }}
              />
              <input
                type="tel"
                className="newsletter-input"
                placeholder="Telefon raqamingizni"
                required
                inputMode="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  border: "1px solid #d1e7dd",
                  fontSize: "1rem",
                }}
              />
              <button
                type="submit"
                className="newsletter-btn"
                data-i18n="sendBtn"
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#2afc98",
                  color: "#17633a",
                  fontWeight: 600,
                  fontSize: "1rem",
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s",
                }}
              >
                Yuborish
              </button>
            </form>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="social-links">
            <a href="https://www.instagram.com/seero.uz/" className="social-link" title="LinkedIn">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ display: "block", margin: "0 auto" }}
              >
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.515 2.567 5.783 2.295 7.149 2.233 8.415 2.175 8.795 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.363 3.678 1.344 2.697 2.325 2.465 3.437 2.406 4.718 2.347 5.998 2.334 6.407 2.334 12c0 5.593.013 6.002.072 7.282.059 1.281.291 2.393 1.272 3.374.981.981 2.093 1.213 3.374 1.272C8.332 23.987 8.741 24 12 24s3.668-.013 4.948-.072c1.281-.059 2.393-.291 3.374-1.272.981-.981 1.213-2.093 1.272-3.374.059-1.28.072-1.689.072-7.282 0-5.593-.013-6.002-.072-7.282-.059-1.281-.291-2.393-1.272-3.374-.981-.981-2.093-1.213-3.374-1.272C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61579154124858"
              className="social-link"
              title="Facebook"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="https://t.me/seero_uz" className="social-link" title="Twitter">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.5 2.5L2.7 9.6c-1.1.4-1.1 1.1-.2 1.4l4.7 1.5 2.1 6.6c.3.8.7 1 1.4.7l3.1-2.3 2.6 2.4c.6.5 1.1.3 1.3-.5l3.4-15.1c.2-.8-.3-1.2-1-.9zm-3.2 3.2l-7.2 7.2c-.2.2-.3.4-.2.7l1.1 3.4c.1.3.5.4.7.2l1.6-1.2 2.2 2c.2.2.5.1.6-.2l2.5-11.1c.1-.3-.2-.6-.5-.5z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <div
        id="auth-modal"
        className="auth-modal"
        style={{ display: isAuthOpen ? "flex" : "none" }}
        onClick={(e) => {
          if ((e.target as HTMLElement).classList.contains("auth-modal")) closeAuthModal();
        }}
      >
        <div className="auth-modal-card">
          <div className="auth-tabs">
            <button
              id="loginTab"
              className={`auth-tab ${authTab === "login" ? "active" : ""}`}
              onClick={() => setAuthTab("login")}
              data-i18n="authLoginTab"
              type="button"
            >
              Kirish
            </button>
            <button
              id="signupTab"
              className={`auth-tab ${authTab === "signup" ? "active" : ""}`}
              onClick={() => setAuthTab("signup")}
              data-i18n="authSignupTab"
              type="button"
            >
              Ro'yxatdan o'tish
            </button>
          </div>
          <span className="auth-close" onClick={closeAuthModal}>
            &times;
          </span>

          {authTab === "login" ? (
            <form id="loginForm" className="auth-form" onSubmit={onLoginSubmit}>
              <label htmlFor="login-email" data-i18n="authEmailLabel">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                placeholder="Email"
                required
                data-i18n="authEmailPlaceholder"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              <label htmlFor="login-password" data-i18n="authPasswordLabel">
                Parol
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                placeholder="Parol"
                required
                data-i18n="authPasswordPlaceholder"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
              <button type="submit" className="auth-btn" data-i18n="authLoginBtn">
                Kirish
              </button>
              <div className="auth-link" onClick={() => setAuthTab("signup")} data-i18n="authNoAccount">
                Ro'yxatdan o'tmaganmisiz?
              </div>
            </form>
          ) : (
            <form id="signupForm" className="auth-form" onSubmit={onSignupSubmit}>
              <label htmlFor="signup-nick" data-i18n="authNickLabel">
                Nickname
              </label>
              <input
                id="signup-nick"
                name="nickname"
                type="text"
                placeholder="Nickname"
                required
                data-i18n="authNickPlaceholder"
                value={signupNickname}
                onChange={(e) => setSignupNickname(e.target.value)}
              />
              <label htmlFor="signup-email" data-i18n="authEmailLabel">
                Email
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                placeholder="Email"
                required
                data-i18n="authEmailPlaceholder"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
              />
              <label htmlFor="signup-password" data-i18n="authPasswordLabel">
                Parol
              </label>
              <input
                id="signup-password"
                name="password1"
                type="password"
                placeholder="Parol"
                required
                minLength={8}
                data-i18n="authPasswordPlaceholder"
                value={signupPassword1}
                onChange={(e) => setSignupPassword1(e.target.value)}
              />
              <label htmlFor="signup-password2" data-i18n="authPassword2Label">
                Parolni tasdiqlash
              </label>
              <input
                id="signup-password2"
                name="password2"
                type="password"
                placeholder="Parolni tasdiqlang"
                required
                minLength={8}
                data-i18n="authPassword2Placeholder"
                value={signupPassword2}
                onChange={(e) => setSignupPassword2(e.target.value)}
              />
              <button type="submit" className="auth-btn" data-i18n="authSignupBtn">
                Ro'yxatdan o'tish
              </button>
              <div className="auth-link" onClick={() => setAuthTab("login")} data-i18n="authBackToLogin">
                Kirish oynasiga qaytish
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
