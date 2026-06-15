import type { Exercise, QueryResult, Column, Row } from "./types";

// ===================================================================
// Mock Characters — ShopSphere team
// ===================================================================
export const CHARACTERS = {
  valentina: {
    id: "valentina",
    name: "Valentina Torres",
    role: "Head of Analytics",
    initials: "VT",
    avatarColor: "bg-violet-100 text-violet-700",
  },
  sofia: {
    id: "sofia",
    name: "Sofía Ramírez",
    role: "Head of Marketing",
    initials: "SR",
    avatarColor: "bg-pink-100 text-pink-700",
  },
  diego: {
    id: "diego",
    name: "Diego Morales",
    role: "Head of Operations",
    initials: "DM",
    avatarColor: "bg-blue-100 text-blue-700",
  },
  marco: {
    id: "marco",
    name: "Marco Jiménez",
    role: "CEO y cofundador",
    initials: "MJ",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  ana: {
    id: "ana",
    name: "Ana Castillo",
    role: "Head of Finance",
    initials: "AC",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
} as const;

// ===================================================================
// Mock Exercise — Ejercicio 1: Clientes Top por Revenue
// ===================================================================
export const MOCK_EXERCISE: Exercise = {
  id: "ex-001",
  levelId: 1,
  title: "Top 10 clientes por revenue total",
  briefing: `Reunión con Marco mañana a las 10. Me pidió algo concreto: quiere saber quiénes son nuestros mejores clientes en términos de revenue total — el top 10.

No necesita nada fancy, con el nombre del cliente, su país y el total gastado en todos sus pedidos está bien. Que esté ordenado de mayor a menor para que sea fácil de leer.

Esto tiene que estar en mi bandeja antes de las 6pm. Si hay algo raro en los datos avísame antes de mandarlo.

— Vale`,
  instructions: `Escribe una query que retorne los **10 clientes con mayor revenue total** en toda la historia de ShopSphere.

El resultado debe tener exactamente estas columnas:
- \`customer_name\` — nombre completo del cliente
- \`country\` — país del cliente
- \`total_revenue\` — suma de todos sus pedidos (en USD)

Ordenado por \`total_revenue\` de mayor a menor.

**Tablas disponibles:**
- \`customers\` — clientes registrados (\`id\`, \`name\`, \`email\`, \`country\`)
- \`orders\` — pedidos (\`id\`, \`customer_id\`, \`total_amount\`, \`status\`, \`created_at\`)

**Nota:** Considera solo pedidos con \`status = 'completed'\`.`,
  difficulty: "easy",
  xpReward: 50,
  hints: [
    {
      level: 0,
      levelLabel: "Conceptual",
      xpCost: 5,
      content:
        "Para calcular el revenue total por cliente necesitas combinar datos de dos tablas. Piensa en cómo relacionar `customers` con `orders` — ¿qué tienen en común?",
    },
    {
      level: 1,
      levelLabel: "Sintáctico",
      xpCost: 5,
      content:
        "Usa `JOIN` para combinar las tablas por `customer_id`. Luego `GROUP BY` para agrupar los pedidos de cada cliente. `SUM(total_amount)` te da el revenue total. `ORDER BY ... DESC` para ordenar. `LIMIT 10` para quedarte con los primeros 10.",
    },
    {
      level: 2,
      levelLabel: "Casi la solución",
      xpCost: 5,
      content:
        "```sql\nSELECT \n  c.name AS customer_name,\n  c.country,\n  SUM(o.total_amount) AS total_revenue\nFROM customers c\nJOIN orders o ON o.customer_id = c.id\nWHERE o.status = 'completed'\nGROUP BY c.id, c.name, c.country\nORDER BY total_revenue DESC\nLIMIT 10;\n```",
    },
  ],
  character: CHARACTERS.valentina,
  initialQuery: `-- Escribe tu query aquí
-- Recuerda: solo pedidos con status = 'completed'

SELECT

FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE
GROUP BY
ORDER BY
LIMIT 10;`,
  validationMode: "exact_ordered",
  orderIndex: 1,
};

// ===================================================================
// Mock Query Results — Simulated WASM output
// ===================================================================

const MOCK_COLUMNS: Column[] = [
  { name: "customer_name", type: "TEXT" },
  { name: "country", type: "TEXT" },
  { name: "total_revenue", type: "NUMBER" },
];

const MOCK_ROWS: Row[] = [
  { customer_name: "Empresa Tech S.A.S.", country: "Colombia", total_revenue: 48750.5 },
  { customer_name: "Distribuidora MX Norte", country: "México", total_revenue: 43200.0 },
  { customer_name: "Importaciones Santiago", country: "Chile", total_revenue: 39850.75 },
  { customer_name: "Comercial Andina Ltda.", country: "Colombia", total_revenue: 35120.3 },
  { customer_name: "Tech Solutions Perú", country: "Perú", total_revenue: 31450.0 },
  { customer_name: "MegaStore Buenos Aires", country: "Argentina", total_revenue: 28900.25 },
  { customer_name: "Distribuidora Zona Sur", country: "Chile", total_revenue: 26750.8 },
  { customer_name: "Grupo Comercial MTY", country: "México", total_revenue: 24300.0 },
  { customer_name: "Electrónica del Pacifico", country: "Perú", total_revenue: 22150.5 },
  { customer_name: "Digital Store Colombia", country: "Colombia", total_revenue: 19800.0 },
];

export const MOCK_QUERY_RESULT: QueryResult = {
  columns: MOCK_COLUMNS,
  rows: MOCK_ROWS,
  totalRows: 10,
  executionMs: 12,
};

// Mock result for an empty state
export const MOCK_EMPTY_RESULT: QueryResult = {
  columns: [{ name: "resultado", type: "TEXT" }],
  rows: [],
  totalRows: 0,
  executionMs: 3,
};

// ===================================================================
// Mock User Progress
// ===================================================================
export const MOCK_USER_PROGRESS = {
  exerciseId: "ex-001",
  status: "in_progress" as const,
  attemptsCount: 0,
  hintsUsed: 0,
  xpEarned: 0,
};

export const MOCK_USER_LEVEL = {
  currentLevel: 1,
  xpTotal: 150,
  xpForCurrentLevel: 100,
  xpForNextLevel: 250,
};
