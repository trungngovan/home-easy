from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Notification ViewSet with optimized queries.
    
    Supports filtering:
    - ?channel=inapp,email,push
    - ?user=<user_id>
    - ?template=<template_name>
    
    Custom actions:
    - /my-notifications/ - Get current user's notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        "channel": ["exact", "in"],
        "user": ["exact"],
        "template": ["exact"],
        "is_read": ["exact"],
        "priority": ["exact", "in"],
        "related_object_type": ["exact"],
    }
    ordering_fields = ["created_at", "sent_at", "priority"]

    def get_queryset(self):
        """
        Filter queryset based on user role for security.
        - All users: Only see their own notifications
        - Superusers: Can see all notifications
        """
        user = self.request.user
        queryset = Notification.objects.select_related("user").order_by("-created_at")

        # Superusers can see everything
        if user.is_superuser:
            return queryset

        # All other users can only see their own notifications
        return queryset.filter(user=user)

    @action(detail=False, methods=["get"])
    def my_notifications(self, request):
        """Get notifications for current user only"""
        notifications = self.get_queryset().filter(user=request.user)
        page = self.paginate_queryset(notifications)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=True, methods=["post"])
    def mark_unread(self, request, pk=None):
        """Mark notification as unread"""
        notification = self.get_object()
        notification.mark_as_unread()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        """Mark all user's notifications as read"""
        from django.utils import timezone
        count = self.get_queryset().filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        return Response({"marked_read": count})
    
    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """Get unread notification count for current user"""
        count = self.get_queryset().filter(
            user=request.user,
            is_read=False
        ).count()
        return Response({"unread_count": count})