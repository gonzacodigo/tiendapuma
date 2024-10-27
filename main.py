from concurrent.futures import ThreadPoolExecutor
from flask import Flask, render_template, request, send_from_directory, jsonify
from flask_cors import CORS
import mercadopago
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import os
import time

app = Flask(__name__)
CORS(app)  # Habilitar CORS para todas las rutas
session = requests.Session()  # Reutilizar la sesión HTTP

# Configuración de caché en memoria
cache = {}
CACHE_DURATION = 300  # Duración de la caché en segundos (5 minutos)

@app.route('/')
def index():
    return render_template('tienda.html')

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('static', filename)

# Inicializar Mercado Pago con tu Access Token
sdk = mercadopago.SDK("APP_USR-6353271101230954-091923-0134b8d1466acc7784abaf1dbce6cc7d-411256757")

@app.route('/pago/<float:precio>', methods=['POST'])
def crear_pago(precio):
    try:
        data = request.get_json()
        item_title = data.get('title', 'Compra en Puma')

        preference_data = {
            "items": [
                {
                    "title": item_title,
                    "quantity": 1,
                    "currency_id": "ARS",
                    "unit_price": round(precio, 2) * 1000
                }
            ],
            "back_urls": {
                "success": "https://tiendaadidas.pythonanywhere.com/",
                "failure": "https://tiendaadidas.pythonanywhere.com/",
                "pending": ""
            },
            "auto_return": "approved"
        }

        preference_response = sdk.preference().create(preference_data)

        if preference_response.get("error"):
            return jsonify({'error': 'Error al crear la preferencia de pago'}), 500

        preference = preference_response["response"]
        return jsonify({'init_point': preference['init_point']})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/puma', methods=['GET'])
def obtener_productos_puma():
    # Revisar si los datos están en caché y no han expirado
    if 'puma_data' in cache and (time.time() - cache['puma_data']['timestamp'] < CACHE_DURATION):
        return jsonify(cache['puma_data']['data'])

    url = "https://ar.puma.com/outlet"

    try:
        response = session.get(url)
        response.raise_for_status()
    except requests.RequestException as e:
        app.logger.error(f"Error en la solicitud: {e}")
        return jsonify({'error': 'No se pudo obtener los productos'}), 500

    soup = BeautifulSoup(response.text, 'html.parser')
    productos = soup.find_all('a', class_='chakra-link')
    resultado = []

    for producto in productos:
        title = producto.find('p', class_="chakra-text css-15jo16m")
        price = producto.find('b', class_="chakra-text css-0")
        price_original = producto.find('s', class_="chakra-text css-dcu1hw")
        price_porcentaje = producto.find('span', class_="chakra-badge css-1rv344z")
        div_imagen = producto.find('div', class_="css-0")
        imagen_url = None
        link_href = producto['href'] if 'href' in producto.attrs else None
        
        if title and price:
            price_text = price.text.strip().replace('$', '').replace(',', '')
            price_float = float(price_text) if price_text else 0

            porcentaje_aumento = 0
            nuevo_precio = price_float + (price_float * porcentaje_aumento / 100)
            price = nuevo_precio * 1000

        if div_imagen:
            imagen = div_imagen.find('img', class_="chakra-image css-169s1qj")
            if imagen:
                imagen_url = imagen.get('src')

        if link_href and not link_href.startswith('http'):
            link_href = urljoin("https://ar.puma.com/outlet", link_href)

        try:
            response_producto = session.get(link_href)
            response_producto.raise_for_status()
        except requests.RequestException as e:
            app.logger.error(f"Error en la solicitud al producto: {e}")
            continue

        soup_producto = BeautifulSoup(response_producto.text, 'html.parser')
        productos_article = soup_producto.find_all('div', class_='css-10olt1g')

        imagenes_producto = []
        if productos_article:
            for article in productos_article:
                imgs = article.find_all('img', class_="chakra-image css-0")
                imagenes_producto.extend([img['src'] for img in imgs if 'src' in img.attrs])

        if title:
            resultado.append({
                'title': title.text.strip() if title else None,
                'price': f"${price:,.2f}",
                'price_porcentaje': price_porcentaje.text.strip() if price_porcentaje else None,
                'price_original': price_original.text.strip() if price_original else None,
                'img': imagen_url,
                'imagenes_producto': imagenes_producto,
                'link_href': link_href
            })

    # Guardar los datos en la caché con el tiempo actual
    cache['puma_data'] = {
        'data': resultado,
        'timestamp': time.time()
    }

    return jsonify(resultado)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
