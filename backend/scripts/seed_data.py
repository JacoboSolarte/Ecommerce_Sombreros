"""Sample content for Casa Guaico (fictional names, real Nariño municipalities)."""
from __future__ import annotations

SIZES = [
    ("S", "Pequeña", 54, 55), ("M", "Mediana", 56, 57), ("L", "Grande", 58, 59), ("XL", "Extra grande", 60, 61),
]

COLORS = [
    ("Natural", "#D9C59A"), ("Blanco hueso", "#EFE9DC"), ("Miel", "#C8963E"),
    ("Café", "#6B4A2E"), ("Negro", "#1E1E1E"), ("Verde oliva", "#5B6B3A"),
]

CATEGORIES = [
    ("Sombreros clásicos", "sombreros-clasicos", "shape:classic",
     "Aguadeños y fedoras de ala media: el sombrero de siempre, tejido a mano en iraca de Nariño."),
    ("Sombreros de ala ancha", "sombreros-ala-ancha", "shape:wide",
     "Ala generosa para el sol del altiplano, el campo y la finca. Sombra de verdad."),
    ("Sombreros para dama", "sombreros-para-dama", "shape:capeline",
     "Capelinas de ala suave y caída elegante, para el día a día y para ocasiones especiales."),
    ("Sombreros para niños", "sombreros-para-ninos", "shape:kids",
     "Versiones livianas y de tallas pequeñas para los más chiquitos de la casa."),
    ("Plegables de viaje", "plegables-de-viaje", "shape:packable",
     "Tejidos flexibles que se enrollan para la maleta y recuperan su forma al llegar."),
]

ARTISANS = [
    {
        "full_name": "Rosa Elena Chaves Muñoz", "municipality": "Sandoná", "years": 38,
        "bio": ("Aprendió a tejer a los doce años mirando a su abuela en el patio de la casa, en una vereda de Sandoná. "
                "Hoy dirige un pequeño taller familiar donde se tejen sombreros aguadeños de trama muy cerrada. "
                "Dice que la iraca buena se reconoce por el sonido que hace al doblarse: tiene que sonar a papel de seda."),
    },
    {
        "full_name": "Hernán Darío Insuasty", "municipality": "Linares", "years": 31,
        "bio": ("Tejedor de Linares, en la zona andina de Nariño, que combina el tejido de iraca con el trabajo en el campo. "
                "Se especializa en copas altas y alas firmes que resisten el uso diario. "
                "Teje por las tardes, cuando baja el calor, y enseña el oficio a jóvenes de su vereda."),
    },
    {
        "full_name": "María Cecilia Portilla", "municipality": "Ancuya", "years": 24,
        "bio": ("Desde Ancuya trabaja con una asociación de mujeres tejedoras que comparten el cultivo y el cocido de la fibra. "
                "Su sello son los remates parejos y las trenzas finas del ala. "
                "Le gusta experimentar con tonos tierra sin perder la sobriedad del sombrero tradicional."),
    },
    {
        "full_name": "Luis Alfonso Erazo", "municipality": "La Florida", "years": 17,
        "bio": ("Nació en La Florida, al pie del volcán Galeras, y empezó a tejer ayudando a su madre a terminar pedidos. "
                "Hace sombreros de ala ancha y piezas infantiles, siempre con fibra de la zona. "
                "Insiste en que un buen sombrero se mide por lo cómodo que se siente después de tres horas puesto."),
    },
    {
        "full_name": "Blanca Nubia Guerrero", "municipality": "Consacá", "years": 40,
        "bio": ("Con cuatro décadas de oficio, es una de las tejedoras más reconocidas de Consacá. "
                "Trabaja las piezas más finas del catálogo, donde la hebra se afina hasta casi desaparecer. "
                "Cada sombrero extrafino le toma semanas y lo firma con un pequeño nudo en el interior de la copa."),
    },
    {
        "full_name": "Jhon Fredy Burbano", "municipality": "El Tambo", "years": 8,
        "bio": ("El más joven del grupo, aprendió el oficio en un taller comunitario de El Tambo. "
                "Teje con rapidez y buen pulso, y se ha enfocado en sombreros livianos y de tallas pequeñas. "
                "Combina las técnicas que le enseñaron los mayores con diseños propios de copa baja."),
    },
]

