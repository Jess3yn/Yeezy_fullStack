from decimal import Decimal
import strawberry, strawberry_django
from django.db import transaction, connection
from strawberry import auto
from strawberry_django.optimizer import DjangoOptimizerExtension
from . import models
from typing import Optional
from enum import Enum
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError
import asyncpg
from datetime import datetime, timedelta, timezone
from yeezy_back.jwt_servicce import generar_access_token, generar_refresh_token, decodificar_token



pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def requerir_usuario(info: strawberry.Info):
        usuario = info.context.get("usuario")
        if usuario is None:
            if info.context.get("token_expirado"):
                raise Exception("TOKEN_EXPIRADO")
            raise Exception("No autenticado")
        return usuario

def requerir_admin(info: strawberry.Info):
        usuario = requerir_usuario(info)
        if usuario["rol"] != "ADMIN":
            raise Exception("No autorizado")
        return usuario

class RolEnum(Enum):
    ADMIN = "ADMIN"
    CLIENTE = "CLIENTE"
  
Rol = strawberry.enum(RolEnum)

class GeneroEnum(Enum):
    FEMALE = 'FEMALE\n'
    MALE = 'MALE\n'
  
Genero = strawberry.enum(GeneroEnum)


#Usuario
@strawberry.type
class Usuario:
    id: int
    nombre: str
    email: str
    password: strawberry.Private[str]
    rol: Rol # type: ignore

@strawberry.input
class UsuarioInput:
    nombre: str
    email: str
    password: str

@strawberry.input
class LoginInput:
    email: str
    password: str

@strawberry.type
class AuthPayload:
    access_token: str
    refresh_token: str
    usuario: Usuario
    
@strawberry.type
class RefreshPayload:
    access_token: str
    refresh_token: str

#Categoria

@strawberry_django.type(models.Categoria)
class CategoriaType:
    id: auto
    nombre: auto

#Disco
@strawberry.type()
class DiscoType:
    id: strawberry.ID
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria_id: int
    artista: str
    duracion: int
    year: int

@strawberry.type()
class DiscoTypeQuery:
    id: strawberry.ID
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria: str
    artista: str
    duracion: int
    year: int

@strawberry.input
class DiscoInput:
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria_id: int
    artista: str
    duracion: int
    year: int

#Ropa
@strawberry.type()
class RopaType:
    id: strawberry.ID
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria_id: int
    talla: str
    genero: Genero # type: ignore

@strawberry.type()
class RopaTypeQuery:
    id: strawberry.ID
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria: str
    talla: str
    genero: Genero # type: ignore

@strawberry.input
class RopaInput:
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria_id: int
    talla: str
    genero: Genero # type: ignore

@strawberry_django.type(models.Producto)
class ProductoType:
    id: auto
    tipo: auto
    nombre: auto
    imagen: auto
    stock: auto
    precio: auto
    categoria_id: auto
    disco: DiscoType | None
    ropa: RopaType | None

@strawberry_django.type(models.Pedido)
class PedidoType:
    id: auto
    cantidad: auto
    precio_total: auto
    created_at: auto
    producto: ProductoType | None



@strawberry.input
class ItemInput:
    producto_id: strawberry.ID
    cantidad: int

# @strawberry.input
# class ProductoInput:
#     nombre: str
#     precio: Decimal
#     stock: int = 0
#     tipo: str 
#     imagen: str | None = None
#     categoria_id: strawberry.ID

@strawberry.type
class Query:
    productos: list[ProductoType] = strawberry_django.field() 
    categorias: list[CategoriaType] = strawberry_django.field()   
    
    #usuarios: list[Usuario] = strawberry_django.field()             

    @strawberry.field
    def producto(self, id: strawberry.ID) -> ProductoType | None:
        return models.Producto.objects.filter(pk=id).first() # type: ignore

    @strawberry.field
    def discos(self, info: strawberry.Info) -> list[DiscoTypeQuery] | None:
        requerir_usuario(info)
        conn = connection.cursor()
        conn.execute("""
            SELECT p.id, p.nombre, p.stock, c.nombre AS categoria, p.imagen, p.precio,
                   d.artista, d.duracion, d.year
            FROM productos p
            JOIN discos d ON d.producto_id = p.id
            LEFT JOIN categorias c ON c.id = p.categoria_id
            ORDER BY p.nombre 
        """)
        cols = [c[0] for c in conn.description]
        return [DiscoTypeQuery(**r) for r in [dict(zip(cols, row)) for row in conn.fetchall()]]
    
    @strawberry.field
    def ropa(self, info: strawberry.Info) -> list[RopaTypeQuery] | None:
        requerir_usuario(info)
        conn = connection.cursor()
        conn.execute("""
            SELECT p.id, p.nombre, p.stock, c.nombre AS categoria, p.imagen, p.precio,
                   r.genero, r.talla
            FROM productos p
            JOIN ropa r ON r.producto_id = p.id
            LEFT JOIN categorias c ON c.id = p.categoria_id
            ORDER BY p.nombre
        """)
        cols = [c[0] for c in conn.description]
        return [RopaTypeQuery(**r) for r in [dict(zip(cols, row)) for row in conn.fetchall()]]
        
    @strawberry_django.field()
    def mis_pedidos(self) -> list[PedidoType]:
        return models.Pedido.objects.order_by("-created_at") # type: ignore

