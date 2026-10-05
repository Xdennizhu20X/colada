# 🥣 Sistema de Registro de Pedidos - Colada Morada & Pan

Aplicación web diseñada con enfoque **Mobile-First** y diseño minimalista para el registro y logística de pedidos de Colada Morada y Figuritas de Pan.

---

## 🚀 Probar Localmente

Servidor local activo:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👤 Acceso y Administración

- **Usuario Administrador**:
  - Usuario: `dennis` (o `admin`)
  - PIN inicial: `1234`
- **Gestión de Vendedores**:
  - Dennis tiene la pestaña **"Equipo"** en la barra superior.
  - Desde allí puedes crear los usuarios y contraseñas/PIN de cada vendedor (ej. María, Carlos, etc.) y eliminarlos cuando finalice la venta.
- **Login limpio**:
  - No hay atajos ni sugerencias en pantalla. Cada persona ingresa con sus credenciales asignadas.

---

## 📦 Reglas de Negocio

1. **Precios y Productos**:
   - **Medio Litro (1/2 L)**: `$2.00`
   - **Un Litro (1 L o más)**: `$3.00`
   - **Figuritas de Pan**: `$0.50` (50 ctvs)
2. **Cálculo en Vivo**:
   - Barra inferior fija que actualiza el total a cobrar y los litros al instante con los botones `+` y `-`.
3. **Logística**:
   - Selector entre **"Retiro en Local"** y **"A Domicilio"**.
   - A partir de **3 litros**, la app avisa que califica para entrega a domicilio.
   - Si se escoge a domicilio, se despliegan campos de dirección y referencia.
4. **Vendedor asignado**:
   - Cada pedido queda registrado con el nombre de quien lo ingresó.
5. **Dashboard de Resumen**:
   - Total en dinero ($), total litros a preparar, total panes a encargar y botón para copiar resumen a WhatsApp.
