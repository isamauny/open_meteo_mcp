"""
Authentication module for WSO2 Identity Server integration.

This module provides JWT token validation and middleware for securing
the MCP server endpoints with WSO2 IS OAuth2/OIDC tokens.

Implements MCP specification for OAuth 2.0 authorization:
https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
"""

from .wso2_validator import WSO2TokenValidator
from .middleware import WSO2AuthMiddleware
from .exceptions import (
    AuthenticationError,
    TokenValidationError,
    ScopeRequiredError,
)
from .request_context import (
    set_request_user,
    get_request_user,
    clear_request_user,
    set_request_scope_error,
    get_request_scope_error,
    clear_request_scope_error,
    get_user_scopes,
    has_scope,
    require_scope,
    require_any_scope,
)

__all__ = [
    "WSO2TokenValidator",
    "WSO2AuthMiddleware",
    "AuthenticationError",
    "TokenValidationError",
    "ScopeRequiredError",
    "set_request_user",
    "get_request_user",
    "clear_request_user",
    "set_request_scope_error",
    "get_request_scope_error",
    "clear_request_scope_error",
    "get_user_scopes",
    "has_scope",
    "require_scope",
    "require_any_scope",
]
