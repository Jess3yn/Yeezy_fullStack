"""Autenticación para subscriptions (WebSocket).

El navegador no puede enviar el header Authorization en un WebSocket, así que
el cliente manda el token en el mensaje inicial de conexión (connection_params):

    { "Authorization": "Bearer <access_token>" }

La lógica replica la de BearerGraphQLView en config/urls.py.
"""
from typing import Any

from yeezy_back.jwt_servicce import decodificar_token


def usuario_desde_connection_params(connection_params: Any) -> tuple[dict | None, bool]:
    """Devuelve (usuario, token_expirado)."""
    if not isinstance(connection_params, dict):
        return None, False

    valor = connection_params.get("Authorization") or connection_params.get("authorization")
    if not isinstance(valor, str) or not valor.startswith("Bearer "):
        return None, False

    payload = decodificar_token(valor.removeprefix("Bearer "))
    if payload is None:
        return None, True
    if payload.get("tipo") != "access":
        return None, False
    return payload, False