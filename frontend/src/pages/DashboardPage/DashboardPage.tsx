import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../app/providers/AuthProvider";
import { useTheme } from "../../app/providers/ThemeProvider";
import { useStudySessionTracker } from "../../features/studyTime/useStudySessionTracker";
import { getApiBaseUrl } from "../../shared/config/env";
import { usePageStyles } from "../../shared/hooks/usePageStyles";
import { formatDuration } from "../../shared/utils/format";

type Lesson = {
  id: string;
  slug: string;
  title: string;
  cover_image_path: string;
  order: number;
  card_count: number;
};

type LessonCard = {
  id: string;
  order: number;
  english: string;
  uzbek: string;
  pronunciation: string;
  mnemonic_example: string;
  translation: string;
};

type RevisionSchedule = {
  id: string;
  lesson: {
    id: string;
    slug: string;
    title: string;
    cover_image_path: string;
  };
  stage: number;
  next_review_at: string | null;
  status: string;
};

type DashboardResponse = {
  user: { first_name: string; last_name: string; email: string };
  study_time: { today_seconds: number; week_seconds: number; total_seconds: number };
  revision_topics: RevisionSchedule[];
  revision_queue?: RevisionSchedule[];
};

type ReviewGroup = {
  key: string;
  label: string;
  sortAt: number;
  items: RevisionSchedule[];
};

function groupRevisionQueue(queue: RevisionSchedule[]): ReviewGroup[] {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const dayAfterTomorrowStart = new Date(tomorrowStart);
  dayAfterTomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const byKey = new Map<string, ReviewGroup>();

  function pad2(value: number) {
    return String(value).padStart(2, "0");
  }

  function ensureGroup(key: string, label: string, sortAt: number) {
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, sortAt, items: [] };
      byKey.set(key, group);
    }
    return group;
  }

  for (const schedule of queue) {
    if (!schedule.next_review_at) continue;
    const next = new Date(schedule.next_review_at);
    if (Number.isNaN(next.getTime())) continue;

    // Anything due today or earlier should appear under "Bugun".
    if (next < tomorrowStart) {
      ensureGroup("today", "Bugun", todayStart.getTime()).items.push(schedule);
      continue;
    }

    const dayStart = new Date(next);
    dayStart.setHours(0, 0, 0, 0);

    const key = `${dayStart.getFullYear()}-${pad2(dayStart.getMonth() + 1)}-${pad2(dayStart.getDate())}`;
    const label =
      next >= tomorrowStart && next < dayAfterTomorrowStart
        ? "Ertaga"
        : dayStart.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" });

    ensureGroup(key, label, dayStart.getTime()).items.push(schedule);
  }

  const groups = Array.from(byKey.values()).sort((a, b) => a.sortAt - b.sortAt);
  for (const group of groups) {
    group.items.sort((a, b) => (a.next_review_at || "").localeCompare(b.next_review_at || ""));
  }
  return groups;
}

function formatReviewTime(nextReviewAt: string | null, status: string) {
  if (!nextReviewAt) return status === "expired" ? "Expired" : "";
  const date = new Date(nextReviewAt);
  if (Number.isNaN(date.getTime())) return status;

  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (status === "expired") {
    return `Expired • ${date.toLocaleDateString()} ${time}`;
  }
  if (isToday) return `Bugun ${time}`;
  if (isTomorrow) return `Ertaga ${time}`;
  return `${date.toLocaleDateString()} ${time}`;
}

function formatReviewTimeShort(nextReviewAt: string | null, status: string) {
  if (!nextReviewAt) return status === "expired" ? "Expired" : "";
  const date = new Date(nextReviewAt);
  if (Number.isNaN(date.getTime())) return status;

  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (status === "expired") return `Expired • ${date.toLocaleDateString()} ${time}`;
  return time;
}

