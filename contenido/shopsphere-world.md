# ShopSphere World — Biblia del Curso

> Documento de referencia para content writers, instructional designers y el equipo técnico del curso.
> Todo lo que ocurra en los ejercicios, proyectos y el capstone debe ser coherente con este documento.

---

## PARTE A — BIBLIA DE SHOPSPHERE

### Historia de la empresa

ShopSphere nació en Bogotá en 2019, en el departamento de una quinta piso sin ascensor que Marco Jiménez y su socio Andrés Palacios compartían con tres desarrolladores freelance y una cafetera industrial. La idea era simple: había docenas de marcas colombianas de tecnología y hogar que vendían bien en ferias y tiendas físicas pero no tenían presencia digital real. Shopify era caro y complicado para ellas. Mercado Libre se llevaba un porcentaje que hacía el margen insostenible. Había un hueco.

Marco tenía 28 años, experiencia en ventas B2B y una obsesión con la logística que sus amigos consideraban rara. Andrés era el técnico. En seis meses lanzaron una versión beta con 12 marcas vendedoras y un sistema de pagos que fallaba un 20% del tiempo. Nadie durmió bien ese primer año.

**2020** fue el año que los salvó y los complicó al mismo tiempo. La pandemia aceleró el e-commerce en toda la región de una manera que ningún plan de negocio había proyectado. Las ventas se triplicaron en cuatro meses. El sistema colapsó dos veces. Andrés renunció por agotamiento en octubre de ese año. Marco contrató a doce personas en noventa días y aprendió a gestionar equipos por pura necesidad.

**2021-2022** fueron los años de expansión. Entraron a México, que se volvió el mercado más grande en menos de un año. Luego Chile y Perú. Argentina fue la apuesta más difícil — los problemas cambiarios obligaron a reescribir el módulo de precios tres veces. En 2022 cerraron una Serie A de USD 8 millones con un fondo mexicano y un fondo chileno de capital de riesgo.

**2023-2024** llegó el crecimiento que no habían planeado bien. Los pedidos mensuales pasaron de 7.000 a 15.000 en dieciocho meses. El equipo creció de 90 a 280 personas. La operación funcionaba — pero nadie sabía exactamente qué estaba funcionando ni qué no. Los reportes se hacían en Excel. Las decisiones se tomaban con intuición. Marco seguía siendo el mismo fundador que confiaba en su olfato más que en los números, excepto que ahora el negocio era diez veces más complejo.

**Hoy** (mayo 2026), ShopSphere es una empresa real, con operaciones en cinco países, un catálogo de más de 8.000 productos activos y una base de clientes que supera los 200.000 compradores registrados. Pero tiene un problema serio que todos en el equipo directivo conocen y pocos dicen en voz alta: sus decisiones siguen siendo lentas porque los datos están ahí pero nadie los puede leer bien. El equipo de analytics hasta hace seis meses era una sola persona. Esa persona renunció para irse a una fintech en Ciudad de México. Valentina Torres, contratada hace ocho meses para construir el área desde cero, acaba de conseguir presupuesto para contratar a su primer analista. Ese analista eres tú.

---

### Misión

Hacer que cualquier marca o vendedor en Latinoamérica pueda competir en el canal digital sin necesitar un equipo de tecnología propio. ShopSphere no es solo una plataforma de ventas — es la infraestructura que permite que un fabricante de Guadalajara o una marca de diseño de Santiago llegue a clientes en toda la región con la misma eficiencia que una empresa grande.

---

### Valores

ShopSphere tiene tres valores que aparecen en la pared de la oficina y que, a diferencia de la mayoría de los valores corporativos, la gente realmente menciona en las conversaciones: **velocidad con criterio** (moverse rápido pero no a ciegas), **datos sobre opiniones** (cuando hay un número disponible, el número gana la discusión), y **accountability sin drama** (si algo falla, se nombra, se entiende y se arregla — sin reuniones de dos horas analizando a quién culpar). La cultura es directa, a veces brusca para quien viene de empresas más formales, pero honesta.

