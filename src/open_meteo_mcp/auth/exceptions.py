"""
Custom exceptions for authentication and authorization.

Implements MCP specification for OAuth 2.0 Bearer token authentication:
https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
"""

from typing import List, Optional


class AuthenticationError(Exception):
    """Base exception for authentication errors."""

    pass


class TokenValidationError(AuthenticationError):
    """Exception raised when token validation fails."""

    pass


class ScopeRequiredError(AuthenticationError):
    """
    Exception raised when required OAuth2 scopes are missing.

    This exception should result in a 401 Unauthorized response with
    WWW-Authenticate header per MCP specification.

    Attributes:
        required_scopes: List of required scopes (at least one must be present)
        available_scopes: Scopes that the user currently has
        resource_metadata_url: URL to OAuth protected resource metadata (optional)
        message: Human-readable error message
    """

    def __init__(
        self,
        required_scopes: List[str],
        available_scopes: Optional[List[str]] = None,
        resource_metadata_url: Optional[str] = None,
        message: Optional[str] = None,
    ):
        """
        Initialize the scope required error.

        Args:
            required_scopes: List of scopes required for this resource
            available_scopes: Scopes the user currently has
            resource_metadata_url: URL to OAuth protected resource metadata
            message: Optional custom error message
        """
        self.required_scopes = required_scopes
        self.available_scopes = available_scopes or []
        self.resource_metadata_url = resource_metadata_url

        if message:
            self.message = message
        else:
            scope_str = ", ".join(required_scopes)
            if len(required_scopes) == 1:
                self.message = f"Required scope: {scope_str}"
            else:
                self.message = f"Required scopes (at least one): {scope_str}"

        super().__init__(self.message)

    def get_www_authenticate_header(self) -> str:
        """
        Generate the WWW-Authenticate header value per MCP specification.

        Returns:
            WWW-Authenticate header value
        """
        parts = ["Bearer"]

        # Add resource metadata URL if provided
        if self.resource_metadata_url:
            parts.append(f'resource_metadata="{self.resource_metadata_url}"')

        # Add required scopes
        scope_str = " ".join(self.required_scopes)
        parts.append(f'scope="{scope_str}"')

        return ", ".join(parts)

    def to_json_response(self) -> dict:
        """
        Create a JSON response body for the error.

        Returns:
            Dictionary suitable for JSON response
        """
        return {
            "error": "insufficient_scope",
            "message": self.message,
            "required_scopes": self.required_scopes,
            "available_scopes": self.available_scopes,
        }
