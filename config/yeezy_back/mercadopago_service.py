import json
import os
import urllib.error
import urllib.request
import uuid
from decimal import Decimal, ROUND_HALF_UP

URL_ORDENES = "https://api.mercadopago.com/v1/orders"

MENSAJES = {
    "insufficient_amount": "La tarjeta no tiene fondos suficientes",
    "bad_filled_card_number": "El número de tarjeta es incorrecto",
    "bad_filled_date": "La fecha de vencimiento es incorrecta",
    "bad_filled_security_code": "El código de seguridad es incorrecto",
    "bad_filled_other": "Revisa los datos de la tarjeta",
    "call_for_authorize": "Debes autorizar el pago con tu banco",
    "card_disabled": "La tarjeta está deshabilitada",
    "other_reason": "El banco rechazó el pago",
}


def dos_decimales(monto):
    return str(Decimal(monto).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def buscar_pago(cuerpo):
    datos = cuerpo.get("data") or cuerpo
    pagos = (datos.get("transactions") or {}).get("payments") or []
    return pagos[0] if pagos else {}


def motivo_rechazo(cuerpo):
    detalle = str(buscar_pago(cuerpo).get("status_detail") or cuerpo.get("status_detail") or "")
    for clave, texto in MENSAJES.items():
        if clave in detalle:
            return texto
    errores = cuerpo.get("errors") or []
    if errores and errores[0].get("message"):
        return "Mercado Pago no aceptó el pago: " + errores[0]["message"]
    return "El banco rechazó el pago"


def crear_pago(monto, token, metodo_pago, emisor, cuotas, correo, descripcion, doc_tipo=None, doc_numero=None):
    access_token = os.getenv("MP_ACCESS_TOKEN")
    if not access_token:
        raise Exception("Falta MP_ACCESS_TOKEN en el archivo .env")

    total = dos_decimales(monto)
    tipo_tarjeta = "debit_card" if metodo_pago.startswith("deb") else "credit_card"

    pagador = {"email": correo}
    if doc_tipo and doc_numero:
        pagador["identification"] = {"type": doc_tipo, "number": doc_numero}

    cuerpo = {
        "type": "online",
        "total_amount": total,
        "external_reference": "yeezy-" + uuid.uuid4().hex[:12],
        "processing_mode": "automatic",
        "transactions": {
            "payments": [
                {
                    "amount": total,
                    "payment_method": {
                        "id": metodo_pago,
                        "type": tipo_tarjeta,
                        "token": token,
                        "installments": int(cuotas),
                    },
                }
            ]
        },
        "payer": pagador,
    }

    peticion = urllib.request.Request(
        URL_ORDENES,
        data=json.dumps(cuerpo).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": "Bearer " + access_token,
            "Content-Type": "application/json",
            "X-Idempotency-Key": str(uuid.uuid4()),
        },
    )

    try:
        with urllib.request.urlopen(peticion, timeout=30) as respuesta:
            orden = json.loads(respuesta.read())
    except urllib.error.HTTPError as error:
        try:
            cuerpo_error = json.loads(error.read())
        except ValueError:
            cuerpo_error = {}
        raise Exception(motivo_rechazo(cuerpo_error))
    except urllib.error.URLError:
        raise Exception("No se pudo conectar con Mercado Pago")

    pago = buscar_pago(orden)
    if orden.get("status") != "processed" or pago.get("status") not in (None, "processed"):
        raise Exception(motivo_rechazo(orden))

    return {"id": orden["id"], "status": orden["status"]}