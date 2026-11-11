import json
import logging
import os
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .jwt_servicce import decodificar_token


logger = logging.getLogger(__name__)
MAX_IMAGE_SIZE = 10 * 1024 * 1024
IMAGE_FORMATS = {
    "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/gif": (".gif", lambda data: data.startswith((b"GIF87a", b"GIF89a"))),
    "image/webp": (
        ".webp",
        lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
    ),
}


class SupabaseStorageError(Exception):
    pass


def _storage_config():
    supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if not supabase_url or not service_key:
        raise SupabaseStorageError(
            "El almacenamiento de imágenes no está configurado en el servidor."
        )
    return supabase_url, service_key


def _storage_request(url, service_key, method, body=None, content_type=None):
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
    }
    if content_type:
        headers["Content-Type"] = content_type

    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            return response.read()
    except HTTPError as error:
        logger.warning("Supabase Storage returned HTTP %s.", error.code)
        raise SupabaseStorageError("Supabase rechazó la solicitud de imágenes.") from error
    except URLError as error:
        logger.exception("Could not reach Supabase Storage.")
        raise SupabaseStorageError("No se pudo conectar con Supabase Storage.") from error


def _authorize_admin(request):
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None, JsonResponse({"error": "Inicia sesión como administrador."}, status=401)

    payload = decodificar_token(authorization.removeprefix("Bearer "))
    if payload is None or payload.get("tipo") != "access":
        return None, JsonResponse({"error": "La sesión expiró. Inicia sesión de nuevo."}, status=401)
    if payload.get("rol") != "ADMIN":
        return None, JsonResponse({"error": "Esta acción es solo para administradores."}, status=403)
    return payload, None


def _public_image_url(supabase_url, name):
    return (
        f"{supabase_url}/storage/v1/object/public/product_images/"
        f"products/{quote(name, safe='')}"
    )


@csrf_exempt
def admin_product_images(request):
    _, auth_error = _authorize_admin(request)
    if auth_error:
        return auth_error
    if request.method not in ("GET", "POST"):
        return JsonResponse({"error": "Método no permitido."}, status=405)

    try:
        supabase_url, service_key = _storage_config()
        if request.method == "GET":
            body = json.dumps({
                "prefix": "products/",
                "limit": 1000,
                "offset": 0,
                "sortBy": {"column": "name", "order": "asc"},
            }).encode()
            response_body = _storage_request(
                f"{supabase_url}/storage/v1/object/list/product_images",
                service_key,
                "POST",
                body,
                "application/json",
            )
            entries = json.loads(response_body)
            images = [
                {
                    "name": item["name"],
                    "url": _public_image_url(supabase_url, item["name"]),
                }
                for item in entries
                if isinstance(item, dict)
                and isinstance(item.get("name"), str)
                and item["name"].lower().endswith((".jpg", ".jpeg", ".png", ".gif", ".webp"))
            ]
            return JsonResponse({"images": images})

        image = request.FILES.get("file")
        if image is None:
            return JsonResponse({"error": "Selecciona un archivo de imagen."}, status=400)
        if image.size > MAX_IMAGE_SIZE:
            return JsonResponse({"error": "La imagen no puede superar los 10 MB."}, status=400)

        content = image.read(MAX_IMAGE_SIZE + 1)
        image_format = next(
            (
                (mime_type, extension)
                for mime_type, (extension, matches) in IMAGE_FORMATS.items()
                if matches(content)
            ),
            None,
        )
        if image_format is None:
            return JsonResponse(
                {"error": "Usa una imagen JPEG, PNG, GIF o WebP válida."},
                status=400,
            )

        content_type, extension = image_format
        name = f"{uuid.uuid4().hex}{extension}"
        _storage_request(
            f"{supabase_url}/storage/v1/object/product_images/products/{name}",
            service_key,
            "POST",
            content,
            content_type,
        )
        return JsonResponse({
            "name": name,
            "url": _public_image_url(supabase_url, name),
        }, status=201)
    except SupabaseStorageError as error:
        return JsonResponse({"error": str(error)}, status=503)
    except (json.JSONDecodeError, TypeError, KeyError):
        logger.exception("Supabase Storage returned an invalid image listing.")
        return JsonResponse(
            {"error": "Supabase devolvió una lista de imágenes no válida."},
            status=502,
        )
