from decimal import Decimal
import strawberry, strawberry_django
from django.db import IntegrityError, transaction, connection
from strawberry import auto
from strawberry_django.optimizer import DjangoOptimizerExtension
from . import models
from typing import Optional, cast
from enum import Enum
from passlib.context import CryptContext
from email_validator import validate_email, EmailNotValidError
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
class CategoriaInput:
    nombre: str

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
    duracion: int | None
    year: int | None

@strawberry.type()
class DiscoTypeQuery:
    id: strawberry.ID
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria: str
    artista: str
    duracion: int | None
    year: int | None

@strawberry.input
class DiscoInput:
    nombre: str
    imagen: str | None
    stock: int
    precio: Decimal
    categoria_id: int
    artista: str
    duracion: int | None = None
    year: int | None = None

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


@strawberry.type
class PedidoHistorialType:
    id: strawberry.ID
    producto_id: strawberry.ID
    producto_nombre: str
    imagen: str | None
    cantidad: int
    precio_total: Decimal
    created_at: datetime

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
        
    @strawberry.field
    def mis_pedidos(self, info: strawberry.Info) -> list[PedidoHistorialType]:
        usuario = requerir_usuario(info)
        try:
            usuario_id = int(usuario["usuario_id"])
        except (KeyError, TypeError, ValueError) as error:
            raise Exception("Usuario inválido") from error

        with connection.cursor() as conn:
            conn.execute(
                """
                SELECT pe.id, pe.id_producto AS producto_id,
                       p.nombre AS producto_nombre,
                       p.imagen, pe.cantidad, pe."precioTotal" AS precio_total,
                       pe.created_at
                FROM pedidos pe
                JOIN productos p ON p.id = pe.id_producto
                WHERE pe.id_usuario = %s
                ORDER BY pe.created_at DESC, pe.id DESC
                """,
                [usuario_id],
            )
            columnas = [column[0] for column in conn.description]
            return [
                PedidoHistorialType(**dict(zip(columnas, row)))
                for row in conn.fetchall()
            ]

