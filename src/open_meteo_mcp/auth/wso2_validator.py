"""
WSO2 Identity Server JWT Token Validator.

This module provides functionality to validate JWT tokens issued by WSO2 IS
by fetching the JWKS (JSON Web Key Set) and verifying token signatures.
"""

import logging
import time
from typing import Any, Dict, Optional

import httpx
from jose import jwt, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError

from .exceptions import TokenValidationError

logger = logging.getLogger("mcp-weather.auth")


class WSO2TokenValidator:
    """
    Validates JWT tokens issued by WSO2 Identity Server.

    Features:
    - Fetches and caches JWKS from WSO2 IS
    - Validates token signature, expiry, issuer, and audience
    - Thread-safe JWKS caching with TTL
    """

    def __init__(
        self,
        issuer_url: str,
        audience: Optional[str] = None,
        jwks_cache_ttl: int = 3600,
        validate_issuer: bool = True,
        verify_ssl: bool = True,
    ):
        """
        Initialize the WSO2 token validator.

        Args:
            issuer_url: Base URL of WSO2 IS / Asgardeo (e.g., https://api.asgardeo.io/t/myorg)
            audience: Expected audience claim (client_id). If None, audience is not validated.
            jwks_cache_ttl: Time-to-live for JWKS cache in seconds (default: 1 hour)
            validate_issuer: Whether to validate the issuer claim (default: True)
            verify_ssl: Whether to verify SSL certificates (default: True, set False only for local dev)
        """
        self.issuer_url = issuer_url + '/oauth2/token'
        self.audience = audience
        self.jwks_cache_ttl = jwks_cache_ttl
        self.validate_issuer = validate_issuer
        self.verify_ssl = verify_ssl

        # JWKS endpoint - handle both WSO2 IS and Asgardeo formats
        if "/oauth2" in self.issuer_url:
            # URL already contains oauth2 path (e.g., .../oauth2/token)
            base_url = self.issuer_url.rsplit("/oauth2", 1)[0]
            self.jwks_url = f"{base_url}/oauth2/jwks"
        else:
            # Base URL provided, append oauth2/jwks
            self.jwks_url = f"{self.issuer_url}/oauth2/jwks"

        # Cache for JWKS
        self._jwks: Optional[Dict[str, Any]] = None
        self._jwks_fetched_at: float = 0

        logger.info(f"WSO2TokenValidator initialized (issuer validation: {validate_issuer}, SSL verify: {verify_ssl})")
        logger.info(f"JWKS URL: {self.jwks_url}")
        if not verify_ssl:
            logger.warning("SSL verification is DISABLED - this should only be used in development!")

    async def _fetch_jwks(self) -> Dict[str, Any]:
        """
        Fetch JWKS from WSO2 IS.

        Returns:
            JWKS dictionary containing public keys

        Raises:
            TokenValidationError: If JWKS fetch fails
        """
        try:
            async with httpx.AsyncClient(verify=self.verify_ssl) as client:
                response = await client.get(self.jwks_url, timeout=10.0)
                response.raise_for_status()
                jwks = response.json()
                logger.debug(f"Fetched JWKS from {self.jwks_url}")
                return jwks
        except httpx.HTTPError as e:
            logger.error(f"Failed to fetch JWKS from {self.jwks_url}: {e}")
            raise TokenValidationError(f"Failed to fetch JWKS: {e}") from e
        except Exception as e:
            logger.error(f"Unexpected error fetching JWKS: {e}")
            raise TokenValidationError(f"Unexpected error fetching JWKS: {e}") from e

    async def _get_jwks(self) -> Dict[str, Any]:
        """
        Get JWKS, using cache if available and not expired.

        Returns:
            JWKS dictionary
        """
        current_time = time.time()

        # Check if cache is valid
        if self._jwks is not None and (current_time - self._jwks_fetched_at) < self.jwks_cache_ttl:
            return self._jwks

        # Fetch fresh JWKS
        self._jwks = await self._fetch_jwks()
        self._jwks_fetched_at = current_time

        return self._jwks

    async def validate_token(self, token: str) -> Dict[str, Any]:
        """
        Validate a JWT token.

        Args:
            token: JWT token string

        Returns:
            Decoded token claims as a dictionary

        Raises:
            TokenValidationError: If token validation fails
        """
        try:
            # Get JWKS
            jwks = await self._get_jwks()

            # Print Token (TO BE REMOVED)
            logger.info ("Token: " + token)
            
            # Get the unverified header to find the key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise TokenValidationError("Token header missing 'kid' claim")

            # Find the matching key in JWKS
            rsa_key = None
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    rsa_key = key
                    break

            if not rsa_key:
                # Key not found, try refreshing JWKS (key rotation)
                logger.warning(f"Key {kid} not found in cached JWKS, refreshing...")
                self._jwks = None  # Force refresh
                jwks = await self._get_jwks()

                for key in jwks.get("keys", []):
                    if key.get("kid") == kid:
                        rsa_key = key
                        break

                if not rsa_key:
                    raise TokenValidationError(f"Public key with kid '{kid}' not found in JWKS")

            # Build validation options
            options = {
                "verify_signature": True,
                "verify_exp": True,
                "verify_nbf": True,
                "verify_iat": True,
                "require_exp": True,
                "verify_iss": self.validate_issuer,
                "verify_aud": bool(self.audience),
            }

            # Decode and validate the token
            claims = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256", "RS384", "RS512"],
                audience=self.audience if self.audience else None,
                issuer=self.issuer_url if self.validate_issuer else None,
                options=options,
            )

            logger.debug(f"Token validated successfully for subject: {claims.get('sub')}")
            return claims

        except ExpiredSignatureError:
            logger.warning("Token has expired")
            raise TokenValidationError("Token has expired")
        except JWTClaimsError as e:
            logger.warning(f"Token claims validation failed: {e}")
            raise TokenValidationError(f"Token claims validation failed: {e}")
        except JWTError as e:
            logger.warning(f"JWT validation failed: {e}")
            raise TokenValidationError(f"JWT validation failed: {e}")
        except TokenValidationError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error validating token: {e}")
            raise TokenValidationError(f"Unexpected error validating token: {e}") from e

    def clear_cache(self) -> None:
        """Clear the JWKS cache."""
        self._jwks = None
        self._jwks_fetched_at = 0
        logger.debug("JWKS cache cleared")
