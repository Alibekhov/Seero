from __future__ import annotations

from rest_framework import serializers

from .models import Course, Lesson, LessonCard


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "title", "slug", "description")


class LessonSerializer(serializers.ModelSerializer):
    card_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Lesson
        fields = ("id", "course", "title", "slug", "cover_image_path", "order", "card_count")


class LessonCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonCard
        fields = ("id", "order", "english", "uzbek", "pronunciation", "mnemonic_example", "translation")

