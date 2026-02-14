from __future__ import annotations

from django.contrib import admin

from .models import RevisionSchedule, StudySession


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ("user", "context", "duration_seconds", "is_active", "started_at", "ended_at")
    list_filter = ("is_active",)
    search_fields = ("user__email", "context")
    ordering = ("-started_at",)


@admin.register(RevisionSchedule)
class RevisionScheduleAdmin(admin.ModelAdmin):
    list_display = ("user", "lesson", "status", "stage", "next_review_at", "last_reviewed_at")
    list_filter = ("status", "stage")
    search_fields = ("user__email", "lesson__title", "lesson__slug")
    ordering = ("next_review_at",)
