from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class StudySession(models.Model):
    """
    Tracks active study time. The frontend reports active seconds via `ping`.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_sessions")

    context = models.CharField(max_length=255, blank=True)

    started_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    last_ping_at = models.DateTimeField(null=True, blank=True)

    duration_seconds = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "started_at"]),
            models.Index(fields=["user", "is_active"]),
        ]
        ordering = ["-started_at"]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.duration_seconds}s"


class RevisionStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    DUE = "due", "Due"
    EXPIRED = "expired", "Expired"
    COMPLETED = "completed", "Completed"


class RevisionSchedule(models.Model):
    """
    One schedule per user+lesson (MVP). Stage maps to the next interval in the SRS sequence.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="revision_schedules")
    lesson = models.ForeignKey("learning.Lesson", on_delete=models.CASCADE, related_name="revision_schedules")

    lesson_completed_at = models.DateTimeField()

    stage = models.PositiveSmallIntegerField(default=0)
    next_review_at = models.DateTimeField(null=True, blank=True)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=16,
        choices=RevisionStatus.choices,
        default=RevisionStatus.SCHEDULED,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "lesson"], name="uniq_revision_user_lesson"),
        ]
        indexes = [
            models.Index(fields=["user", "status", "next_review_at"]),
            models.Index(fields=["user", "lesson"]),
        ]
        ordering = ["next_review_at"]

    def __str__(self) -> str:
        return f"{self.user_id} - {self.lesson_id} - {self.status}"
