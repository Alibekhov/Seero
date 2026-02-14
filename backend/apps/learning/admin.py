from __future__ import annotations

from django.contrib import admin

from .models import Course, Lesson, LessonCard


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "is_active", "created_at")
    search_fields = ("title", "slug")
    list_filter = ("is_active",)


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "slug", "course", "order", "created_at")
    search_fields = ("title", "slug")
    list_filter = ("course",)
    ordering = ("course", "order")


@admin.register(LessonCard)
class LessonCardAdmin(admin.ModelAdmin):
    list_display = ("lesson", "order", "english", "uzbek")
    search_fields = ("english", "uzbek", "lesson__title")
    list_filter = ("lesson",)
    ordering = ("lesson", "order")