---

### Cultura de trabajo

El trabajo es principalmente remoto, con equipos distribuidos entre Bogotá, Ciudad de México y Santiago. Hay una oficina física en Bogotá que funciona más como hub de reuniones que como lugar de trabajo cotidiano. La comunicación interna es por Slack, las reuniones son cortas y con agenda, y existe una regla no escrita pero universal: si vas a una reunión con Marco sin números, él te va a pedir números. El problema es que hasta ahora nadie tenía los números listos. Eso está cambiando.

---

### Estructura del equipo

El estudiante interactúa principalmente con cinco personas. No es necesario conocer a toda la empresa — estas cinco son las voces que van a aparecer en los ejercicios, los proyectos y el capstone.

| Persona | Cargo | Relación con el estudiante |
|---|---|---|
| Valentina Torres | Head of Analytics | Jefa directa. Asigna el trabajo, da contexto, valida los resultados |
| Marco Jiménez | CEO y cofundador | Hace preguntas grandes y espera respuestas concretas. No siempre entiende el proceso, siempre entiende el impacto |
| Sofía Ramírez | Head of Marketing | Cliente interno frecuente. Quiere saber si sus campañas funcionan |
| Diego Morales | Head of Operations | Preocupado por logística, inventario, devoluciones. Muy orientado a procesos |
| Ana Castillo | Head of Finance | Metódica, exigente con los números, pregunta por márgenes y pagos |

---

### Por qué ShopSphere necesita un Data Analyst

La versión corta: el negocio creció más rápido que su capacidad de entenderlo.

Los datos existen. Hay una base de datos PostgreSQL con años de transacciones, clientes, productos, campañas y operaciones logísticas. El problema no es la falta de datos — es la falta de personas que puedan convertir esos datos en respuestas.

Tres situaciones concretas que empujaron la contratación:

**El problema de Sofía.** En el Q4 de 2025 Marketing lanzó tres campañas simultáneas en México. Una funcionó, dos no. Sofía no supo cuál fue cuál hasta tres semanas después, cuando ya habían gastado el presupuesto. Necesita poder medir el desempeño de cada campaña en tiempo casi real.

**El problema de Diego.** En enero 2026 hubo un problema de sobre-stock en la categoría de electrónica en Argentina. Nadie lo detectó a tiempo porque nadie estaba mirando los datos de inventario de forma sistemática. La empresa tuvo que hacer descuentos agresivos para mover el stock. Perdieron margen.

**El problema de Marco.** Marco toma decisiones de expansión basándose en su intuición de mercado y en conversaciones con vendedores. Hace dos meses decidió no entrar a un segmento nuevo de "hogar premium" porque "no se sentía bien". Valentina tiene la hipótesis de que los datos habrían mostrado exactamente lo contrario. Pero no había nadie que pudiera hacer ese análisis a tiempo.

Esos tres problemas tienen la misma raíz: ShopSphere necesita un analista que convierta la base de datos en inteligencia de negocio. Ese es el trabajo.

---

## PARTE B — PERFILES DE PERSONAJES

---

### Valentina Torres — Head of Analytics

**Edad:** 34 años. **Ubicación:** Bogotá (trabaja remoto los martes y viernes).

**Historia:** Trabajó cinco años en una consultora de datos en São Paulo, luego dos años como Senior Analyst en una fintech colombiana antes de unirse a ShopSphere. Es la primera persona en la empresa que tiene el título "Head of" algo relacionado con datos. Sabe que está construyendo el área desde cero y que eso es tanto una oportunidad como una carga.

**Rasgos de personalidad:**
1. Directa hasta el punto de parecer brusca la primera semana — después uno entiende que es eficiencia, no frialdad
2. Muy orientada a resultados: le importa el output, no el proceso que usaste para llegar ahí
3. Protege a su equipo hacia afuera pero es exigente hacia adentro — si algo está mal, te lo dice antes de que llegue a Marco
4. Tiene sentido del humor seco que aparece sobre todo cuando el trabajo está bajo presión

