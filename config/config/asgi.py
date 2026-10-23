"""
ASGI config for config project.

HTTP (queries y mutations) sigue yendo a Django, igual que antes.
WebSocket en /graphql/ va al consumer de Strawberry (subscriptions).
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

django_asgi_app = get_asgi_application()

# Importar DESPUÉS de get_asgi_application(): así django.setup() ya corrió
# antes de que el schema toque los modelos.
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.security.websocket import OriginValidator  # noqa: E402
from django.conf import settings  # noqa: E402
from django.urls import re_path  # noqa: E402

from yeezy_back.consumers import BearerGraphQLWSConsumer  # noqa: E402
from yeezy_back.schema import schema  # noqa: E402

# Los WebSockets no pasan por CORS, así que se valida el Origin a mano con la
# misma lista de orígenes permitidos (variable CORS_ALLOWED_ORIGINS).
websocket_app = OriginValidator(
    URLRouter([
        re_path(r"^graphql/?$", BearerGraphQLWSConsumer.as_asgi(schema=schema)),
    ]),
    settings.CORS_ALLOWED_ORIGINS,
)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": websocket_app,
})