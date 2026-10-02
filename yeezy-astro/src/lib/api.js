const productos = [
  { id: 1, nombre: 'TS-03', imagen: '/img/ts-03.png', precio: 90, seccion: 'top', stock: 10 },
  { id: 2, nombre: 'LS-03', imagen: '/img/ls-03.png', precio: 120, seccion: 'top', stock: 10 },
  { id: 3, nombre: 'HD-03', imagen: '/img/hd-03.png', precio: 180, seccion: 'top', stock: 10 },
  { id: 4, nombre: 'WB-01', imagen: '/img/wb-01.png', precio: 220, seccion: 'top', stock: 10 },
  { id: 9, nombre: 'TT-06', imagen: '/img/tt-06.png', precio: 70, seccion: 'top', stock: 10 },
  { id: 5, nombre: 'SH-01', imagen: '/img/sh-01.png', precio: 95, seccion: 'bottom', stock: 10 },
  { id: 6, nombre: 'SP-06', imagen: '/img/sp-06.png', precio: 150, seccion: 'bottom', stock: 10 },
  { id: 7, nombre: 'PT-04', imagen: '/img/pt-04.png', precio: 160, seccion: 'bottom', stock: 10 },
  { id: 8, nombre: 'PT-05', imagen: '/img/pt-05.png', precio: 160, seccion: 'bottom', stock: 10 },
  { id: 10, nombre: 'BX-01', imagen: '/img/bx-01.png', precio: 45, seccion: 'under', stock: 10 },
  { id: 11, nombre: 'SK-01', imagen: '/img/sk-01.png', precio: 30, seccion: 'under', stock: 10 },
  { id: 12, nombre: 'AB-01', imagen: '/img/ab-01.png', precio: 260, seccion: 'calzado', destacado: true, stock: 10 },
  { id: 19, nombre: '800S', imagen: '/img/800s.png', precio: 240, seccion: 'calzado', destacado: true, stock: 10 },
  { id: 20, nombre: 'YS-01', imagen: '/img/ys-01.png', precio: 220, seccion: 'calzado', stock: 10 },
  { id: 21, nombre: 'YS-02', imagen: '/img/ys-02.png', precio: 220, seccion: 'calzado', stock: 10 },
  { id: 22, nombre: 'BP-01', imagen: '/img/bp-01.png', precio: 80, seccion: 'accesorio', stock: 10 },
  { id: 23, nombre: 'BP-02', imagen: '/img/bp-02.png', precio: 130, seccion: 'accesorio', stock: 10 },
  { id: 24, nombre: 'SG-03', imagen: '/img/sg-03.png', precio: 160, seccion: 'accesorio', stock: 10 },
];

export async function getProductos() {
  return productos;
}

const discos = [
  { id: 101, nombre: 'BULLY LP SIGNED', imagen: '', precio: 60, stock: 10 },
  { id: 102, nombre: 'CLEAR LP SIGNED', imagen: '', precio: 60, stock: 10 },
  { id: 103, nombre: 'BULLY CD', imagen: '', precio: 25, stock: 10 },
  { id: 104, nombre: 'BULLY CASSETTE', imagen: '', precio: 20, stock: 10 },
  { id: 105, nombre: 'DIGITAL ALBUM', imagen: '', precio: 10, stock: 10 },
];

export async function getDiscos() {
  return discos;
}