**Cómo se comunica:** Emails cortos. Asunto claro, una o dos oraciones de contexto, lo que necesita, y la fecha límite. No usa signos de exclamación. Rara vez dice "por favor" en los asuntos urgentes — no porque sea maleducada, sino porque ambos ya saben para qué sirven.

**Qué tipo de preguntas hace:** "¿Cuánto revenue generó X en el último trimestre?", "¿Qué producto tiene la tasa de devolución más alta?", "Dame los top 10 clientes por valor de vida." Sus preguntas siempre tienen una métrica clara y un período de tiempo definido.

**Email de ejemplo:**

> **De:** Valentina Torres
> **Para:** [Estudiante]
> **Asunto:** Análisis de retención — necesito esto hoy
>
> Reunión con Marco mañana a las 10. Me pidió datos de retención de clientes: cuántos clientes que compraron en Q3 2025 volvieron a comprar en Q4. Desagregado por país si es posible.
>
> Esto tiene que estar en mi bandeja antes de las 6pm. Si hay algo raro en los datos avísame antes de mandarlo.
>
> — Vale

---

### Marco Jiménez — CEO y cofundador

**Edad:** 37 años. **Ubicación:** Ciudad de México (se mudó en 2022 cuando México se volvió el mercado principal).

**Historia:** Bogotano de origen, hijo de un comerciante de telas del centro. Aprendió a vender antes de aprender a programar. No es técnico — entiende los negocios de manera intuitiva y tiene una habilidad natural para leer a las personas. Construyó ShopSphere más con energía y relacionamiento que con planeación formal. Sabe que eso tiene un límite y que ese límite ya llegó, aunque no siempre lo admite.

**Rasgos de personalidad:**
1. Carismático, fácil para las relaciones, se acuerda del nombre de todo el mundo
2. Impaciente con los detalles — quiere el titular, no el artículo
3. Toma decisiones rápido, a veces demasiado rápido, y luego pide los datos para justificarlas (en ese orden)
4. Tiene respeto genuino por los datos pero desconfianza hacia los análisis que no puede entender en dos minutos

**Cómo se comunica:** Mensajes cortos por Slack, a veces enviados desde el celular con errores de tipeo. Cuando escribe un email largo es porque algo le preocupa de verdad. Le gustan los números concretos y los titulares. No le gustan las tablas con 15 columnas ni los reportes de 8 páginas.

**Qué tipo de preguntas hace:** "¿Cuál es nuestro país más rentable ahora mismo?", "¿Por qué bajaron las ventas en Argentina?", "¿Cuánto vale nuestro cliente promedio?" Sus preguntas son grandes, a veces imprecisas, y es trabajo del analista convertirlas en algo medible.

**Email de ejemplo:**

> **De:** Marco Jiménez
> **Para:** Valentina Torres
> **Asunto:** Pregunta rápida
>
> Vale, necesito entender algo. Estuve en una reunión con inversores y me preguntaron cuánto vale un cliente nuevo en su primer año. No supe qué decirles con precisión.
>
> ¿Podemos tener ese número para el jueves? No necesito un análisis complejo, con el promedio de gasto primer año por país me alcanza.
>
> Gracias
> M

---

### Sofía Ramírez — Head of Marketing

**Edad:** 31 años. **Ubicación:** Ciudad de México.

**Historia:** Estudió comunicación, trabajó en agencias digitales en CDMX durante cuatro años, luego se pasó al lado del cliente. Llegó a ShopSphere en 2022 cuando la empresa todavía no tenía un área de marketing estructurada. Construyó el equipo desde dos personas hasta nueve. Es buena para las ideas y para la ejecución, pero reconoce que su punto débil es la medición — y eso la incomoda porque sabe que es importante.

