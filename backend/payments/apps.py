from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    name = 'payments'
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        """Import signals when app is ready"""
        import payments.models  # noqa: F401 - Import to register signals