# name, category index, artisan index, weave, hours, brim_cm, price, compare_at, featured, colors, sizes, bleach, short, pitch
PRODUCTS = [
    ("Aguadeño Clásico Natural", 0, 0, "fino", 38, 6.0, 168000, None, True, ["Natural", "Blanco hueso", "Miel"], "SMLX", "azufre",
     "El aguadeño de siempre, tejido a mano en Sandoná.",
     "El aguadeño es el sombrero que se ve en las plazas y fincas de Nariño: copa media, ala corta y una trama que respira. Esta versión natural es la más fiel a la tradición de Sandoná."),
    ("Aguadeño Superfino de Gala", 0, 4, "superfino", 82, 6.0, 340000, None, True, ["Blanco hueso", "Natural"], "SMLX", "azufre",
     "Aguadeño de trama superfina, liviano y de caída elegante.",
     "Pensado para quien quiere un aguadeño de ocasión. La hebra es más delgada y la trama más cerrada, así que el sombrero pesa poco y conserva su forma con el paso de los años."),
    ("Fedora de Ala Media Café", 0, 1, "fino", 46, 6.5, 195000, None, False, ["Café", "Negro", "Natural"], "SMLX", "natural",
     "Fedora de iraca teñida, con copa marcada y ala media.",
     "Una fedora con carácter, tejida en Linares con la copa pellizcada al frente y el ala apenas inclinada. El color se logra tiñendo la fibra antes de tejer."),
    ("Fedora Superfino Oliva", 0, 2, "superfino", 70, 6.5, 285000, 330000, False, ["Verde oliva", "Negro"], "SMLX", "azufre",
     "Fedora superfina en tonos oliva y negro, con cinta tejida.",
     "El verde oliva se obtiene con tintes vegetales y se fija antes de tejer. Es un sombrero sobrio, de trama pareja y remate fino en el borde del ala."),
    ("Aguadeño Extrafino Real de Sandoná", 0, 4, "extrafino", 150, 6.0, 690000, None, True, ["Blanco hueso", "Natural"], "SMLX", "azufre",
     "Pieza de colección: casi seis semanas de tejido a mano.",
     "Nuestra pieza más fina. La iraca se desfleca hasta quedar como un hilo y el tejido se hace en pocas horas diarias, para no perder la tensión de la hebra. Cada sombrero se entrega con su certificado de origen."),
    ("Ala Ancha Campesino", 1, 3, "fino", 30, 9.5, 119000, None, False, ["Natural", "Café", "Miel"], "SMLX", "natural",
     "Ala ancha resistente para el trabajo al sol.",
     "Un sombrero para el día entero a la intemperie: ala de 9,5 cm, copa cómoda y trama firme. Lo tejen en La Florida con fibra de la propia vereda."),
    ("Ala Ancha Hacienda", 1, 1, "fino", 48, 10.5, 205000, None, False, ["Miel", "Café"], "SMLX", "natural",
     "Ala de 10,5 cm y copa alta con forro interior de algodón.",
     "Pensado para largas jornadas de campo: la banda interior de algodón absorbe el sudor y el ala amplia da sombra al rostro y a los hombros."),
    ("Ala Ancha Superfino Mirador", 1, 4, "superfino", 90, 10.0, 365000, 420000, False, ["Natural", "Blanco hueso", "Negro"], "SMLX", "azufre",
     "Ala ancha de trama superfina, liviana a pesar de su tamaño.",
     "Un ala de diez centímetros que no se vence: la trama cerrada y el borde reforzado mantienen la forma. Perfecto para viajes, fincas y festivales."),
    ("Ala Ancha Extrafino Guaico", 1, 0, "extrafino", 125, 11.0, 560000, None, True, ["Natural", "Blanco hueso"], "SMLX", "natural",
     "Nuestro ala ancha más fino, blanqueado al sol.",
     "Lleva el nombre de la casa. Es un ala de 11 cm tejida con hebra extrafina y blanqueada solo al sol y al rocío, por eso su tono crema cálido es único en cada pieza."),
    ("Capelina Primavera", 2, 2, "superfino", 64, 12.0, 255000, None, False, ["Blanco hueso", "Miel", "Natural"], "SMLX", "azufre",
     "Capelina de ala amplia y caída suave.",
     "El ala de 12 cm cae con suavidad sobre la frente y protege del sol sin pesar. Se teje en Ancuya, de la copa hacia afuera, con un remate de trenza fina."),
    ("Capelina Ala Suave Dama", 2, 3, "fino", 42, 10.0, 149000, None, True, ["Natural", "Verde oliva"], "SMLX", "natural",
     "Capelina ligera para el día a día.",
     "Una capelina cómoda y fácil de combinar. Su ala flexible se acomoda al gusto de quien la usa y la copa baja se mantiene firme con viento."),
    ("Capelina Extrafino Boda", 2, 4, "extrafino", 138, 14.0, 620000, None, False, ["Blanco hueso", "Natural"], "SMLX", "azufre",
     "Capelina extrafina de ala amplia para ocasiones especiales.",
     "Un ala de 14 cm tejida con hebra finísima. Es la capelina que más piden para bodas al aire libre: casi translúcida a contraluz y muy liviana."),
    ("Aguadeño Infantil", 3, 3, "fino", 14, 5.0, 89000, None, False, ["Natural", "Miel", "Café"], "SML", "natural",
     "Aguadeño pequeño, liviano y cómodo para niños.",
     "El mismo aguadeño de los mayores, a escala. Pesa muy poco y tiene una banda interior suave para que los niños no se lo quieran quitar."),
    ("Sombrerito Campesino Niño", 3, 5, "fino", 12, 6.0, 95000, None, False, ["Natural", "Café"], "SML", "natural",
     "Ala de 6 cm y copa baja, a prueba de juegos.",
     "Hecho en El Tambo para los paseos de finca y de colegio. La trama es firme y la forma vuelve sola después de un buen apretón en la mochila."),
    ("Capelina Infantil Flor", 3, 5, "fino", 18, 7.0, 105000, None, False, ["Blanco hueso", "Miel"], "SML", "azufre",
     "Capelina pequeña con cinta de flores tejidas.",
     "Una capelina para ocasiones especiales de los más pequeños, con una cinta tejida en la misma iraca. Es una de las piezas que más rápido se agota."),
    ("Plegable de Viaje Fino", 4, 1, "fino", 36, 7.5, 178000, None, True, ["Natural", "Café", "Negro"], "SMLX", "natural",
     "Se enrolla para la maleta y recupera su forma.",
     "Tejido con una trama un poco más abierta y flexible para que se pueda doblar sin quebrarse. Ideal para viajes, playas y caminatas largas."),
    ("Plegable Superfino Ruta", 4, 2, "superfino", 75, 8.0, 298000, 345000, False, ["Natural", "Verde oliva"], "SMLX", "azufre",
     "Plegable de trama superfina, ligero y resistente.",
     "La hebra superfina permite doblar el sombrero hasta en tres sin dañarlo. Viene con una bolsa de tela para guardarlo en la maleta."),
    ("Plegable Extrafino Aventura", 4, 4, "extrafino", 112, 8.5, 455000, None, False, ["Natural", "Blanco hueso"], "SMLX", "azufre",
     "Plegable de colección para quienes viajan con estilo.",
     "Una pieza extrafina y flexible que se enrolla como una tela. Cada una toma más de cuatro semanas de tejido y se revisa a mano antes de empacarla."),
]