@strawberry.type
class Mutation:

    @strawberry.mutation
    def crear_disco(self,info: strawberry.Info,input: DiscoInput) -> DiscoType | None:
        requerir_admin(info)
        with transaction.atomic():
            conn = connection.cursor()
            nombre = input.nombre
            precio = input.precio
            categoria_id = input.categoria_id
            stock = input.stock
            imagen = input.imagen
            artista = input.artista
            duracion = input.duracion
            year = input.year
            conn.execute("""
                WITH nuevo AS (
                  INSERT INTO productos (tipo, nombre, precio, categoria_id, stock, imagen)
                  VALUES ('disco', %s, %s, %s, %s, %s)
                  RETURNING id
                )
                INSERT INTO discos (producto_id, artista, duracion, year)
                SELECT id, %s, %s::bigint, %s::bigint FROM nuevo
                RETURNING producto_id
            """, [nombre, precio, categoria_id, stock, imagen , artista, duracion, year])
            disco_id = conn.fetchone()[0]
            
            return DiscoType(id=disco_id, nombre=nombre, imagen=imagen,stock=stock, precio=precio, categoria_id=categoria_id, artista=artista, duracion=duracion, year=year)
    
    @strawberry.mutation
    def crear_ropa(self,info:strawberry.Info,input: RopaInput) -> RopaType | None:
        requerir_admin(info)
        with transaction.atomic():
            conn = connection.cursor()
            nombre = input.nombre
            precio = input.precio
            categoria_id = input.categoria_id
            stock = input.stock
            imagen = input.imagen
            talla = input.talla
            genero = input.genero
            conn.execute("""
            WITH nuevo AS (
              INSERT INTO productos (tipo, nombre, stock, precio, categoria_id, imaagen)
              VALUES ('ropa', %s, %s, %s, %s.%s)
              RETURNING id
            )
            INSERT INTO ropa (producto_id, talla, genero)
            SELECT id, %s, %s FROM nuevo
            RETURNING producto_id
        """, [nombre, stock, precio, categoria_id, imagen, talla, genero])
            ropa_id = conn.fetchone()[0]
            return RopaType(id= ropa_id, nombre=nombre, stock=stock, precio=precio, categoria_id=categoria_id, imagen=imagen, talla=talla, genero=genero)
        
    @strawberry.mutation
    def login(self, input: LoginInput) -> AuthPayload:
        with transaction.atomic():
            conn = connection.cursor()
            conn.execute("""
                SELECT * FROM usuarios WHERE email = %s
            """, [input.email])
            usuario = conn.fetchone()
            cols = [c[0] for c in conn.description]
            if usuario is None or not pwd_context.verify(input.password, usuario[2]):
                raise Exception("Invalid Credentials")
            access_token = generar_access_token({"usuario_id" : usuario[0], "email": usuario[1],"rol": usuario[3]})
            refresh_token, jti = generar_refresh_token({"usuario_id" : usuario[0], " email": usuario[1], "rol": usuario[3]})
            expires = datetime.now(timezone.utc) + timedelta(days=7)
            conn.execute(
                """
                INSERT INTO refresh_tokens (usuario_id, jti, expires_at) VALUES  (%s,%s,%s)
                """
            , [usuario[0], jti, expires])
            return AuthPayload(access_token=access_token, refresh_token=refresh_token, usuario=Usuario(**{**dict(zip(cols, usuario)), "rol": RolEnum(usuario[3])}))
    @strawberry.mutation
    def crear_usuario(self, input:UsuarioInput) -> Optional[Usuario]:
        try:
            email_info = validate_email(input.email, check_deliverability=True)
            normalized_email = email_info.normalized
        except EmailNotValidError as e:
            raise Exception(f"Correo invalido: {e}")
        password = pwd_context.hash(input.password)
        
        with connection.cursor() as conn:
            try:
                conn.execute("""
                    INSERT INTO usuarios (nombre, email, password, rol) VALUES (%s, %s, %s, %s) RETURNING *
                """, [input.nombre, normalized_email, password, "CLIENTE"])
                usuario = conn.fetchone()
                cols = [c[0] for c in conn.description]
            except asyncpg.UniqueViolationError:
                raise Exception("Este correo ya se encuentra registrado")
            return Usuario(**{**dict(zip(cols, usuario)), "rol": RolEnum(usuario[3])}) if usuario else None
    @strawberry.mutation
    def refrescar_token(self, refresh_token:str) -> RefreshPayload:
        payload = decodificar_token(refresh_token)
        if payload is None or payload.get("tipo") != "refresh":
            raise Exception("Refresh Token Invalido")
        jti = payload["jti"]
        usuario_id = payload["usuario_id"]
        with connection.cursor() as conn:
            conn.execute("""
                SELECT * FROM refresh_tokens WHERE jti = %s
            """, [jti])
            refresh = conn.fetchone()
            if refresh is None:
                raise Exception("Refresh Token Invalido")
            if refresh[3]:
                conn.execute("""
                    UPDATE refresh_tokens SET usado = TRUE WHERE usuario_id =  %s
                """, [usuario_id])
                raise Exception("Refresh Token ya utilizado - Session Terminated")
            conn.execute("""
                    UPDATE refresh_tokens SET usado = TRUE WHERE jti =  %s
            """, [jti])
            conn.execute("""
                 SELECT * FROM usuarios WHERE id = %s
            """, [usuario_id])
            usuario = conn.fetchone()
            nuevo_access = generar_access_token({
                "usuario_id" : usuario[0],
                "email": usuario[1],
                "rol": usuario[3],
            })
            nuevo_refresh, nuevo_jti = generar_refresh_token({
                "usuario_id" : usuario[0],
                "email": usuario[1],
                "rol": usuario[3],
             })
            expires = datetime.now(timezone.utc) + timedelta(days=7)
            conn.execute(
            """
            INSERT INTO refresh_tokens (usuario_id, jti, expires_at) VALUES  (%s,%s,%s)             
            """ , [usuario_id, nuevo_jti, expires])
        return RefreshPayload(access_token=nuevo_access, refresh_token=nuevo_refresh)

    @strawberry.mutation
    def logout(self, refresh_token: str) -> bool:
        payload = decodificar_token(refresh_token)
        if payload is None or payload.get("tipo") != "refresh":
            raise Exception("Refresh Token Inválido")
        
        jti = payload["jti"]
        with connection.cursor() as conn:
            conn.exe("""
            SELECT * FROM refresh_tokens WHERE jti = %s
            """,  [jti])
            refresh = conn.fetchone()
            if refresh is None:
                raise Exception("Refresh Token Inválido")
            conn.execute("UPDATE refresh_tokens SET usado = TRUE WHERE jti = %s", jti)
        return True
    
    # @strawberry.mutation()
    # def crear_producto(self, input: ProductoInput) -> ProductoType:
    #     categoria = models.Categoria.objects.get(pk=input.categoria_id)
    #     return models.Producto.objects.create(
    #         categoria_id=categoria,
    #         nombre=input.nombre,
    #         precio=input.precio,
    #         tipo=input.tipo,
    #         stock=input.stock,
    #         imagen=input.imagen,
    #     ) # type: ignore

    # @strawberry.mutation()
    # def crear_pedido(self, items: list[ItemInput]) -> list[PedidoType]:
    #     if not items or any(i.cantidad < 1 for i in items):
    #         raise ValueError("Pedido inválido")
    #     with transaction.atomic():                      
    #         for it in sorted(items, key=lambda i: int(i.producto_id)):   
    #             p = models.Producto.objects.select_for_update().filter(pk=it.producto_id).first()
    #             if not p or p.precio is None or (p.stock or 0) < it.cantidad:
    #                 raise ValueError("Producto no disponible o sin stock")
    #             p.stock -= it.cantidad
    #             p.save(update_fields=["stock"])
    #             creado = (models.Pedido.objects.create(      
    #                 usuario=user, producto=p, cantidad=it.cantidad, precio_total=p.precio * it.cantidad))
    #     return creado # type: ignore

schema = strawberry.Schema(query=Query, mutation=Mutation, extensions=[DjangoOptimizerExtension])