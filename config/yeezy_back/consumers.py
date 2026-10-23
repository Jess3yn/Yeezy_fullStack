from strawberry.channels import GraphQLWSConsumer
from strawberry.exceptions import ConnectionRejectionError

from yeezy_back.ws_auth import usuario_desde_connection_params


class BearerGraphQLWSConsumer(GraphQLWSConsumer):
    """WebSocket de GraphQL que exige un access token válido al conectar."""

    async def on_ws_connect(self, context):
        usuario, token_expirado = usuario_desde_connection_params(
            context.get("connection_params")
        )
        if usuario is None:
            raise ConnectionRejectionError(
                {"reason": "TOKEN_EXPIRADO" if token_expirado else "No autenticado"}
            )
        return await super().on_ws_connect(context)