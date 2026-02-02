"""
Request context for storing authentication data in async-safe context variables.

This module provides a way to pass authentication context (user claims, scopes)
from the middleware to tool handlers without threading request objects through
the MCP server layer.

Implements MCP specification for OAuth 2.0 scope validation:
https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
"""

import logging
from contextvars import ContextVar
from typing import Any, Dict, List, Optional, Set

from .exceptions import ScopeRequiredError

logger = logging.getLogger("mcp-weather.auth")

# Context variable to store the current request's user claims
_request_user: ContextVar[Optional[Dict[str, Any]]] = ContextVar("request_user", default=None)

# Context variable to store scope errors that need special handling
_request_scope_error: ContextVar[Optional["ScopeRequiredError"]] = ContextVar("request_scope_error", default=None)


def set_request_user(claims: Dict[str, Any]) -> None:
    """
    Set the current request's user claims.

    Args:
        claims: JWT claims dictionary from token validation
    """
    _request_user.set(claims)


def get_request_user() -> Optional[Dict[str, Any]]:
    """
    Get the current request's user claims.

    Returns:
        JWT claims dictionary or None if not authenticated
    """
    return _request_user.get()


def clear_request_user() -> None:
    """Clear the current request's user claims."""
    _request_user.set(None)


def set_request_scope_error(error: Optional[ScopeRequiredError]) -> None:
    """
    Store a scope error in the request context for later handling.

    Args:
        error: The ScopeRequiredError to store, or None to clear
    """
    _request_scope_error.set(error)


def get_request_scope_error() -> Optional[ScopeRequiredError]:
    """
    Retrieve any scope error stored in the request context.

    Returns:
        The stored ScopeRequiredError, or None if not set
    """
    return _request_scope_error.get()


def clear_request_scope_error() -> None:
    """Clear any stored scope error from the request context."""
    _request_scope_error.set(None)


def get_user_scopes() -> Set[str]:
    """
    Get the scopes from the current user's token.

    Handles different scope claim formats:
    - 'scope': space-separated string (OAuth2 standard)
    - 'scp': array of strings (Azure AD style)
    - 'scopes': array of strings

    Returns:
        Set of scope strings, or empty set if no scopes found
    """
    claims = get_request_user()
    if not claims:
        logger.debug("No user claims available for scope extraction")
        return set()

    # Try different scope claim formats
    scopes: Set[str] = set()

    # OAuth2 standard: space-separated string in 'scope' claim
    if "scope" in claims:
        scope_value = claims["scope"]
        if isinstance(scope_value, str):
            scopes.update(scope_value.split())
        elif isinstance(scope_value, list):
            scopes.update(scope_value)

    # Azure AD style: array in 'scp' claim
    if "scp" in claims:
        scp_value = claims["scp"]
        if isinstance(scp_value, str):
            scopes.update(scp_value.split())
        elif isinstance(scp_value, list):
            scopes.update(scp_value)

    # Alternative: 'scopes' claim as array
    if "scopes" in claims:
        scopes_value = claims["scopes"]
        if isinstance(scopes_value, list):
            scopes.update(scopes_value)

    logger.debug(f"Extracted {len(scopes)} scopes for user")
    return scopes


def has_scope(required_scope: str) -> bool:
    """
    Check if the current user has a specific scope.

    Args:
        required_scope: The scope to check for

    Returns:
        True if the user has the scope, False otherwise
    """
    return required_scope in get_user_scopes()


def require_scope(required_scope: str, resource_metadata_url: Optional[str] = None) -> None:
    """
    Require that the current user has a specific scope.

    Args:
        required_scope: The scope that must be present
        resource_metadata_url: Optional URL to OAuth protected resource metadata

    Raises:
        ScopeRequiredError: If the user doesn't have the required scope
    """
    if not has_scope(required_scope):
        user = get_request_user()
        user_id = user.get("sub", "unknown") if user else "unauthenticated"
        available_scopes = list(get_user_scopes())
        logger.warning(
            f"User {user_id} missing required scope '{required_scope}'. "
            f"Available scopes: {available_scopes}"
        )
        raise ScopeRequiredError(
            required_scopes=[required_scope],
            available_scopes=available_scopes,
            resource_metadata_url=resource_metadata_url,
        )


def require_any_scope(
    required_scopes: List[str], resource_metadata_url: Optional[str] = None
) -> None:
    """
    Require that the current user has at least one of the specified scopes.

    Args:
        required_scopes: List of scopes, at least one must be present
        resource_metadata_url: Optional URL to OAuth protected resource metadata

    Raises:
        ScopeRequiredError: If the user doesn't have any of the required scopes
    """
    user_scopes = get_user_scopes()
    if not any(scope in user_scopes for scope in required_scopes):
        user = get_request_user()
        user_id = user.get("sub", "unknown") if user else "unauthenticated"
        available_scopes = list(user_scopes)
        logger.warning(
            f"User {user_id} missing required scopes (need one of: {required_scopes}). "
            f"Available scopes: {available_scopes}"
        )
        raise ScopeRequiredError(
            required_scopes=required_scopes,
            available_scopes=available_scopes,
            resource_metadata_url=resource_metadata_url,
            message=f"Requires one of these scopes: {', '.join(required_scopes)}",
        )
