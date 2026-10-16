import { useEffect, useRef } from 'react';
import '../styles/pago-admin.css';

const llavePublica = import.meta.env.PUBLIC_MP_PUBLIC_KEY;
let carga = null;

function cargarSdk() {
  if (window.MercadoPago) return Promise.resolve();
  if (!carga) {
    carga = new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.onload = resolver;
      script.onerror = () => rechazar(new Error('No se pudo cargar Mercado Pago.'));
      document.body.appendChild(script);
    });
  }
  return carga;
}

export default function PagoMercadoPago({ total, procesando, onPagar, onError }) {
  const alPagar = useRef(onPagar);
  alPagar.current = onPagar;

  useEffect(() => {
    let cardForm = null;
    let cancelado = false;

    cargarSdk()
      .then(() => {
        if (cancelado) return;
        const mp = new window.MercadoPago(llavePublica, { locale: 'es-MX' });
        cardForm = mp.cardForm({
          amount: String(total),
          iframe: true,
          form: {
            id: 'form-checkout',
            cardNumber: { id: 'form-checkout__cardNumber', placeholder: 'Número de tarjeta' },
            expirationDate: { id: 'form-checkout__expirationDate', placeholder: 'MM/YY' },
            securityCode: { id: 'form-checkout__securityCode', placeholder: 'CVV' },
            cardholderName: { id: 'form-checkout__cardholderName', placeholder: 'Titular de la tarjeta' },
            issuer: { id: 'form-checkout__issuer', placeholder: 'Banco' },
            installments: { id: 'form-checkout__installments', placeholder: 'Cuotas' },
            identificationType: { id: 'form-checkout__identificationType', placeholder: 'Tipo de documento' },
            identificationNumber: { id: 'form-checkout__identificationNumber', placeholder: 'Número de documento' },
            cardholderEmail: { id: 'form-checkout__cardholderEmail', placeholder: 'Correo' },
          },
          callbacks: {
            onFormMounted: (error) => {
              if (error) onError('No se pudo iniciar el formulario de pago.');
            },
            onSubmit: (evento) => {
              evento.preventDefault();
              const datos = cardForm.getCardFormData();
              alPagar.current({
                token: datos.token,
                metodoPago: datos.paymentMethodId,
                emisor: datos.issuerId,
                cuotas: datos.installments,
                correo: datos.cardholderEmail,
                docTipo: datos.identificationType,
                docNumero: datos.identificationNumber,
              });
            },
          },
        });
      })
      .catch((error) => onError(error.message));

    return () => {
      cancelado = true;
      try {
        if (cardForm) cardForm.unmount();
      } catch {}
    };
  }, [total]);

  return (
    <form id="form-checkout" className="pago-form" key={total}>
      <div id="form-checkout__cardNumber" className="campo-mp"></div>
      <div className="pago-fila">
        <div id="form-checkout__expirationDate" className="campo-mp"></div>
        <div id="form-checkout__securityCode" className="campo-mp"></div>
      </div>
      <input type="text" id="form-checkout__cardholderName" />
      <select id="form-checkout__issuer"></select>
      <select id="form-checkout__installments"></select>
      <select id="form-checkout__identificationType"></select>
      <input type="text" id="form-checkout__identificationNumber" />
      <input type="email" id="form-checkout__cardholderEmail" />
      <button type="submit" className="cart-checkout" disabled={procesando}>
        {procesando ? 'PROCESANDO...' : 'PAGAR'}
      </button>
    </form>
  );
}