@strawberry.type
class Mutation:

    @strawberry.mutation
    def crear_categoria(
        self, info: strawberry.Info, input: CategoriaInput
    ) -> CategoriaType:
        requerir_admin(info)
        nombre = input.nombre.strip()
        with transaction.atomic():
            with connection.cursor() as conn:
                conn.execute("SELECT pg_advisory_xact_lock(74839201)")
                conn.execute(
                    """
                    SELECT id, nombre FROM categorias WHERE LOWER(BTRIM(nombre)) = LOWER(%s)
                    ORDER BY id
                    LIMIT 1
                    """,
                    [nombre],
                )
                categoria = conn.fetchone()
                if categoria is not None:
                    return CategoriaType(id=categoria[0], nombre=categoria[1])

                conn.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM categorias")
                categoria_id = conn.fetchone()[0]
                conn.execute(
                    """
                    INSERT INTO categorias (id, nombre)
                    VALUES (%s, %s)
                    RETURNING id, nombre
                    """,
                    [categoria_id, nombre],
                )
                categoria = conn.fetchone()
        return CategoriaType(id=categoria[0], nombre=categoria[1])

    @strawberry.mutation
    def crear_disco(
        self, info: strawberry.Info, input: DiscoInput
    ) -> DiscoType:
        requerir_admin(info)
        nombre = input.nombre.strip()
        artista = input.artista.strip()
        if not nombre:
            raise Exception("El nombre del disco es obligatorio")
        if not artista:
            raise Exception("El artista es obligatorio")
        if input.stock < 0:
            raise Exception("El stock no puede ser negativo")
        if input.precio < 0:
            raise Exception("El precio no puede ser negativo")

        with transaction.atomic():
            with connection.cursor() as conn:
                conn.execute("SELECT pg_advisory_xact_lock(74839202)")
                conn.execute(
                    """
                    SELECT id, tipo, precio, categoria_id, imagen, stock
                    FROM productos
                    WHERE LOWER(BTRIM(nombre)) = LOWER(%s)
                    LIMIT 1
                    """,
                    [nombre],
                )
                existente = conn.fetchone()
                if existente is not None:
                    if existente[1] != "disco":
                        raise Exception("Ya existe otro tipo de producto con ese nombre")
                    conn.execute(
                        """
                        SELECT artista, duracion, year
                        FROM discos
                        WHERE producto_id = %s
                        """,
                        [existente[0]],
                    )
                    detalles = conn.fetchone()
                    if detalles is None:
                        raise Exception("El disco existente no tiene sus datos asociados")
                    return DiscoType(
                        id=existente[0],
                        nombre=nombre,
                        imagen=existente[4],
                        stock=existente[5],
                        precio=existente[2],
                        categoria_id=existente[3],
                        artista=detalles[0],
                        duracion=detalles[1],
                        year=detalles[2],
                    )

                conn.execute(
                    "SELECT 1 FROM categorias WHERE id = %s",
                    [input.categoria_id],
                )
                if conn.fetchone() is None:
                    raise Exception("La categoría indicada no existe")

                conn.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM productos")
                disco_id = conn.fetchone()[0]
                conn.execute(
                    """
                    INSERT INTO productos
                        (id, tipo, nombre, precio, categoria_id, stock, imagen)
                    VALUES (%s, 'disco', %s, %s, %s, %s, %s)
                    """,
                    [
                        disco_id,
                        nombre,
                        input.precio,
                        input.categoria_id,
                        input.stock,
                        input.imagen,
                    ],
                )
                conn.execute(
                    """
                    INSERT INTO discos (producto_id, artista, duracion, year)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [disco_id, artista, input.duracion, input.year],
                )

        return DiscoType(
            id=disco_id,
            nombre=nombre,
            imagen=input.imagen,
            stock=input.stock,
            precio=input.precio,
            categoria_id=input.categoria_id,
            artista=artista,
            duracion=input.duracion,
            year=input.year,
        )
    
    @strawberry.mutation
    def crear_ropa(
        self, info: strawberry.Info, input: RopaInput
    ) -> RopaType:
        requerir_admin(info)
        nombre = input.nombre.strip()
        if not nombre:
            raise Exception("El nombre del producto es obligatorio")
        if input.stock < 0:
            raise Exception("El stock no puede ser negativo")
        if input.precio < 0:
            raise Exception("El precio no puede ser negativo")

        with transaction.atomic():
            with connection.cursor() as conn:
                conn.execute("SELECT pg_advisory_xact_lock(74839202)")
                conn.execute(
                    "SELECT 1 FROM categorias WHERE id = %s",
                    [input.categoria_id],
                )
                if conn.fetchone() is None:
                    raise Exception("La categoría indicada no existe")

                conn.execute("SELECT COALESCE(MAX(id), 0) + 1 FROM productos")
                producto_id = conn.fetchone()[0]
                conn.execute(
                    """
                    INSERT INTO productos
                        (id, tipo, nombre, stock, precio, categoria_id, imagen)
                    VALUES (%s, 'ropa', %s, %s, %s, %s, %s)
                    """,
                    [
                        producto_id,
                        nombre,
                        input.stock,
                        input.precio,
                        input.categoria_id,
                        input.imagen,
                    ],
                )
                conn.execute(
                    """
                    INSERT INTO ropa (producto_id, talla, genero)
                    VALUES (%s, %s, %s)
                    """,
                    [producto_id, input.talla, input.genero.value],
                )

        return RopaType(
            id=producto_id,
            nombre=nombre,
            imagen=input.imagen,
            stock=input.stock,
            precio=input.precio,
            categoria_id=input.categoria_id,
            talla=input.talla,
            genero=input.genero,
        )
    
    @strawberry.mutation
    def crear_pedido(
        self, info: strawberry.Info, datos: list[ItemInput]
    ) -> list[PedidoType]:
        usuario = requerir_usuario(info)
        try:
            usuario_id = int(usuario["usuario_id"])
        except (KeyError, TypeError, ValueError) as error:
            raise Exception("Usuario inválido") from error
        if usuario_id <= 0:
            raise Exception("Usuario inválido")
        if not datos:
            raise Exception("El pedido debe incluir al menos un producto")

        cantidades: dict[int, int] = {}
        for item in datos:
            try:
                producto_id = int(item.producto_id)
            except (TypeError, ValueError) as error:
                raise Exception("El ID del producto no es válido") from error
            if producto_id <= 0:
                raise Exception("El ID del producto no es válido")
            if item.cantidad <= 0:
                raise Exception("La cantidad debe ser mayor que cero")
            cantidades[producto_id] = cantidades.get(producto_id, 0) + item.cantidad

        pedidos: list[PedidoType] = []
        with transaction.atomic():
            with connection.cursor() as conn:
                producto_ids = sorted(cantidades)
                placeholders = ", ".join(["%s"] * len(producto_ids))
                conn.execute(
                    f"""
                    SELECT id, precio, stock
                    FROM productos
                    WHERE id IN ({placeholders})
                    ORDER BY id
                    FOR UPDATE
                    """,
                    producto_ids,
                )
                productos = {
                    row[0]: {"precio": row[1], "stock": row[2]}
                    for row in conn.fetchall()
                }
                faltantes = set(producto_ids) - productos.keys()
                if faltantes:
                    raise Exception(
                        f"Producto(s) no encontrado(s): {', '.join(map(str, sorted(faltantes)))}"
                    )

                for producto_id in producto_ids:
                    cantidad = cantidades[producto_id]
                    producto = productos[producto_id]
                    if producto["precio"] is None or producto["stock"] is None:
                        raise Exception("Producto no disponible")
                    if producto["stock"] < cantidad:
                        raise Exception(
                            f"Stock insuficiente para el producto {producto_id}"
                        )

                    conn.execute(
                        "UPDATE productos SET stock = stock - %s WHERE id = %s",
                        [cantidad, producto_id],
                    )
                    precio_total = producto["precio"] * cantidad
                    creado_en = datetime.now(timezone.utc)
                    conn.execute(
                        """
                        INSERT INTO pedidos
                            (id_usuario, id_producto, cantidad, "precioTotal", created_at)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING id
                        """,
                        [usuario_id,producto_id,cantidad,precio_total,creado_en,
                        ],
                    )
                    pedido_id = conn.fetchone()[0]
                    pedidos.append(
                        cast(
                            PedidoType,
                            models.Pedido(
                                id=pedido_id,
                                usuario_id=usuario_id,
                                producto_id=producto_id,
                                cantidad=cantidad,
                                precio_total=precio_total,
                                created_at=creado_en,
                            ),
                        )
                    )

        return pedidos
    
    @strawberry.mutation
    def login(self, input: LoginInput) -> AuthPayload:
        with transaction.atomic():
            conn = connection.cursor()
            conn.execute("""
                SELECT id, email, password, rol, nombre
                FROM usuarios
                WHERE LOWER(email) = LOWER(%s)
                LIMIT 1
            """, [input.email.strip()])
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
        nombre = input.nombre.strip()
        if not nombre:
            raise Exception("El nombre es obligatorio")
        if len(input.password) < 8:
            raise Exception("La contraseña debe tener al menos 8 caracteres")

        try:
            email_info = validate_email(input.email.strip(), check_deliverability=False)
            normalized_email = email_info.normalized.casefold()
        except EmailNotValidError as e:
            raise Exception(f"Correo invalido: {e}")
        password = pwd_context.hash(input.password)
        
        try:
            with connection.cursor() as conn:
                conn.execute("""
                    INSERT INTO usuarios (nombre, email, password, rol)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, email, password, rol, nombre
                """, [nombre, normalized_email, password, "CLIENTE"])
                usuario = conn.fetchone()
                cols = [c[0] for c in conn.description]
        except IntegrityError as e:
            raise Exception("Este correo ya se encuentra registrado") from e
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