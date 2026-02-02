"""
Authentication module for WSO2 Identity Server integration.

This module provides JWT token validation and middleware for securing
the MCP server endpoints with WSO2 IS OAuth2/OIDC tokens.
"""

from .wso2_validator import WSO2TokenValidator
from .middleware import WSO2AuthMiddleware
from .request_context import (
    set_request_user,
    get_request_user,
    clear_request_user,
    get_user_scopes,
    has_scope,
    require_scope,
    require_any_scope,
)

__all__ = [
    "WSO2TokenValidator",
    "WSO2AuthMiddleware",
    "set_request_user",
    "get_request_user",
    "clear_request_user",
    "get_user_scopes",
    "has_scope",
    "require_scope",
    "require_any_scope",
]
