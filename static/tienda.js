let url = "https://tiendapuma.onrender.com/puma"; // Cambiar el endpoint a productos
let cargando = document.getElementById("cargando");

// Función para ordenar los productos según su precio (de menor a mayor)
function ordenarProductosPorPrecio(productos) {
  return productos.sort((a, b) => {
    let precioA = parseFloat(a.price.replace("$", "").replace(/\./g, "").replace(",", "."));
    let precioB = parseFloat(b.price.replace("$", "").replace(/\./g, "").replace(",", "."));
    return precioA - precioB;
  });
}

function getProductos() {
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error("Network response was not ok for productos");
      }
      return response.json();
    })
    .then(data => {
      let productosOrdenados = ordenarProductosPorPrecio(data);
      getProductosHTML(productosOrdenados);
    })
    .catch(error => {
      console.error("Error al obtener los productos:", error);
      if (cargando) {
        cargando.textContent = "Error al cargar los productos.";
      }
    });
}

function getProductosHTML(productos) {
  let divResultados = document.getElementById("productos");

  if (!divResultados) {
    console.error('El elemento con id "productos" no se encontró.');
    return;
  }

  if (cargando) {
    cargando.innerHTML = "";
  }

  divResultados.innerHTML = "";

  // Usar un fragmento de documento para optimizar la inserción masiva en el DOM
  let fragment = document.createDocumentFragment();

  productos.forEach(producto => {
    let productoDiv = document.createElement("div");
    productoDiv.classList.add("producto");

    let botonesDiv = document.createElement("div");
    botonesDiv.classList.add("botonesDiv");

    let title = document.createElement("h2");
    title.textContent = producto.title;

    let description = document.createElement("p");
    description.textContent = producto.description;

    let price = document.createElement("b");
    price.textContent = `Precio: ${producto.price}`;
    price.classList.add("priceAumentado");

    let priceOriginal = document.createElement("p");
    priceOriginal.innerHTML = `Precio Original: <del>${producto.price_original}</del>`;

    let pricePorcentaje = document.createElement("b");
    pricePorcentaje.textContent = `${producto.price_porcentaje}`;

    let imagenUrl = producto.img;
    if (imagenUrl) {
      let imagen = document.createElement("img");
      imagen.src = imagenUrl;
      imagen.alt = producto.title;
      imagen.loading = "lazy"; // Lazy loading
      productoDiv.appendChild(imagen);
    }

    let verImagenesButton = document.createElement("button");
    verImagenesButton.textContent = "Ver imágenes";
    verImagenesButton.classList.add("btn-ver-imagenes");

    verImagenesButton.addEventListener("click", function () {
      mostrarCarrusel(producto.imagenes_producto);
    });

    let pagarButton = document.createElement("button");
    pagarButton.textContent = "Pagar";
    pagarButton.classList.add("btn-pago");

    pagarButton.addEventListener("click", function () {
      let precioAumentadoFloat = parseFloat(
        producto.price.replace("$", "").replace(/\./g, "").replace(",", ".")
      );

      fetch(`/pago/${precioAumentadoFloat}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: producto.title }),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error("Error al crear la preferencia de pago.");
          }
          return response.json();
        })
        .then(data => {
          window.location.href = data.init_point;
        })
        .catch(error => {
          console.error("Error al crear la preferencia de pago:", error);
          alert("Hubo un error al intentar procesar el pago. Inténtalo nuevamente.");
        });
    });

    // Botón de WhatsApp
    let whatsappButton = document.createElement("button");
    whatsappButton.textContent = "CONTACTAR POR WHATSAPP";
    whatsappButton.classList.add("btn-whatsapp");

    whatsappButton.addEventListener("click", function () {
      document
        .getElementById("whatsappModal")
        .setAttribute("data-product-title", producto.title);

      document.getElementById("whatsappModal").style.display = "block";
    });

    productoDiv.appendChild(title);
    productoDiv.appendChild(price);
    if (producto.price_original) {
      let priceOriginal = document.createElement("p");
      priceOriginal.innerHTML = `Precio Original: <del>${producto.price_original}</del>`;
      productoDiv.appendChild(priceOriginal);
    }

    if (producto.price_porcentaje) {
      let pricePorcentaje = document.createElement("p");
      pricePorcentaje.textContent = `Descuento: ${producto.price_porcentaje}`;
      productoDiv.appendChild(pricePorcentaje);
    }
    botonesDiv.appendChild(verImagenesButton);
    botonesDiv.appendChild(whatsappButton);
    botonesDiv.appendChild(pagarButton);
    productoDiv.appendChild(botonesDiv);

    fragment.appendChild(productoDiv);
  });

  divResultados.appendChild(fragment);
}

// Función para mostrar el modal con el carrusel
function mostrarCarrusel(imagenes) {
  let modal = document.getElementById("modal");
  let carruselDiv = document.getElementById("carrusel");

  carruselDiv.innerHTML = "";

  imagenes.forEach(imagenUrl => {
    let imgElement = document.createElement("img");
    imgElement.src = imagenUrl;
    imgElement.loading = "lazy"; // Lazy loading para carrusel
    carruselDiv.appendChild(imgElement);
  });

  modal.style.display = "block";
}

// Cerrar el modal de imágenes
document.getElementById("closeModal").onclick = function () {
  document.getElementById("modal").style.display = "none";
};

// Otros modales y eventos
document.getElementById("closeWhatsappModal").onclick = function () {
  document.getElementById("whatsappModal").style.display = "none";
};

// Enviar formulario de WhatsApp
document.getElementById("whatsappForm").addEventListener("submit", function (event) {
  event.preventDefault();

  let nombreCompleto = document.getElementById("nombre").value;
  let telefono = document.getElementById("telefono").value;
  let direccion = document.getElementById("direccion").value;

  let productoTitle = document
    .getElementById("whatsappModal")
    .getAttribute("data-product-title");

  let mensaje = `Hola, mi nombre es ${nombreCompleto}. Estoy interesado en el producto "${productoTitle}". Mis datos de contacto son:\nTeléfono: ${telefono}\nDirección: ${direccion}`;

  let whatsappURL = `https://wa.me/5491128470107?text=${encodeURIComponent(mensaje)}`;
  window.open(whatsappURL, "_blank");

  document.getElementById("whatsappModal").style.display = "none";
});

// Cargar productos al cargar la página
document.addEventListener("DOMContentLoaded", getProductos);