**Rasgos de personalidad:**
1. Entusiasta con las ideas, a veces lanza campañas antes de definir cómo las va a medir
2. Aprende rápido cuando alguien le explica los datos en términos de impacto de negocio, no en términos técnicos
3. Competitiva — le importa mucho si sus números son mejores o peores que el trimestre anterior
4. Directa en sus pedidos, pero a diferencia de Valentina, sí usa signos de exclamación y emojis ocasionales en Slack (en email es más formal)

**Cómo se comunica:** Emails con algo más de contexto que Valentina, porque necesita explicar la campaña antes de pedir el análisis. Usa bullets para organizar lo que necesita. A veces manda un email de seguimiento si no recibe respuesta en el día.

**Qué tipo de preguntas hace:** "¿Cuántos clientes nuevos trajo la campaña de Black Friday?", "¿Cuál es la tasa de conversión de cada canal de adquisición?", "¿Los clientes que llegan por referidos compran más que los que llegan por paid?"

**Email de ejemplo:**

> **De:** Sofía Ramírez
> **Para:** [Estudiante]
> **CC:** Valentina Torres
> **Asunto:** Resultados campaña Día de Madres — México
>
> Hola, necesito entender qué pasó con la campaña de Día de Madres que corrimos del 5 al 10 de mayo en México.
>
> Puntualmente necesito:
> - Total de pedidos durante esos 6 días vs. los 6 días anteriores
> - Categorías de producto más vendidas en esos días
> - Porcentaje de compradores que eran clientes nuevos vs. recurrentes
>
> Estoy preparando el cierre de campaña para el equipo. ¿Lo puedes tener para el miércoles?
>
> Sofía

---

### Diego Morales — Head of Operations

**Edad:** 39 años. **Ubicación:** Bogotá.

**Historia:** Ingeniero industrial de la Nacional, lleva diez años en logística y cadena de suministro. Trabajó en retail físico antes de pasarse al e-commerce. Llegó a ShopSphere en 2021 para resolver el caos logístico que la pandemia dejó. Es el más escéptico del equipo directivo respecto al valor del análisis de datos — no porque no crea en los datos, sino porque ha visto demasiados análisis bonitos que no se traducen en acciones concretas.

**Rasgos de personalidad:**
1. Metódico y sistemático — piensa en procesos, no en historias
2. Desconfía de los análisis que no dicen claramente qué acción hay que tomar
3. Cuando algo en los datos no coincide con lo que ve en el terreno, confía en lo que ve en el terreno — hasta que le demuestran lo contrario
4. Leal y confiable — si le dices que lo tendrás para cierta hora, espera exactamente eso

**Cómo se comunica:** Emails precisos y funcionales, casi sin saludo. Va directo al punto. A veces incluye tablas o listas con datos que ya tiene, para dar contexto. Cuando está preocupado por algo, lo dice sin rodeos.

**Qué tipo de preguntas hace:** "¿Cuáles son los productos con mayor tasa de devolución este mes?", "¿Cuántos pedidos llevan más de 5 días sin entregarse?", "¿En qué regiones estamos teniendo más problemas de entrega?"

**Email de ejemplo:**

> **De:** Diego Morales
> **Para:** [Estudiante]
> **Asunto:** Devoluciones electrónica — necesito números
>
> Tenemos una situación con la categoría de electrónica en Argentina. Desde marzo estoy viendo que las devoluciones subieron, pero no tengo los números exactos para hablar con los proveedores.
>
> Necesito: tasa de devolución de electrónica en AR, los 5 productos con más devoluciones, y si es posible el motivo de devolución más frecuente.
>
> Esto no es urgente para hoy pero sí para esta semana.
>
> Diego

---

### Ana Castillo — Head of Finance

**Edad:** 42 años. **Ubicación:** Santiago de Chile.

