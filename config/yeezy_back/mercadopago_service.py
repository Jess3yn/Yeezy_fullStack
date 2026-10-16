import json
import os
import urllib.error
import urllib.request
import uuid

URL_PAGOS = "https://api.mercadopago.com/v1/payments"

MENSAJES = {
    "cc_rejected_insufficient_amount": "La tarjeta no tiene fondos suficientes",
    "cc_rejected_bad_filled_card_number": "El número de tarjeta es incorrecto",
    "cc_rejected_bad_filled_date": "La fecha de vencimiento es incorrecta",
    "cc_rejected_bad_filled_security_code": "El código de seguridad es incorrecto",
    "cc_rejected_bad_filled_other": "Revisa los datos de la tarjeta",
    "cc_rejected_call_for_authorize": "Debes autorizar el pago con tu banco",
    "cc_rejected_card_disabled": "La tarjeta está deshabilitada",
    "cc_rejected_other_reason": "El banco rechazó el pago",
}


def crear_pago(monto, token, metodo_pago, emisor, cuotas, correo, descripcion, doc_tipo=None, doc_numero=None):
    access_token = os.getenv("MP_ACCESS_TOKEN")
    if not access_token:
        raise Exception("Falta MP_ACCESS_TOKEN en el archivo .env")

    pagador = {"email": correo}
    if doc_tipo and doc_numero:
        pagador["identification"] = {"type": doc_tipo, "number": doc_numero}

    cuerpo = {
        "transaction_amount": float(monto),
        "token": token,
        "description": descripcion,
        "installments": cuotas,
        "payment_method_id": metodo_pago,
        "payer": pagador,
    }
    if emisor:
        cuerpo["issuer_id"] = int(emisor)

    peticion = urllib.request.Request(
        URL_PAGOS,
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
            pago = json.loads(respuesta.read())
    except urllib.error.HTTPError as error:
        try:
            detalle = json.loads(error.read()).get("message", "")
        except ValueError:
            detalle = ""
        raise Exception("Mercado Pago no aceptó el pago: " + (detalle or str(error.code)))
    except urllib.error.URLError:
        raise Exception("No se pudo conectar con Mercado Pago")

    if pago.get("status") != "approved":
        motivo = MENSAJES.get(pago.get("status_detail"), "El pago no fue aprobado")
        raise Exception(motivo)

    return pago
