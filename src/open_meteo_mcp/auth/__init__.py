"""
Authentication module for WSO2 Identity Server integration.

This module provides JWT token validation and middleware for securing
the MCP server endpoints with WSO2 IS OAuth2/OIDC tokens.
"""

from .wso2_validator import WSO2TokenValidator
from .middleware import WSO2AuthMiddleware

__all__ = ["WSO2TokenValidator", "WSO2AuthMiddleware"]
