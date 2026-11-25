/**
 * Zod 4 eliminó `required_error`. Este helper conserva el comportamiento de
 * Zod 3: el mensaje se usa solo cuando el campo falta (input undefined); para
 * cualquier otro error de tipo se mantiene el mensaje por defecto de Zod.
 */
export const required = (message: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? message : undefined),
});
