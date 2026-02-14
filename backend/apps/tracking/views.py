from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.learning.models import Lesson

from .models import RevisionSchedule, StudySession
from .serializers import (
    RevisionScheduleSerializer,
    StudySessionPingSerializer,
    StudySessionSerializer,
    StudySessionStartSerializer,
    StudySessionStopSerializer,
)
from .services.spaced_repetition import create_or_reset_schedule, mark_reviewed, sync_schedule_status
from .services.study_time import get_study_seconds_summary


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()

        # Sync statuses (MVP: done on-demand; consider a periodic job in production)
        schedules = list(RevisionSchedule.objects.select_related("lesson").filter(user=request.user))
        dirty = []
        for schedule in schedules:
            before = schedule.status
            sync_schedule_status(schedule, now=now)
            if schedule.status != before:
                schedule.updated_at = now
                dirty.append(schedule)

        if dirty:
            RevisionSchedule.objects.bulk_update(dirty, ["status", "updated_at"])

        queue = [s for s in schedules if s.status != "completed" and s.next_review_at]
        queue_sorted = sorted(queue, key=lambda s: (s.next_review_at or now))

        due_today = [
            s for s in schedules if s.status in ("due", "expired") or (s.next_review_at and s.next_review_at.date() <= now.date())
        ]
        due_today_sorted = sorted(due_today, key=lambda s: (s.next_review_at or now))

        return Response(
            {
                "user": {
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "email": request.user.email,
                },
                "study_time": get_study_seconds_summary(user=request.user, now=now),
                "revision_topics": RevisionScheduleSerializer(due_today_sorted, many=True).data,
                "revision_queue": RevisionScheduleSerializer(queue_sorted, many=True).data,
            }
        )


class StudySessionStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StudySessionStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = StudySession.objects.create(
            user=request.user,
            context=serializer.validated_data.get("context", ""),
            last_ping_at=timezone.now(),
        )
        return Response(StudySessionSerializer(session).data, status=status.HTTP_201_CREATED)


class StudySessionPingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StudySessionPingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_object_or_404(
            StudySession,
            id=serializer.validated_data["session_id"],
            user=request.user,
            is_active=True,
        )
        session.duration_seconds += int(serializer.validated_data["active_seconds"])
        session.last_ping_at = timezone.now()
        session.save(update_fields=["duration_seconds", "last_ping_at", "updated_at"])
        return Response({"duration_seconds": session.duration_seconds})


class StudySessionStopView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = StudySessionStopSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session = get_object_or_404(
            StudySession,
            id=serializer.validated_data["session_id"],
            user=request.user,
            is_active=True,
        )
        session.is_active = False
        session.ended_at = timezone.now()
        session.save(update_fields=["is_active", "ended_at", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonCompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, lesson_slug: str):
        lesson = get_object_or_404(Lesson, slug=lesson_slug)
        existing = RevisionSchedule.objects.filter(user=request.user, lesson=lesson).first()
        schedule = create_or_reset_schedule(schedule=existing, user=request.user, lesson=lesson)
        return Response(RevisionScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)


class RevisionDueListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = RevisionScheduleSerializer

    def get_queryset(self):
        now = timezone.now()
        qs = RevisionSchedule.objects.select_related("lesson").filter(user=self.request.user).exclude(status="completed")
        schedules = list(qs)
        dirty = []
        for schedule in schedules:
            before = schedule.status
            sync_schedule_status(schedule, now=now)
            if schedule.status != before:
                schedule.updated_at = now
                dirty.append(schedule)

        if dirty:
            RevisionSchedule.objects.bulk_update(dirty, ["status", "updated_at"])

        return qs.filter(next_review_at__date__lte=now.date()).order_by("next_review_at")


class RevisionReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, schedule_id):
        schedule = get_object_or_404(
            RevisionSchedule.objects.select_related("lesson"),
            id=schedule_id,
            user=request.user,
        )
        mark_reviewed(schedule)
        sync_schedule_status(schedule)
        return Response(RevisionScheduleSerializer(schedule).data)
