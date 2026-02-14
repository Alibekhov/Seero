from __future__ import annotations

from rest_framework import serializers

from apps.learning.models import Lesson

from .models import RevisionSchedule, StudySession


class StudySessionStartSerializer(serializers.Serializer):
    context = serializers.CharField(max_length=255, required=False, allow_blank=True)


class StudySessionPingSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
    active_seconds = serializers.IntegerField(min_value=1, max_value=60 * 60)


class StudySessionStopSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()


class LessonCompleteSerializer(serializers.Serializer):
    lesson_slug = serializers.SlugField()


class LessonMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = ("id", "slug", "title", "cover_image_path")


class RevisionScheduleSerializer(serializers.ModelSerializer):
    lesson = LessonMiniSerializer()

    class Meta:
        model = RevisionSchedule
        fields = ("id", "lesson", "stage", "next_review_at", "status", "lesson_completed_at", "last_reviewed_at")


class StudySessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudySession
        fields = ("id", "context", "started_at", "ended_at", "duration_seconds", "is_active")

