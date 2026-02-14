from __future__ import annotations

from rest_framework import generics, permissions

from .models import ContactMessage
from .serializers import ContactMessageCreateSerializer


class ContactMessageCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageCreateSerializer

    def perform_create(self, serializer):
        request = self.request
        serializer.save(
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=(request.META.get("HTTP_USER_AGENT") or "")[:500],
        )
