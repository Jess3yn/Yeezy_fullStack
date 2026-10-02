from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models


class Usuario(AbstractBaseUser):   
    email = models.EmailField(unique=True)
    password = models.TextField()
    admin = models.BooleanField(default=False)
    rol= models.TextField(default="CLIENTE")
    class Meta: db_table = "usuarios"; managed = False

class Categoria(models.Model):
    id = models.IntegerField(primary_key=True)
    nombre = models.TextField()
    class Meta: db_table = "categorias"; managed = False


class Producto(models.Model):
    id = models.IntegerField(primary_key=True)
    tipo = models.TextField()# "disco" o "ropa"
    categoria_id = models.ForeignKey(Categoria, null=True, on_delete=models.SET_NULL)
    nombre = models.CharField(max_length=255)
    imagen = models.TextField(null=True, blank=True)
    stock = models.BigIntegerField(default=1)
    precio = models.DecimalField()
    class Meta: db_table = "productos"; managed = False


class Disco(models.Model):
    producto_id = models.OneToOneField(Producto, primary_key=True, on_delete=models.CASCADE)
    artista = models.TextField()
    duracion = models.BigIntegerField()
    year = models.BigIntegerField(null=True)
    class Meta: db_table = "discos"; managed = False

class Ropa(models.Model):
    producto_id = models.OneToOneField(Producto, primary_key=True, on_delete=models.CASCADE)
    talla = models.TextField()
    genero = models.TextField(default="MALE")
    class Meta: db_table = "ropa"; managed = False

class Pedido(models.Model):
    usuario = models.ForeignKey(Usuario, null=True, on_delete=models.SET_NULL, db_column="id_usuario")
    producto = models.ForeignKey(Producto, null=True, on_delete=models.SET_NULL, db_column="id_producto")
    cantidad = models.BigIntegerField(default=1)
    precio_total = models.DecimalField(db_column="precioTotal")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta: db_table = "pedidos"; managed = False