**Historia:** Contadora pública, MBA en finanzas. Trabajó doce años en banca antes de pasarse a startups. Llegó a ShopSphere en 2023 para profesionalizar la función financiera antes de la siguiente ronda de inversión. Es la persona más técnica del equipo directivo en cuanto a números — lo cual significa que también es la más difícil de impresionar con un análisis superficial.

**Rasgos de personalidad:**
1. Precisa hasta el detalle — si un número está redondeado, pregunta la cifra exacta
2. No hace preguntas sin tener ya una hipótesis — quiere que el análisis confirme o refute algo específico
3. Cautelosa y metódica, lo opuesto a Marco — prefiere esperar un día más y tener el análisis bien hecho
4. Aprecia cuando el analista señala anomalías o inconsistencias que ella no había pedido que buscara

**Cómo se comunica:** Emails formales, bien estructurados, con contexto suficiente para que el analista entienda exactamente qué necesita y por qué. Incluye las fechas exactas, las métricas exactas y el formato en que quiere recibir el resultado.

**Qué tipo de preguntas hace:** "¿Cuál fue el revenue neto del Q1 2026, descontando devoluciones?", "¿Qué porcentaje de pagos fallidos tuvimos en cada país el mes pasado?", "¿Cuál es el margen bruto por categoría de producto?"

**Email de ejemplo:**

> **De:** Ana Castillo
> **Para:** [Estudiante]
> **CC:** Valentina Torres
> **Asunto:** Análisis de pagos fallidos — Q1 2026
>
> Estoy preparando el reporte de cierre del Q1 para la junta directiva. Necesito los datos de pagos fallidos del período enero–marzo 2026.
>
> Específicamente:
> - Número total de intentos de pago fallidos por mes
> - Tasa de fallo (fallidos / total de intentos) por país
> - Si los datos lo permiten, los métodos de pago con mayor tasa de fallo
>
> Por favor presenta los resultados en formato de tabla. Si encuentras algo que parezca anómalo en los datos, inclúyelo con una nota explicativa.
>
> Gracias,
> Ana Castillo

---

## PARTE C — TIMELINE DE SHOPSPHERE

> Los eventos de este timeline se reflejan en el dataset. Cuando los estudiantes exploren los datos, encontrarán los picos, caídas y anomalías que estos eventos produjeron.

---

**Noviembre 2024 — Black Friday récord (y el colapso del día siguiente)**
El Black Friday 2024 fue el mejor día en la historia de ShopSphere: 2.847 pedidos en 24 horas, contra 1.200 del año anterior. Sin embargo, el sistema de pagos tuvo problemas el 30 de noviembre (el día siguiente), rechazando aproximadamente 340 transacciones que en condiciones normales habrían sido aprobadas. Esos clientes no volvieron a intentarlo. El evento aparece en los datos como un pico abrupto el 29, seguido de una caída anómala el 30.

**Diciembre 2024 — Temporada navideña fuerte pero concentrada en México y Colombia**
El mes de diciembre registró el mayor volumen de ventas del año, pero con una distribución desigual: México aportó el 41% del revenue del mes, Colombia el 28%. Argentina tuvo un diciembre débil por volatilidad cambiaria. La categoría de "tecnología" representó el 52% de las ventas del mes — electrónica de consumo y accesorios de celular fueron los top sellers.

**Enero 2025 — Sobre-stock de electrónica en Argentina**
Después de un Q4 optimista, el equipo de operaciones había pedido inventario adicional de electrónica para Argentina. La demanda no se materializó. A finales de enero había sobre-stock equivalente a 45 días de venta en varias referencias. Diego tomó la decisión de hacer descuentos del 20-30% para liquidar. Esto aparece en los datos como un período de precios inusualmente bajos en la categoría de electrónica en AR, con un repunte de ventas por volumen pero caída en margen.

**Febrero 2025 — Entrada formal a Perú**
ShopSphere operaba en Perú de manera informal desde 2023. En febrero 2025 formalizaron la operación con logística propia y métodos de pago locales. Los primeros dos meses muestran números bajos y erráticos — una operación nueva encontrando su ritmo. A partir de abril los números peruanos se estabilizan.

