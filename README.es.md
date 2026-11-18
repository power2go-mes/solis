# SolisCloud Internal API Scraper

Un servicio ligero en Node.js que obtiene datos en tiempo real del inversor solar y la bateria desde [SolisCloud](https://www.soliscloud.com), llamando directamente a la misma API interna que usa el frontend web. Sin automatizacion de navegador, sin necesidad de activar la API oficial.

**[Read in English](README.md)**

> **Nota del autor**: en mi caso, despues de varios meses "peleando" con el soporte de Solis, al final pude conseguir el API en mi cuenta. Consegui descargar todo el historico a Home Assistant y segui las indicaciones del repo [hn/ginlong-solis](https://github.com/hn/ginlong-solis) para quedarme con control local total y prescindir del cloud del fabricante.

> ## ¿Por qué este scraper en lugar de la API oficial?
>
> Incluso si Solis te ha activado la API oficial en tu cuenta (como acabaron haciendo en la mía), este scraper sigue siendo la mejor opción:
>
> - **Sin límites de peticiones**: la API oficial tiene cuotas estrictas por día/segundo. Este scraper usa los mismos endpoints internos que el portal web, sin cuotas artificiales — consultar cada pocos minutos no es problema.
> - **Datos más ricos**: endpoints como `/api/inverter/detail` exponen toda la telemetría (BMS completa, PV por string, importación/exportación de red con dirección) que la API oficial no ofrece o limita mucho.
> - **Sin depender del soporte de Solis**: sin tickets, sin esperas, sin riesgo de que revoquen o cambien las condiciones de la API.
>
> **Aviso honesto**: este scraper depende del portal web de SolisCloud tal como existe hoy. Si Solis cambia la web o sus endpoints internos en el futuro (ya hicieron una reescritura importante en julio de 2026), el scraper puede necesitar una actualización. La buena noticia: como habla con el mismo backend que la interfaz web, cualquier arreglo suele ser pequeño. Si ese día llega, issues y PRs son bienvenidos.

## El problema

SolisCloud tiene una API oficial de monitorizacion, pero para acceder a ella hay que abrir un ticket de soporte y esperar a que Solis la active manualmente (estableciendo los flags `apiSwitch` y `apiShowSwitch` en tu cuenta). Muchos usuarios esperan semanas o meses con su cuenta en estado "Nonactivated".

## La solucion

Este scraper llama a los endpoints de la API interna de SolisCloud directamente via HTTP, usando la misma autenticacion HMAC-SHA1 que usa el frontend web. El mecanismo de autenticacion se obtuvo por ingenieria inversa del JavaScript del frontend.

- **~43 MB de RAM** (solo Node.js)
- **~1 segundo** por ciclo de scraping
- **~1.200 peticiones HTTP/dia** (5 llamadas API por ciclo, cada 6 minutos)
- **Sin dependencia de navegador** - funciona en cualquier sistema con Node.js
- **Incluye datos de bateria** (SoC, potencia, voltaje, direccion)

## Equipo probado

Desarrollado y probado con:
- **Inversor**: Solis S5-EH1P6K-L (tambien conocido como RHI-6K-48ES-5G), hibrido monofasico con bateria
- **Bateria**: Soluna 5,12 kWh (SN: 1031052248080003BAT01)
- **Logger WiFi**: Solis S2-WL-ST (firmware `00010154`)
- **Capacidad de la planta**: 4,4 kWp
- **Tipo de cuenta SolisCloud**: Usuario final (no instalador)

Deberia funcionar con cualquier cuenta SolisCloud que pueda iniciar sesion en el portal web, independientemente del modelo de inversor o de si la API oficial esta activada.

## Como funciona la autenticacion

### Vision general

Cada peticion a la API interna de SolisCloud requiere:
1. Una cookie de sesion (`token=token_<uuid>`) obtenida del endpoint de login
2. Una firma HMAC-SHA1 en la cabecera `Authorization`
3. Una cabecera Content-MD5 con el hash MD5 codificado en Base64 del cuerpo de la peticion

### Paso 1: Login

```
POST https://www.soliscloud.com/api/user/login2
```

La contrasena se envia como su digest MD5 en hexadecimal:

```json
{
  "userInfo": "tu@email.com",
  "passWord": "<MD5 hex of your password>",
  "yingZhenType": 1,
  "localTime": 1783848004976,
  "localTimeZone": 2,
  "language": "2"
}
```

La respuesta establece una cookie `token=token_<uuid>` y una cookie `acw_tc`. Ambas deben enviarse con las peticiones posteriores.

### Paso 2: Firmar cada peticion

La cabecera `Authorization` tiene el formato:

```
Authorization: WEB 2424:<firma HMAC-SHA1 codificada en Base64>
```

El HMAC-SHA1 se calcula sobre esta cadena:

```
POST\n<Content-MD5>\napplication/json\n<Fecha-UTC>\n<ruta-sin-prefijo-api>
```

Con estos componentes:
- **Clave HMAC**: `5704383536604a8bb94c83ebc059aa8c` (hardcodeada en el JS del frontend)
- **Content-MD5**: `Base64(MD5(cuerpo_de_la_peticion))`
- **Fecha-UTC**: formato HTTP, p.ej. `Sun, 12 Jul 2026 09:20:04 GMT`
- **Ruta**: la ruta de la API **SIN el prefijo `/api`**. Ejemplo: para `POST /api/station/list`, se firma con `/station/list`

> **Detalle critico**: la ruta usada para firmar NO debe incluir `/api`. Algunos endpoints (como `login2` y `distributor/detail`) son tolerantes y aceptan firmas con o sin el prefijo. Pero `station/list` y `station/detailMix` devuelven `403 Forbidden - wrong sign` si se incluye `/api` en la firma.

### Cabeceras requeridas

| Cabecera | Valor |
|---|---|
| `Content-Type` | `application/json;charset=UTF-8` |
| `Content-MD5` | MD5 del cuerpo codificado en Base64 |
| `Authorization` | `WEB 2424:<firma HMAC-SHA1>` |
| `Time` | Fecha UTC |
| `Language` | `2` (ingles) |
| `X-Cloud-Platform` | `GLY` |
| `Version` | `5.3.001` |
| `Platform` | `Web` |
| `Cookie` | `token=token_<uuid>; acw_tc=<valor>` |

### Como se extrajo el secreto HMAC

El secreto esta incrustado en el bundle JavaScript del frontend de SolisCloud (`index-CqvhMJaa.js` a fecha de julio 2026). Se almacena como un array de tres cadenas codificadas en Base64 que se concatenan en tiempo de ejecucion:

```javascript
// Del JS minificado del frontend:
const mK = ["NTcwNDM4MzUzNjYw", "NGE4YmI5NGM4M2Vi", "YzA1OWFhOGM="];

function hK() {
  try {
    return mK.map(e => atob(e)).join("");
  } catch {
    return "";
  }
}
```

Decodificando cada parte:
```
atob("NTcwNDM4MzUzNjYw") = "5704383536604"
atob("NGE4YmI5NGM4M2Vi") = "4a8bb94c83eb"
atob("YzA1OWFhOGM=")     = "c059aa8c"
```

Concatenado: `5704383536604a8bb94c83ebc059aa8c`

La funcion de firma en el frontend:

```javascript
function yK({contentMd5Result: e, date: t, url: n, method: r}) {
  const a = vK(); // devuelve el secreto anterior
  return "WEB 2424:" + EK(a, r.toUpperCase() + "\n" + e + "\napplication/json\n" + t + "\n" + n);
}
// EK() calcula HMAC-SHA1 y devuelve Base64
```

El identificador de clave `2424` es una constante fija incrustada en la misma funcion.

### Verificacion

Para verificar que la firma funciona, puedes calcularla manualmente:

```javascript
const crypto = require("crypto");

const secret = "5704383536604a8bb94c83ebc059aa8c";
const body = JSON.stringify({localTime: Date.now(), localTimeZone: 2, language: "2"});
const contentMd5 = crypto.createHash("md5").update(body, "utf8").digest("base64");
const date = new Date().toUTCString();
const path = "/distributor/detail"; // SIN /api

const signString = "POST\n" + contentMd5 + "\napplication/json\n" + date + "\n" + path;
const signature = crypto.createHmac("sha1", secret).update(signString, "utf8").digest("base64");

console.log("Authorization: WEB 2424:" + signature);
```

## Referencia de endpoints API

### `/api/user/login2` (POST)

Autentica al usuario. Devuelve el perfil y establece las cookies de sesion.

**Cuerpo de la peticion:**
```json
{
  "userInfo": "tu@email.com",
  "passWord": "<MD5 hex de la contrasena>",
  "yingZhenType": 1,
  "localTime": 1783848004976,
  "localTimeZone": 2,
  "language": "2"
}
```

### `/api/distributor/detail` (POST)

Devuelve datos agregados a nivel de cuenta.

**Cuerpo:**
```json
{
  "localTime": 1783848005368,
  "localTimeZone": 2,
  "language": "2"
}
```

**Campos clave de la respuesta:**
| Campo | Descripcion | Ejemplo |
|---|---|---|
| `power` | Generacion actual | `1.516` |
| `powerStr` | Unidad | `"kW"` |
| `energyToday` | Energia generada hoy | `3.4` |
| `monthEnergy` | Energia este mes | `243.3` |
| `yearEnergy` | Energia este ano | `2.892` |
| `energyTotal` | Energia total historica | `5.909` |
| `batteryChargeTodayEnergy` | Bateria cargada hoy | `2` |
| `batteryDischargeTodayEnergy` | Bateria descargada hoy | `1` |
| `gridPurchasedTodayEnergy` | Importacion de red hoy | `6.27` |
| `gridSellTodayEnergy` | Exportacion a red hoy | `0.11` |
| `homeLoadTodayEnergy` | Consumo del hogar hoy | `7.46` |
| `incomeToday` / `incomeMonth` / `incomeTotal` | Ingresos | `0.51` / `36.51` / `886.35` |
| `capacity` | Capacidad de la planta | `4.4` |

### `/api/station/list` (POST)

Devuelve la lista de plantas. Se usa para descubrir el ID de la estacion necesario para `detailMix`.

**Cuerpo:**
```json
{
  "pageNo": 1,
  "pageSize": 10,
  "states": "0",
  "stationType": "1",
  "selectAreaValue": [],
  "dataNumber": 0,
  "localTime": 1783848005449,
  "localTimeZone": 2,
  "language": "2"
}
```

**Campos clave** (en `data.page.records[0]`):
| Campo | Descripcion | Ejemplo |
|---|---|---|
| `id` | ID de la estacion (necesario para detailMix) | `"1298491919450219817"` |
| `stationName` | Nombre de la planta | `"Mandor 40"` |
| `state` | 1 = normal | `1` |
| `power` | Potencia actual | `0.798` |
| `dayEnergy` | Energia de hoy | `3.4` |
| `dataTimestampStr` | Ultimo timestamp de datos | `"12/07/2026 11:04:31 (UTC+01:00)"` |

### `/api/station/detailMix` (POST)

Devuelve datos detallados en tiempo real de una estacion especifica. Es el endpoint mas valioso ya que incluye **datos de bateria** no disponibles en otros endpoints.

**Cuerpo:**
```json
{
  "id": "<station_id de station/list>",
  "localTime": 1783847743820,
  "localTimeZone": 2,
  "language": "2"
}
```

**Campos clave de la respuesta:**
| Campo | Descripcion | Ejemplo |
|---|---|---|
| `batteryPercent` | Estado de carga de la bateria (%) | `30` |
| `batteryPower` | Potencia de la bateria en kW (negativo = descargando) | `-1.509` |
| `batteryDirection` | 1 = cargando, 2 = descargando | `1` |
| `storageBatteryVoltage` | Voltaje de la bateria | `51.5` |
| `inverterBatteryCapacity` | Capacidad total de la bateria | `5.12` |
| `inverterBatteryCapacityStr` | Unidad | `"kWh"` |
| `batteryCount` | Numero de baterias | `1` |
| `batteryChargeEnergy` | Energia cargada hoy | `2` |
| `batteryDischargeEnergy` | Energia descargada hoy | `0` |
| `familyLoadPower` | Consumo actual del hogar | (disponible) |
| `gridPower` | Potencia actual de red | null en el S5-EH1P6K-L — ver `/api/inverter/detail` |
| `power` | Potencia solar actual | `0.798` |

### `/api/inverter/detail` (POST)

Devuelve **toda la telemetria del inversor**, mucho mas rica que `detailMix`. Aqui es donde vive realmente la **potencia de red instantanea** (en `detailMix` los campos `gridPower`/`gridDirection` vienen a `null`, al menos en el S5-EH1P6K-L).

**Cuerpo de la peticion:**
```json
{
  "sn": "<numero de serie del inversor>"
}
```

**Campos clave de la respuesta:**
| Campo | Descripcion | Ejemplo |
|---|---|---|
| `gridDetailVo.gridPower` | **Potencia de red instantanea (kW, magnitud)** | `0` |
| `gridDetailVo.gridVoltageA` / `gridCurrentA` | Tension/corriente de red por fase | `234.9` / `2.6` |
| `industryCurrentFlowMapV2` | Flags de direccion de flujo: `pvToLoad`, `pvToBattery`, `pvToGrid`, `gridToLoad`, `batteryToLoad`, `batteryToGrid` (0/1) | `{"pvToLoad":1,...}` |
| `gridPurchasedTodayEnergy` | Importacion de red de hoy | `4.86` |
| `gridSellTodayEnergy` | Exportacion a red de hoy | `0.04` |
| `familyLoadPower` | Consumo del hogar (circuitos normales) | `0` |
| `bypassLoadPower` | Consumo de cargas respaldadas (bypass) | `0.435` |
| `totalLoadPower` | Consumo total = family + bypass | `0.435` |
| `batteryPowerBms` / `batteryCapacitySoc` / `batteryHealthSoh` | Datos de la BMS | `1.482` / `50` / `98` |
| `batteryChargingCurrent` / `batteryDischargeLimiting` | Limites de corriente de la BMS (A) | `75` / `33.3` |
| `energyStorageControl` / `socDischargeSet` / `socChargingSet` | Ajustes del inversor | `"21"` / `20` / `10` |

El scraper usa este endpoint para rellenar `currentGridPower` (magnitud, kW) y `gridDirection` en `/v2/data`. `gridDirection` se deriva de `industryCurrentFlowMapV2` (`gridToLoad` → `"import"`, `pvToGrid`/`batteryToGrid` → `"export"`, si no `"none"`), asi no depende de la convencion de signos de Solis para `gridPower`.

### Otros endpoints (no usados por el scraper, pero descubiertos)

| Endpoint | Descripcion |
|---|---|
| `/api/user/find` | Perfil de usuario (incluye flags `apiSwitch`, `apiShowSwitch`) |
| `/api/chart/station/day/v2` | Graficos diarios con `batteryCapacitySocList` (historial SoC) |
| `/api/seng/chart` | Series temporales detalladas: `realSoc`, `batteryPower`, `gridPower`, `familyLoadPower` |
| `/api/seng/incomeChart` | Graficos de ingresos |
| `/api/inverter/listV2` | Lista de inversores |
| `/api/station/getDetailSample` | Datos de muestra de la estacion |
| `/api/alarm/alarmReadAll` | Estado de alarmas |
| `/api/weather/get7DayForecast` | Prevision meteorologica de la ubicacion |

## Instalacion

Elige **UNA** de estas opciones. El unico requisito previo es tener una cuenta de SolisCloud que pueda iniciar sesion en <https://www.soliscloud.com> (la misma que usas en la app SolisCloud).

---

### Opcion A — Add-on de Home Assistant OS (lo mas facil, 5 minutos)

Si tu Home Assistant corre como HAOS (Home Assistant Green/Yellow, una VM, una imagen de Raspberry Pi...), esta es la via recomendada: el scraper corre **dentro** del propio Home Assistant.

1. En Home Assistant, ve a **Ajustes → Complementos → Tienda de complementos**.
2. Pulsa el **menu ⋮ (arriba a la derecha) → Repositorios**.
3. Pega `https://github.com/gnacho/soliscloud-scraper` y pulsa **Anadir**, luego **Cerrar**.
4. Aparece la tarjeta **SolisCloud Scraper** en la tienda. Pulsala → **Instalar**.
5. Abre la pestana **Configuracion** y rellena:
   - `solis_username`: tu email de SolisCloud
   - `solis_password`: tu contrasena de SolisCloud
   - `service_username` / `service_password`: inventa cualquier par usuario/contrasena — protege la API local. Lo necesitaras otra vez en el paso de Home Assistant.
   - `service_port`: deja `5561`.
6. **Inicia** el add-on (opcionalmente activa *Iniciar al arrancar* y *Watchdog*).
7. Mira la pestana **Registro**: deberias ver `Login OK` y `Scrape OK`.

Pruebalo: abre `http://homeassistant.local:5561/v2/data` en el navegador — te pedira el `service_username`/`service_password` que acabas de inventar.

Despues sigue con **Integracion con Home Assistant** mas abajo.

---

### Opcion B — Docker (cualquier servidor, 5 minutos)

Para cualquier maquina con Docker (NAS, Raspberry Pi, servidor casero...):

```bash
git clone https://github.com/gnacho/soliscloud-scraper.git
cd soliscloud-scraper
cp scraper.properties.example scraper.properties
nano scraper.properties   # rellena tus credenciales SolisCloud + API local
docker compose up -d --build
```

Mira los logs: `docker logs -f soliscloud-scraper` — deberias ver `Login OK` y `Scrape OK`.

Prueba: `curl -u localuser:localpass http://localhost:5561/v2/data`

`docker run` pelado (sin compose) tambien funciona:

```bash
docker build -t soliscloud-scraper .
docker run -d --name soliscloud-scraper --restart unless-stopped \
  -p 5561:5561 -v "$PWD/scraper.properties:/app/scraper.properties:ro" \
  soliscloud-scraper
```

---

### Opcion C — A pelo (Node.js, sin contenedor)

**Requisitos:** Node.js 18+ (probado con Node.js 22).

```bash
git clone https://github.com/gnacho/soliscloud-scraper.git
cd soliscloud-scraper
npm install
cp scraper.properties.example scraper.properties
nano scraper.properties   # tus credenciales
node scraper.js
```

Deberias ver:

```
Solis Cloud API scraper (no browser) listening on port 5561
Login OK - user: your@email.com
Discovered station ID: 1234567890123456789
Scrape OK - distributor: yes station: yes detailMix: yes batterySoc: 85 duration: 943ms
```

Para que sobreviva a reinicios, crea `/etc/systemd/system/solis-scraper.service`:

```ini
[Unit]
Description=SolisCloud Scraper
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/ruta/a/soliscloud-scraper
ExecStart=/usr/bin/node scraper.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable solis-scraper
systemctl start solis-scraper
journalctl -u solis-scraper -f
```

---

## Integracion con Home Assistant

Lo mas facil es el **fichero package** ya preparado: [`homeassistant/soliscloud-scraper.yaml`](homeassistant/soliscloud-scraper.yaml).

1. Asegurate de que tu `configuration.yaml` contiene (anadelo si falta):

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

2. Copia `homeassistant/soliscloud-scraper.yaml` a tu carpeta `/config/packages/` (crea la carpeta si no existe).
3. Edita los 3 valores marcados con `<-- CHANGE` dentro del fichero (direccion del scraper + credenciales de la API local):
   - **Add-on de HAOS** con el puerto por defecto: la direccion ya es correcta (`http://homeassistant.local:5561/v2/data`).
   - Scraper en **otra maquina**: usa `http://<ip-de-esa-maquina>:5561/v2/data`.
4. **Reinicia Home Assistant** (Ajustes → Sistema → Reiniciar).

Obtendras estas entidades:

| Entidad | Significado |
|---|---|
| `sensor.solis_battery_soc` | Carga de la bateria (%) |
| `sensor.solis_solar_power` | Produccion solar actual (kW) |
| `sensor.solis_battery_power` | Potencia de bateria (kW, + cargando / − descargando) |
| `sensor.solis_grid_power` | Potencia de red (kW, + importando / − exportando) |
| `sensor.solis_yield_today` | Energia solar de hoy (kWh) |
| `sensor.solis_grid_import_today` | Importacion de red de hoy (kWh) |
| `sensor.solis_grid_export_today` | Exportacion a red de hoy (kWh) |
| `sensor.solis_house_consumption` | Consumo del hogar actual (kW) |

Los sensores diarios de kWh usan `state_class: total_increasing`, asi que puedes anadirlos directamente al **panel de Energia** (Ajustes → Paneles → Energia).

## Endpoints del API local

Todos los endpoints requieren Basic Auth.

| Endpoint | Descripcion |
|---|---|
| `GET /v2/data` | Datos normalizados con todos los campos (recomendado) |
| `GET /data` | Datos crudos (objetos distributor + station + detailMix) |
| `GET /v1/data` | Igual que `/data` |
| `GET /refresh` | Forzar un ciclo de refresco inmediato |

## Sobre la API oficial

La API oficial de SolisCloud existe y esta documentada ([PDF](https://solis-service.solisinverters.com/en/support/solutions/articles/44002212561-request-api-access-soliscloud)), pero requiere activacion manual por parte del soporte de Solis. Para solicitar acceso:

1. Ir a https://solis-service.solisinverters.com/en/support/tickets/new
2. Seleccionar **"API Access Request"**
3. Indicar tu email de SolisCloud
4. Esperar a que Solis procese la solicitud

Una vez activada, la pagina de gestion de API aparece en `https://www.soliscloud.com/service/apiManagement` donde puedes generar claves API.

Los flags del perfil de usuario que controlan esto:
- `apiSwitch: 0/1` - Si la API esta habilitada
- `apiShowSwitch: 0/1` - Si el menu de gestion de API es visible
- `userFunctions` debe incluir `A0507`

Este scraper no necesita que la API oficial este activada. Usa la misma API interna que el frontend web.

## Aviso legal

Este proyecto realiza ingenieria inversa de la API interna de SolisCloud para uso personal y no comercial de monitorizacion. Los endpoints, el mecanismo de autenticacion y el secreto HMAC se extraen del JavaScript del frontend servido publicamente y pueden cambiar sin previo aviso. No esta afiliado con Ginlong/Solis de ninguna manera. Usar bajo tu propia responsabilidad.

## Licencia

[GNU AGPLv3](LICENSE)
