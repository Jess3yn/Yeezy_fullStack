"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpRequest, HttpResponse
from typing import Any
from strawberry.django.views import GraphQLView
from yeezy_back.schema import schema
from yeezy_back.jwt_servicce import decodificar_token

class BearerGraphQLView(GraphQLView[dict[str, Any], None]):
    def get_context(
        self, request: HttpRequest, response: HttpResponse
    ) -> dict[str, Any]:
        usuario = None
        token_expirado = False

        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ")
            payload = decodificar_token(token)
            if payload is None:
                token_expirado = True
            elif payload.get("tipo") == "access":
                usuario = payload

        return {
            "request": request,
            "response": response,
            "usuario": usuario,
            "token_expirado": token_expirado,
        }

urlpatterns = [
    path("admin/", admin.site.urls),
    #path("accounts/login/", auth_views.LoginView.as_view()),
    #path("accounts/logout/", auth_views.LogoutView.as_view()),
    path("graphql/", csrf_exempt(BearerGraphQLView.as_view(schema=schema, graphql_ide="graphiql"))),
]