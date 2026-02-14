from __future__ import annotations

import uuid

from django.db import models
from django.utils.text import slugify


class Course(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]
        ordering = ["title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.title


class Lesson(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    cover_image_path = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["course", "order"]),
        ]
        ordering = ["order", "title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)

    @property
    def card_count(self) -> int:
        return self.cards.count()

    def __str__(self) -> str:
        return self.title


class LessonCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="cards")
    order = models.PositiveIntegerField(default=0)

    english = models.CharField(max_length=255)
    uzbek = models.CharField(max_length=255)
    pronunciation = models.CharField(max_length=255, blank=True)

    mnemonic_example = models.TextField(blank=True)
    translation = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["lesson", "order"]),
            models.Index(fields=["lesson", "english"]),
        ]
        ordering = ["order", "english"]
        unique_together = (("lesson", "english"),)

    def __str__(self) -> str:
        return f"{self.lesson.title}: {self.english}"
