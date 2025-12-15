"""
Mixin for field selection support in DRF viewsets.
Allows clients to request only specific fields using ?fields=id,name,status
"""
from rest_framework import serializers


class FieldSelectionMixin:
    """
    Mixin to support field selection via ?fields=field1,field2 query parameter.
    Only works with ModelSerializer.
    """
    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        
        # Support ?fields=id,period,status to return only specified fields
        fields_param = self.request.query_params.get('fields')
        if fields_param and isinstance(serializer, serializers.ModelSerializer):
            fields = [f.strip() for f in fields_param.split(',') if f.strip()]
            if fields:
                # Create a new serializer class with only the requested fields
                class DynamicSerializer(serializer.__class__):
                    class Meta(serializer.__class__.Meta):
                        fields = fields
                        read_only_fields = [f for f in (getattr(serializer.__class__.Meta, 'read_only_fields', []) or []) if f in fields]
                
                # Copy the instance data
                serializer = DynamicSerializer(serializer.instance, context=serializer.context)
        
        return serializer