**Marzo 2025 — Campaña de "Regreso a Clases" que no funcionó**
Sofía lanzó una campaña de regreso a clases en México, Colombia y Chile con foco en tecnología (laptops, tablets, accesorios). El resultado fue significativamente por debajo de las proyecciones: la campaña generó un 15% menos de revenue que el mes anterior, en un mes que históricamente había sido fuerte. El análisis post-mortem nunca se hizo formalmente. En los datos se ve una caída en conversiones de la categoría tecnología en esos tres países durante marzo.

**Mayo 2025 — Primer mes con más de 15.000 pedidos**
Mayo 2025 marcó el hito de los 15.000 pedidos mensuales por primera vez. El equipo lo celebró. Valentina fue la única que señaló que el costo de adquisición por cliente también había subido ese mes — el crecimiento no era tan eficiente como parecía. Nadie le hizo mucho caso en ese momento.

**Julio 2025 — Alta temporada de devoluciones**
Julio registró la tasa de devolución más alta en la historia de ShopSphere: 8.3% de los pedidos fueron devueltos, contra un promedio histórico de 4.1%. La causa principal fue un proveedor de calzado en Colombia que entregó tallas inconsistentes en un lote de 800 pares. El proveedor fue retirado del catálogo en agosto. El evento aparece como un spike muy claro en los datos de devoluciones, concentrado en la categoría "calzado" y el país Colombia.

**Septiembre 2025 — Renovación de catálogo: entrada de marcas de "hogar premium"**
ShopSphere amplió su catálogo con una nueva línea de productos de hogar premium: artículos de cocina, decoración y textiles de marcas latinoamericanas de gama media-alta. El ticket promedio de esta categoría es 3x el ticket promedio del catálogo general. Las ventas iniciales fueron lentas — la base de clientes existente no estaba acostumbrada a ese rango de precios. Sin embargo, los clientes que sí compraron mostraron una tasa de retención más alta que el promedio.

**Noviembre 2025 — Black Friday: crecimiento moderado, márgenes mejores**
El Black Friday 2025 tuvo menos volumen que el récord de 2024 (2.410 pedidos vs. 2.847), pero márgenes significativamente mejores porque el equipo de operaciones gestionó mejor los descuentos. Sofía lo consideró un fracaso; Ana lo consideró un éxito. La discusión sobre cómo medir el éxito de una campaña es uno de los debates internos que el analista de datos eventualmente tendrá que resolver con números.

**Enero–Febrero 2026 — Crecimiento estable, primer trimestre predecible**
Por primera vez en la historia de ShopSphere, el Q1 2026 fue casi exactamente lo que Valentina había proyectado: ±3% en revenue, ±5% en volumen de pedidos. Esto fue posible en parte porque Valentina implementó un modelo básico de forecasting. Sin embargo, el modelo no desagregaba por categoría ni por país, lo que dejó puntos ciegos — puntos que el nuevo analista tendrá que ayudar a cubrir.

**Marzo–Abril 2026 — Anomalía en pagos en Chile**
Entre marzo y abril de 2026 se registró un aumento del 40% en pagos fallidos en Chile, sin una causa obvia en los datos de superficie. La hipótesis de Ana es que un cambio en las condiciones de un banco emisor local afectó la aprobación de tarjetas de crédito. El equipo técnico lo investiga. Los datos muestran un patrón claro: los fallos están concentrados en un método de pago específico y en transacciones superiores a CLP 80.000.

**Mayo 2026 — El analista entra al equipo**
Valentina contrató al nuevo analista. Hay tres proyectos esperando: el análisis de retención que Marco pidió para inversores, el cierre del Q1 para Ana, y el análisis de la campaña de Día de Madres que Sofía necesita para la semana que viene.

---

*Fin del documento — Biblia de ShopSphere v1.0*
