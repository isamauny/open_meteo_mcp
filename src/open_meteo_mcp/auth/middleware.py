"""
Starlette middleware for WSO2 IS authentication.

This middleware intercepts HTTP requests and validates JWT tokens
from the Authorization header before allowing access to protected endpoints.

Implements MCP specification for OAuth 2.0 Bearer token authentication:
https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
"""

import logging
from typing import Callable, Optional, Set

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .wso2_validator import WSO2TokenValidator
from .exceptions import TokenValidationError, ScopeRequiredError
from .request_context import set_request_user, clear_request_user

logger = logging.getLogger("mcp-weather.auth")


class WSO2AuthMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware for validating WSO2 IS JWT tokens.

    This middleware:
    - Extracts Bearer tokens from Authorization header
    - Validates tokens using WSO2TokenValidator
    - Stores validated claims in request.state.user
    - Returns 401 Unauthorized for invalid/missing tokens
    - Returns WWW-Authenticate headers per MCP specification for scope errors
    """

    def __init__(
        self,
        app,
        validator: WSO2TokenValidator,
        exclude_paths: Optional[Set[str]] = None,
        exclude_methods: Optional[Set[str]] = None,
        resource_metadata_url: Optional[str] = None,
    ):
        """
        Initialize the auth middleware.

        Args:
            app: The ASGI application
            validator: WSO2TokenValidator instance
            exclude_paths: Paths to exclude from authentication (e.g., {"/health"})
            exclude_methods: HTTP methods to exclude (e.g., {"OPTIONS"})
            resource_metadata_url: URL to OAuth protected resource metadata (for WWW-Authenticate)
        """
        super().__init__(app)
        self.validator = validator
        self.exclude_paths = exclude_paths or set()
        self.exclude_methods = exclude_methods or {"OPTIONS"}
        self.resource_metadata_url = resource_metadata_url

        logger.info(f"WSO2AuthMiddleware initialized (excluded paths: {self.exclude_paths})")

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and validate authentication.

        Args:
            request: The incoming request
            call_next: The next middleware/handler in the chain

        Returns:
            Response from the next handler or 401 error
        """
        # Skip authentication for excluded methods (e.g., CORS preflight)
        if request.method in self.exclude_methods:
            return await call_next(request)

        # Skip authentication for excluded paths
        if request.url.path in self.exclude_paths:
            return await call_next(request)

        # Extract Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header:
            logger.warning(f"Missing Authorization header for {request.method} {request.url.path}")
            return JSONResponse(
                status_code=401,
                content={
                    "error": "unauthorized",
                    "message": "Missing Authorization header",
                },
            )

        # Check for Bearer token format
        if not auth_header.startswith("Bearer "):
            logger.warning("Invalid Authorization header format")
            return JSONResponse(
                status_code=401,
                content={
                    "error": "unauthorized",
                    "message": "Invalid Authorization header format. Expected 'Bearer <token>'",
                },
            )

        # Extract the token
        token = auth_header[7:]  # Remove "Bearer " prefix

        if not token:
            logger.warning("Empty token in Authorization header")
            return JSONResponse(
                status_code=401,
                content={
                    "error": "unauthorized",
                    "message": "Empty token",
                },
            )

        # Validate the token
        try:
            claims = await self.validator.validate_token(token)

            # Store validated claims in request state
            request.state.user = claims
            request.state.access_token = token

            # Set claims in context variable for tool handlers to access
            set_request_user(claims)

            logger.debug(f"Authenticated request from user: {claims.get('sub')}")

            try:
                # Proceed to the next handler
                response = await call_next(request)

                # Check if the response is a scope error (injected by tool handlers)
                # This is for handling scope errors that occur during tool execution
                if hasattr(request.state, "scope_error"):
                    scope_error: ScopeRequiredError = request.state.scope_error
                    return self._create_scope_error_response(scope_error)

                return response
            finally:
                # Clear context after request completes
                clear_request_user()

        except ScopeRequiredError as e:
            # Handle scope errors with proper WWW-Authenticate header per MCP spec
            logger.warning(f"Scope validation failed: {e.message}")
            return self._create_scope_error_response(e)

        except TokenValidationError as e:
            logger.warning(f"Token validation failed: {e}")
            return JSONResponse(
                status_code=401,
                headers={
                    "WWW-Authenticate": 'Bearer error="invalid_token"',
                },
                content={
                    "error": "invalid_token",
                    "message": str(e),
                },
            )
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {e}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_error",
                    "message": "Authentication error",
                },
            )

    def _create_scope_error_response(self, error: ScopeRequiredError) -> JSONResponse:
        """
        Create a 401 response with WWW-Authenticate header per MCP specification.

        Args:
            error: The ScopeRequiredError instance

        Returns:
            JSONResponse with proper headers and content
        """
        # Set resource metadata URL if configured
        if self.resource_metadata_url and not error.resource_metadata_url:
            error.resource_metadata_url = self.resource_metadata_url

        return JSONResponse(
            status_code=401,
            headers={
                "WWW-Authenticate": error.get_www_authenticate_header(),
            },
            content=error.to_json_response(),
        )


def create_auth_middleware(
    issuer_url: str,
    audience: Optional[str] = None,
    exclude_paths: Optional[Set[str]] = None,
    resource_metadata_url: Optional[str] = None,
) -> Callable:
    """
    Factory function to create the auth middleware.

    Args:
        issuer_url: WSO2 IS base URL
        audience: Expected audience claim (client_id)
        exclude_paths: Paths to exclude from authentication
        resource_metadata_url: URL to OAuth protected resource metadata (for WWW-Authenticate)

    Returns:
        A function that creates the middleware for a given app
    """
    validator = WSO2TokenValidator(issuer_url=issuer_url, audience=audience)

    def middleware_factory(app):
        return WSO2AuthMiddleware(
            app=app,
            validator=validator,
            exclude_paths=exclude_paths,
            resource_metadata_url=resource_metadata_url,
        )

    return middleware_factory
