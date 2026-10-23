"""Publicación de eventos en tiempo real para las subscriptions de GraphQL."""
import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

GRUPO_PRODUCTOS = "productos_nuevos"
TIPO_EVENTO_PRODUCTO = "producto.nuevo"


def publicar_producto_nuevo(producto: dict) -> None:
    """Avisa a todos los suscriptores de que se creó un producto.

    Se llama desde mutaciones síncronas, DESPUÉS de confirmar la transacción.
    Un fallo aquí nunca debe romper la mutación: el producto ya está guardado.
    """
    try:
        capa = get_channel_layer()
        if capa is None:
            return
        async_to_sync(capa.group_send)(
            GRUPO_PRODUCTOS,
            {"type": TIPO_EVENTO_PRODUCTO, "producto": producto},
        )
    except Exception:
        logger.exception("No se pudo publicar el evento %s", TIPO_EVENTO_PRODUCTO)