export function DashboardPage() {
  usePageStyles("/css/dashboard.css");

  const navigate = useNavigate();
  const { authFetch, logout, user } = useAuth();
  const { toggle: toggleTheme } = useTheme();
  const apiBaseUrl = getApiBaseUrl();

  useStudySessionTracker("dashboard");

  const [activePage, setActivePage] = useState<
    "dashboard" | "practice" | "flashcard" | "games" | "courses" | "statistics"
  >("dashboard");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
  const [cards, setCards] = useState<LessonCard[]>([]);
  const [learnedIds, setLearnedIds] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);

  const currentCard = useMemo(() => cards[currentIndex] || null, [cards, currentIndex]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [dashRes, lessonsRes] = await Promise.all([
        authFetch(`${apiBaseUrl}/dashboard/`),
        authFetch(`${apiBaseUrl}/lessons/`),
      ]);
      if (!dashRes.ok || !lessonsRes.ok) return;
      const dash = (await dashRes.json()) as DashboardResponse;
      const lessonsList = (await lessonsRes.json()) as Lesson[];
      if (!cancelled) {
        setDashboardData(dash);
        setLessons(lessonsList);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  useEffect(() => {
    if (activePage !== "dashboard" && activePage !== "practice") return;

    let cancelled = false;

    async function tick() {
      const dashRes = await authFetch(`${apiBaseUrl}/dashboard/`);
      if (!dashRes.ok) return;
      const dash = (await dashRes.json()) as DashboardResponse;
      if (!cancelled) setDashboardData(dash);
    }

    void tick();
    const intervalId = window.setInterval(() => {
      void tick();
    }, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activePage, apiBaseUrl, authFetch]);

  async function startFlashcards(lessonSlug: string, scheduleId?: string | null) {
    const lesson = lessons.find((l) => l.slug === lessonSlug) || null;
    setActiveLesson(lesson);
    setActiveScheduleId(scheduleId ?? null);
    setShowMnemonic(false);
    setShowCompletion(false);
    setLearnedIds(new Set());
    setCurrentIndex(0);
    setSessionStartMs(Date.now());

    const res = await authFetch(`${apiBaseUrl}/lessons/${lessonSlug}/cards/`);
    if (!res.ok) return;
    const deck = (await res.json()) as LessonCard[];
    setCards(deck);
    setActivePage("flashcard");
  }

  function advance() {
    if (cards.length <= 0) return;
    setCurrentIndex((idx) => (idx + 1) % cards.length);
    setShowMnemonic(false);
  }

  function dontKnowWord() {
    advance();
  }

  async function knowWord() {
    if (!currentCard) return;

    const next = new Set(learnedIds);
    next.add(currentCard.id);
    setLearnedIds(next);

    const completed = next.size >= cards.length && cards.length > 0;
    if (!completed) {
      advance();
      return;
    }

    // Completion
    setShowCompletion(true);
    const timeSpentMinutes = sessionStartMs ? Math.max(1, Math.round((Date.now() - sessionStartMs) / 60000)) : 1;

    // Sync backend SRS
    if (activeLesson) {
      if (activeScheduleId) {
        await authFetch(`${apiBaseUrl}/revisions/${activeScheduleId}/review/`, { method: "POST" });
      } else {
        await authFetch(`${apiBaseUrl}/lessons/${activeLesson.slug}/complete/`, { method: "POST" });
      }
    }

    // Refresh dashboard stats
    const dashRes = await authFetch(`${apiBaseUrl}/dashboard/`);
    if (dashRes.ok) setDashboardData((await dashRes.json()) as DashboardResponse);

    // Update modal stats (DOM uses ids; we keep them for CSS)
    const learnedEl = document.getElementById("learnedCount");
    const timeEl = document.getElementById("timeSpent");
    if (learnedEl) learnedEl.textContent = String(cards.length);
    if (timeEl) timeEl.textContent = String(timeSpentMinutes);
  }

  function speakCurrent() {
    if (!currentCard) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const textParts = [currentCard.english];
    if (showMnemonic && currentCard.mnemonic_example) textParts.push(currentCard.mnemonic_example);
    const utter = new SpeechSynthesisUtterance(textParts.join(". "));
    utter.lang = "en-US";
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  }

  async function onLogout(e: React.MouseEvent) {
    e.preventDefault();
    await logout();
    navigate("/");
  }

  const studyToday = dashboardData?.study_time.today_seconds ?? 0;
  const studyWeek = dashboardData?.study_time.week_seconds ?? 0;
  const studyTotal = dashboardData?.study_time.total_seconds ?? 0;

  const revisionTopics = dashboardData?.revision_topics ?? [];
  const revisionQueue = dashboardData?.revision_queue ?? revisionTopics;
  const dashboardRevisionTopics = (revisionTopics.length > 0 ? revisionTopics : revisionQueue).slice(0, 3);

  return (
    <div className="container">
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} id="sidebar">
        <div className="logo">
          <img style={{ width: 150 }} src="/images/removebg.png" alt="" />
        </div>
        <nav>
          <ul className="nav-menu">
            <li className="nav-item">
              <a
                href="#"
                className={`nav-link ${activePage === "dashboard" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage("dashboard");
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon home" />
                Dashboard
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#"
                className={`nav-link ${activePage === "games" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage("games");
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon games" />
                Games
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#"
                className={`nav-link ${activePage === "courses" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage("courses");
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon courses" />
                Courses
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#"
                className={`nav-link ${activePage === "practice" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage("practice");
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon practice" />
                Practice
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#"
                className={`nav-link ${activePage === "statistics" ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActivePage("statistics");
                  setSidebarOpen(false);
                }}
              >
                <span className="nav-icon statistics" />
                Statistics
              </a>
            </li>
          </ul>

          <div className="nav-bottom">
            <a href="#" className="nav-link" onClick={onLogout}>
              <span className="nav-icon logout" />
              Chiqish
            </a>
            <div className="mode-toggle" onClick={toggleTheme} role="button" tabIndex={0}>
              <span className="nav-icon light-mode" />
              Qorong'i rejimi
            </div>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <button
            className="menu-toggle"
            id="menuToggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="search-bar">
            <input type="text" className="search-input" placeholder="Nima narsa o'rganishni xohlaysiz?" />
          </div>

          <div className="header-right">
            <button className="notification-btn" aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <div className="user-profile">
              <div className="user-avatar">
                <img style={{ width: 36 }} src="/picture/profile.png" alt="" />
              </div>
              <span className="user-name">{user?.first_name || "O'rganuvchi"}</span>
            </div>
          </div>
        </header>

        {activePage === "dashboard" ? (
          <div className="dashboard">
            <section className="welcome-section">
              <img style={{ width: 80 }} src="/picture/profile.png" alt="" />
              <div className="welcome-text">
                <h1>Welcome, {user?.first_name || "O'rganuvchi"}</h1>
                <p>Mustahkamlik har safar mukammallikdan ustun turadi! 💪</p>
              </div>
            </section>

            <section className="progress-section">
              <div className="progress-card">
                <h3>Bugungi natija</h3>
                <div className="progress-item">
                  <span className="progress-label">Qancha vaqt sarflaganingiz</span>
                  <span className="progress-value progress-time">⏱️ {formatDuration(studyToday)}</span>
                </div>
              </div>

              <div className="progress-card">
                <h3>Haftalik natija</h3>
                <div className="progress-item">
                  <span className="progress-label">Qancha vaqt sarflaganingiz</span>
                  <span className="progress-value progress-time">⏱️ {formatDuration(studyWeek)}</span>
                </div>
                <div className="progress-item" style={{ marginTop: 12 }}>
                  <span className="progress-label">Jami vaqt</span>
                  <span className="progress-value progress-time">⏱️ {formatDuration(studyTotal)}</span>
                </div>
              </div>
            </section>

            <section className="learning-section">
              <h2>Yaqin kunlarda qaytarishingiz kerak bo'lgan mavzular</h2>
              <div className="learning-grid">
                {dashboardRevisionTopics.map((topic) => (
                  <div className="learning-card" key={topic.id}>
                    <div className="learning-image">
                      <img src={topic.lesson.cover_image_path} alt="" />
                      <span className="lesson-badge">{topic.lesson.title}</span>
                    </div>
                    <div className="learning-content">
                      <div className="instructor">
                        <button className="start-btn" onClick={() => void startFlashcards(topic.lesson.slug, topic.id)}>
                          Boshlash
                        </button>
                        <span className="review-time-small">{formatReviewTime(topic.next_review_at, topic.status)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "practice" ? (
          <div className="practice-page" id="practicePage" style={{ display: "flex" }}>
            <div className="themes-section">
              <div className="themes-header">
                <h2>General Ingiliz tili lug'atlari</h2>
              </div>

              <div className="themes-grid">
                {lessons.map((lesson) => (
                  <div className="theme-card" key={lesson.id}>
                    <div className="theme-image">
                      <img src={lesson.cover_image_path} alt={lesson.title} />
                      <span className="lesson-badge">{lesson.card_count}ta so'z</span>
                    </div>
                    <div className="theme-info">
                      <h3>{lesson.title}</h3>
                      <button className="start-btn" onClick={() => void startFlashcards(lesson.slug, null)}>
                        Boshlash
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="reviews-panel">
              <h2>Takrorlashingiz kerak bo'lgan vaqtlar</h2>
              {revisionQueue.length === 0 ? (
                <div className="review-section">
                  <div className="review-items">
                    <div className="review-item">
                      <div className="review-details">
                        <h4>Hozircha takrorlash yo'q</h4>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                groupRevisionQueue(revisionQueue).map((group) => (
                  <div className="review-section" key={group.key}>
                    <div className="review-header">
                      <span className="review-day">{group.label}</span>
                      <span className="review-badge">{group.items.length}</span>
                    </div>
                    <div className="review-items">
                      {group.items.map((t) => (
                        <div
                          className="review-item"
                          key={t.id}
                          onClick={() => void startFlashcards(t.lesson.slug, t.id)}
                          role="button"
                          tabIndex={0}
                        >
                          <img src={t.lesson.cover_image_path} alt="" />
                          <div className="review-details">
                            <h4>{t.lesson.title}</h4>
                          </div>
                          <div className="review-time">{formatReviewTimeShort(t.next_review_at, t.status)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {activePage === "flashcard" ? (
          <div className="flashcard-page" id="flashcardPage" style={{ display: "block" }}>
            <div className="flashcard-container">
              <div className="flashcard-main">
                <div className="flashcard-header">
                  <button
                    className="back-btn"
                    onClick={() => {
                      setActivePage("practice");
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Orqaga
                  </button>
                  <h2>
                    {activeLesson?.title || "Lesson"} <span className="part-badge">Part 1</span>
                  </h2>
                  <div className="progress-indicator">
                    <span id="currentWordNum">{Math.min(learnedIds.size + 1, cards.length || 1)}</span>/
                    <span id="totalWords">{cards.length}</span>
                  </div>
                </div>

                <div className="flashcard">
                  <div className="word-section">
                    <h1 className="english-word" id="englishWord">
                      {currentCard?.english || ""}
                    </h1>
                    <button className="sound-btn" onClick={speakCurrent} aria-label="Speak">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
                      </svg>
                    </button>
                  </div>

                  <div className="translation-section">
                    <h2 className="uzbek-word" id="uzbekWord">
                      {currentCard?.uzbek || ""}
                    </h2>
                    <div className="pronunciation" id="pronunciation">
                      {currentCard?.pronunciation || ""}
                    </div>
                  </div>

                  <div className="example-section">
                    <button
                      className="start-btn"
                      type="button"
                      onClick={() => setShowMnemonic((v) => !v)}
                      style={{ marginBottom: 12 }}
                    >
                      {showMnemonic ? "Hide Mnemonic Example" : "Show Mnemonic Example"}
                    </button>
                    {showMnemonic ? (
                      <div className="example-box">
                        <h4>Menmonik Example</h4>
                        <p className="english-example" id="englishExample">
                          {currentCard?.mnemonic_example || ""}
                        </p>
                        <h4>Tarjima</h4>
                        <p className="uzbek-example" id="uzbekExample">
                          {currentCard?.translation || ""}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flashcard-controls">
                  <button className="control-btn dont-know-btn" onClick={dontKnowWord}>
                    Yodlamadim
                  </button>
                  <button className="control-btn know-btn" onClick={() => void knowWord()}>
                    Yodladim
                  </button>
                </div>
              </div>

              <div className="upcoming-reviews">
                <h2>Upcoming reviews</h2>
                <div className="review-group">
                  <div className="review-group-header">
                    <span className="review-day">Today</span>
                    <span className="review-count">{revisionTopics.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="completion-modal" id="completionModal" style={{ display: showCompletion ? "flex" : "none" }}>
              <div className="modal-content">
                <div className="modal-icon">🎉</div>
                <h2>Bo'lim tugadi!</h2>
                <p>Siz "{activeLesson?.title || ""}" bo'limidagi barcha so'zlarni muvaffaqiyatli o'rgandingiz!</p>
                <div className="modal-stats">
                  <div className="stat-item">
                    <span className="stat-number" id="learnedCount">
                      {cards.length}
                    </span>
                    <span className="stat-label">O'rganilgan so'zlar</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number" id="timeSpent">
                      0
                    </span>
                    <span className="stat-label">Daqiqa sarflandi</span>
                  </div>
                </div>
                <div className="modal-buttons">
                  <button
                    className="modal-btn secondary"
                    onClick={() => {
                      setActivePage("practice");
                      setShowCompletion(false);
                    }}
                  >
                    Practice sahifasiga qaytish
                  </button>
                  <button
                    className="modal-btn primary"
                    onClick={() => {
                      setActivePage("dashboard");
                      setShowCompletion(false);
                    }}
                  >
                    Dashboard ga qaytish
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activePage === "games" ? (
          <div className="dashboard">
            <section className="learning-section">
              <h2>Games</h2>
              <div className="learning-grid">
                <div className="learning-card">
                  <div className="learning-content">
                    <div className="instructor">Coming Soon</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "courses" ? (
          <div className="dashboard">
            <section className="learning-section">
              <h2>Course</h2>
              <div className="learning-grid">
                <div className="learning-card">
                  <div className="learning-content">
                    <div className="instructor">Coming Soon</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}

        {activePage === "statistics" ? (
          <div className="dashboard">
            <section className="learning-section">
              <h2>Statistics</h2>
              <div className="learning-grid">
                <div className="learning-card">
                  <div className="learning-content">
                    <div className="instructor">Coming Soon</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
