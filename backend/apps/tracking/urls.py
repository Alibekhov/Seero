from django.urls import path

from .views import (
    DashboardStatsView,
    LessonCompleteView,
    RevisionDueListView,
    RevisionReviewView,
    StudySessionPingView,
    StudySessionStartView,
    StudySessionStopView,
)


urlpatterns = [
    path("dashboard/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("study-sessions/start/", StudySessionStartView.as_view(), name="study-session-start"),
    path("study-sessions/ping/", StudySessionPingView.as_view(), name="study-session-ping"),
    path("study-sessions/stop/", StudySessionStopView.as_view(), name="study-session-stop"),
    path("lessons/<slug:lesson_slug>/complete/", LessonCompleteView.as_view(), name="lesson-complete"),
    path("revisions/due/", RevisionDueListView.as_view(), name="revision-due"),
    path("revisions/<uuid:schedule_id>/review/", RevisionReviewView.as_view(), name="revision-review"),
]

