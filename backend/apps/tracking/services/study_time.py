from __future__ import annotations

from datetime import timedelta

from django.db.models import Sum
from django.utils import timezone

from ..models import StudySession


def get_study_seconds_summary(*, user, now=None) -> dict[str, int]:
    """
    Returns a summary of study time:
    - today_seconds: summed duration for sessions started today
    - week_seconds: last 7 days (rolling window)
    - total_seconds: all-time
    """

    now = now or timezone.now()
    today = now.date()
    week_start = now - timedelta(days=7)

    today_seconds = (
        StudySession.objects.filter(user=user, started_at__date=today).aggregate(total=Sum("duration_seconds"))["total"]
        or 0
    )
    week_seconds = (
        StudySession.objects.filter(user=user, started_at__gte=week_start).aggregate(total=Sum("duration_seconds"))["total"]
        or 0
    )
    total_seconds = (
        StudySession.objects.filter(user=user).aggregate(total=Sum("duration_seconds"))["total"] or 0
    )

    return {
        "today_seconds": int(today_seconds),
        "week_seconds": int(week_seconds),
        "total_seconds": int(total_seconds),
    }