GRADE_TEXT = {
    "fino": "Es un tejido fino: la trama es firme y pareja, pensada para el uso diario y para durar muchos años.",
    "superfino": ("Es un tejido superfino: la fibra se divide en hebras más delgadas y la trama queda más cerrada y regular, "
                  "lo que da un sombrero liviano y de caída elegante."),
    "extrafino": ("Es un tejido extrafino: la hebra se afina hasta parecer un hilo y la trama es tan cerrada que, a contraluz, "
                  "apenas deja pasar la luz. Es una pieza de colección que exige semanas de trabajo."),
}

BLEACH_TEXT = {
    "azufre": ("Después de la cocción, las hebras se ventilan en un cuarto cerrado con humo de azufre durante una noche; "
               "así se aclaran y quedan de un tono marfil parejo."),
    "natural": ("Esta pieza no lleva azufre: la fibra se blanquea al sol y al rocío durante varios días, "
                "por eso conserva un tono crema cálido con ligeras variaciones naturales."),
}


def build_description(name, grade, hours, brim, bleach, pitch, colors, packable: bool, kids: bool) -> str:
    colored = [c for c in colors if c not in ("Natural", "Blanco hueso")]
    color_line = (
        f"Disponible en {', '.join(colors[:-1]).lower()} y {colors[-1].lower()}: los tonos oscuros o de color se logran "
        "tiñendo la fibra antes de tejer, de modo que el color es parejo por dentro y por fuera."
        if colored else
        f"Disponible en {' y '.join(c.lower() for c in colors)}, sin tintes: el color viene de la propia fibra."
    )
    care = (
        "Cuidados: límpialo con un cepillo suave o un paño apenas húmedo y evita mojarlo. No lo dejes al sol directo por mucho tiempo "
        "ni dentro del carro. Si se humedece, déjalo secar a la sombra sobre una superficie plana. "
    )
    care += (
        "Aunque es plegable, enróllalo con suavidad y déjalo reposar unas horas al llegar para que recupere su forma; no lo guardes doblado por semanas."
        if packable else
        "Guárdalo con la copa hacia arriba o colgado, nunca aplastado ni con peso encima."
    )
    kid_line = " Las tallas pequeñas se miden por el contorno de la cabeza; ante la duda, elige la talla mayor." if kids else ""
    return "\n\n".join([
        f"{pitch} {GRADE_TEXT[grade]}",
        f"Tejido a mano: {hours} horas de trabajo de una sola artesana o artesano, de la copa hacia abajo. "
        "Se empieza en el centro de la copa con una pequeña base de ocho hebras y se va ampliando vuelta a vuelta hasta formar el ala; "
        "el remate se hace con una trenza que cierra el borde sin dejar puntas sueltas.",
        "De la palma al sombrero: la iraca (Carludovica palmata) se corta cuando el cogollo está tierno, antes de que abra. "
        "Se desvenan las hojas, se cuecen en agua hirviendo para fijar la fibra y se secan a la sombra hasta que cambian de verde a marfil. "
        f"{BLEACH_TEXT[bleach]}",
        f"{color_line} El ala mide {str(brim).replace('.', ',')} cm. Cada sombrero es único: pueden verse pequeñas variaciones en la trama, "
        f"que son huella del trabajo manual.{kid_line}",
        care,
    ])
