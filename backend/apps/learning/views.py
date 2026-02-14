from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions

from .models import Course, Lesson
from .serializers import CourseSerializer, LessonCardSerializer, LessonSerializer


class CourseListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Course.objects.filter(is_active=True).order_by("title")
    serializer_class = CourseSerializer


class LessonListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Lesson.objects.select_related("course").all().order_by("order", "title")
    serializer_class = LessonSerializer


class LessonCardsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LessonCardSerializer

    def get_queryset(self):
        lesson = get_object_or_404(Lesson, slug=self.kwargs["lesson_slug"])
        return lesson.cards.all().order_by("order", "english")
