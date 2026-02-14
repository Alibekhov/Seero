from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from ..models import RevisionSchedule, RevisionStatus


SRS_INTERVALS = [
    timedelta(hours=24),
    timedelta(hours=72),
    timedelta(days=7),
    timedelta(days=14),
    timedelta(days=28),
]

MAX_STAGE = len(SRS_INTERVALS) - 1


def sync_schedule_status(schedule: RevisionSchedule, now=None) -> RevisionSchedule:
    """
    Keep `status` in sync with time.

    - due: next_review_at <= now and due today
    - expired: due date is before today
    - scheduled: due in the future
    """

    now = now or timezone.now()

    if schedule.status == RevisionStatus.COMPLETED:
        return schedule

    if not schedule.next_review_at:
        schedule.status = RevisionStatus.COMPLETED
        return schedule

    if schedule.next_review_at.date() < now.date():
        schedule.status = RevisionStatus.EXPIRED
    elif schedule.next_review_at <= now:
        schedule.status = RevisionStatus.DUE
    else:
        schedule.status = RevisionStatus.SCHEDULED

    return schedule


def create_or_reset_schedule(*, schedule: RevisionSchedule | None, user, lesson, completed_at=None) -> RevisionSchedule:
    completed_at = completed_at or timezone.now()

    if schedule is None:
        schedule = RevisionSchedule(user=user, lesson=lesson, lesson_completed_at=completed_at)

    schedule.lesson_completed_at = completed_at
    schedule.stage = 0
    schedule.last_reviewed_at = None
    schedule.next_review_at = completed_at + SRS_INTERVALS[0]
    schedule.status = RevisionStatus.SCHEDULED
    schedule.save(update_fields=["lesson_completed_at", "stage", "last_reviewed_at", "next_review_at", "status", "updated_at"])
    return schedule


def mark_reviewed(schedule: RevisionSchedule, reviewed_at=None) -> RevisionSchedule:
    reviewed_at = reviewed_at or timezone.now()

    schedule.last_reviewed_at = reviewed_at

    if schedule.stage >= MAX_STAGE:
        schedule.status = RevisionStatus.COMPLETED
        schedule.next_review_at = None
        schedule.save(update_fields=["last_reviewed_at", "status", "next_review_at", "updated_at"])
        return schedule

    schedule.stage += 1
    schedule.next_review_at = reviewed_at + SRS_INTERVALS[schedule.stage]
    schedule.status = RevisionStatus.SCHEDULED
    schedule.save(update_fields=["last_reviewed_at", "stage", "next_review_at", "status", "updated_at"])
    return schedule

