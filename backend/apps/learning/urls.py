from django.urls import path

from .views import CourseListView, LessonCardsView, LessonListView


urlpatterns = [
    path("courses/", CourseListView.as_view(), name="course-list"),
    path("lessons/", LessonListView.as_view(), name="lesson-list"),
    path("lessons/<slug:lesson_slug>/cards/", LessonCardsView.as_view(), name="lesson-cards"),
]

