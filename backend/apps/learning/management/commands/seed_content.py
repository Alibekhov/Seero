from __future__ import annotations

import json
from pathlib import Path

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.learning.models import Course, Lesson, LessonCard


class Command(BaseCommand):
    help = "Seed initial Course/Lesson/LessonCard data from seed.json"

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=None,
            help="Optional path to seed.json (defaults to apps/learning/seed_data/seed.json).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["path"]:
            seed_path = Path(options["path"]).resolve()
        else:
            seed_path = Path(__file__).resolve().parents[2] / "seed_data" / "seed.json"

        if not seed_path.exists():
            raise SystemExit(f"Seed file not found: {seed_path}")

        seed = json.loads(seed_path.read_text(encoding="utf8"))
        course_data = seed["course"]
        lessons_data = seed["lessons"]

        course, _ = Course.objects.update_or_create(
            slug=course_data["slug"],
            defaults={
                "title": course_data["title"],
                "description": course_data.get("description", ""),
                "is_active": True,
            },
        )

        for lesson_data in lessons_data:
            lesson, _ = Lesson.objects.update_or_create(
                slug=lesson_data["slug"],
                defaults={
                    "course": course,
                    "title": lesson_data["title"],
                    "cover_image_path": lesson_data.get("cover_image_path", ""),
                    "order": int(lesson_data.get("order", 0)),
                },
            )

            LessonCard.objects.filter(lesson=lesson).delete()
            LessonCard.objects.bulk_create(
                [
                    LessonCard(
                        lesson=lesson,
                        order=int(card.get("order", idx + 1)),
                        english=card["english"],
                        uzbek=card["uzbek"],
                        pronunciation=card.get("pronunciation", ""),
                        mnemonic_example=card.get("mnemonic_example", ""),
                        translation=card.get("translation", ""),
                    )
                    for idx, card in enumerate(lesson_data.get("cards", []))
                ],
                batch_size=500,
            )

        self.stdout.write(self.style.SUCCESS("Seeded content successfully."))
