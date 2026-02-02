"""
Request context for storing authentication data in async-safe context variables.

This module provides a way to pass authentication context (user claims, scopes)
from the middleware to tool handlers without threading request objects through
the MCP server layer.
"""

import logging
from contextvars import ContextVar
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger("mcp-weather.auth")

# Context variable to store the current request's user claims
_request_user: ContextVar[Optional[Dict[str, Any]]] = ContextVar("request_user", default=None)


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


def require_scope(required_scope: str) -> None:
    """
    Require that the current user has a specific scope.

    Args:
        required_scope: The scope that must be present

    Raises:
        PermissionError: If the user doesn't have the required scope
    """
    if not has_scope(required_scope):
        user = get_request_user()
        user_id = user.get("sub", "unknown") if user else "unauthenticated"
        available_scopes = get_user_scopes()
        logger.warning(
            f"User {user_id} missing required scope '{required_scope}'. "
            f"Available scopes: {available_scopes}"
        )
        raise PermissionError(
            f"Access denied: required scope '{required_scope}' not granted. "
            f"Please ensure this scope is requested during authentication."
        )


def require_any_scope(required_scopes: List[str]) -> None:
    """
    Require that the current user has at least one of the specified scopes.

    Args:
        required_scopes: List of scopes, at least one must be present

    Raises:
        PermissionError: If the user doesn't have any of the required scopes
    """
    user_scopes = get_user_scopes()
    if not any(scope in user_scopes for scope in required_scopes):
        user = get_request_user()
        user_id = user.get("sub", "unknown") if user else "unauthenticated"
        logger.warning(
            f"User {user_id} missing required scopes (need one of: {required_scopes}). "
            f"Available scopes: {user_scopes}"
        )
        raise PermissionError(
            f"Access denied: requires one of these scopes: {', '.join(required_scopes)}"
        )
