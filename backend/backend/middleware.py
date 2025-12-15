"""
Performance monitoring middleware to log slow requests.
"""
import time
import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('backend')


class PerformanceMiddleware(MiddlewareMixin):
    """
    Middleware to log slow requests for performance monitoring.
    Logs requests that take longer than 1 second.
    """
    def process_request(self, request):
        """Record start time for request"""
        request._start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Log slow requests"""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Log requests that take longer than 1 second
            if duration > 1.0:
                logger.warning(
                    f'Slow request: {request.method} {request.path} '
                    f'took {duration:.2f}s (status: {response.status_code})'
                )
            # Log very slow requests (>3 seconds) as errors
            elif duration > 3.0:
                logger.error(
                    f'Very slow request: {request.method} {request.path} '
                    f'took {duration:.2f}s (status: {response.status_code})'
                )
        
        return response

