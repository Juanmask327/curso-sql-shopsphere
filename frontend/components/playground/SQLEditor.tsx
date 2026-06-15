"use client";

import { useCallback, useRef, useEffect } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { cn } from "@/lib/utils";
import type { SQLEditorProps } from "@/lib/types";

// ===================================================================
// ShopSphere SQL Editor Theme
// Inspirado en Catppuccin Mocha — oscuro suave, no negro puro
// ===================================================================
const SHOPSPHERE_THEME = {
  base: "vs-dark" as const,
  inherit: true,
  rules: [
    // Keywords SQL — violeta suave (color de "conocimiento")
    { token: "keyword", foreground: "cba6f7", fontStyle: "bold" },
    { token: "keyword.sql", foreground: "cba6f7", fontStyle: "bold" },
    // Strings — verde menta
    { token: "string", foreground: "a6e3a1" },
    { token: "string.sql", foreground: "a6e3a1" },
    // Números — melocotón/naranja suave (color de marca, atenuado)
    { token: "number", foreground: "fab387" },
    { token: "number.sql", foreground: "fab387" },
    // Comentarios — gris azulado
    { token: "comment", foreground: "6c7086", fontStyle: "italic" },
    { token: "comment.sql", foreground: "6c7086", fontStyle: "italic" },
    // Operadores
    { token: "operator", foreground: "89dceb" },
    // Identificadores (table names, column names)
    { token: "identifier", foreground: "cdd6f4" },
    // Funciones
    { token: "predefined", foreground: "89b4fa" },
    // Delimitadores
    { token: "delimiter", foreground: "94e2d5" },
  ],
  colors: {
    // Fondo del editor — Catppuccin Mocha base
    "editor.background": "#1e1e2e",
    // Línea actual — ligeramente más clara
    "editor.lineHighlightBackground": "#2a2a3e",
    // Borde de línea actual
    "editor.lineHighlightBorder": "#313144",
    // Selección — violeta oscuro
    "editor.selectionBackground": "#3d3d5c",
    "editor.inactiveSelectionBackground": "#2d2d47",
    // Cursor — naranja ShopSphere (el único toque de brand en el editor)
    "editorCursor.foreground": "#f97316",
    // Gutter (números de línea)
    "editorGutter.background": "#16161f",
    "editorLineNumber.foreground": "#45475a",
    "editorLineNumber.activeForeground": "#cba6f7",
    // Minimap
    "minimap.background": "#1e1e2e",
    // Scrollbar
    "scrollbarSlider.background": "#45475a66",
    "scrollbarSlider.hoverBackground": "#45475a99",
    "scrollbarSlider.activeBackground": "#6c7086",
    // Matches (Find)
    "editor.findMatchBackground": "#f9731650",
    "editor.findMatchHighlightBackground": "#f9731625",
    // Word highlight
    "editor.wordHighlightBackground": "#3d3d5c80",
    // Bracket matching
    "editorBracketMatch.background": "#cba6f720",
    "editorBracketMatch.border": "#cba6f7",
    // Indentation guides
    "editorIndentGuide.background": "#2a2a3e",
    "editorIndentGuide.activeBackground": "#45475a",
  },
};

// SQL completion items — keywords más usados en el curso
const SQL_COMPLETIONS = [
  "SELECT", "FROM", "WHERE", "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN",
  "FULL OUTER JOIN", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET",
  "INSERT INTO", "UPDATE", "DELETE FROM", "CREATE TABLE", "DROP TABLE",
  "ALTER TABLE", "AS", "ON", "AND", "OR", "NOT", "IN", "NOT IN",
  "BETWEEN", "LIKE", "IS NULL", "IS NOT NULL", "DISTINCT", "COUNT",
  "SUM", "AVG", "MAX", "MIN", "ROUND", "COALESCE", "CASE", "WHEN",
  "THEN", "ELSE", "END", "WITH", "UNION", "UNION ALL", "INTERSECT",
  "EXCEPT", "EXISTS", "ASC", "DESC", "NULL",
  // ShopSphere tables
  "customers", "orders", "products", "categories", "order_items",
  "payments", "returns", "campaigns", "inventory",
];

// ===================================================================
// Component
// ===================================================================
export function SQLEditor({
  value,
  onChange,
  onExecute,
  readOnly = false,
  placeholder = "-- Escribe tu query SQL aquí...",
  height = "280px",
}: SQLEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const handleEditorMount: OnMount = useCallback(
    (editorInstance, monacoInstance) => {
      editorRef.current = editorInstance;
      monacoRef.current = monacoInstance;

      // Register ShopSphere theme
      monacoInstance.editor.defineTheme("shopsphere-dark", SHOPSPHERE_THEME);
      monacoInstance.editor.setTheme("shopsphere-dark");

      // Keyboard shortcut: Cmd/Ctrl+Enter to execute
      editorInstance.addCommand(
        monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
        () => {
          onExecute();
        }
      );

      // Register SQL completions
      monacoInstance.languages.registerCompletionItemProvider("sql", {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = SQL_COMPLETIONS.map((keyword) => ({
            label: keyword,
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range,
            detail: "SQL",
          }));

          return { suggestions };
        },
      });

      // Focus editor on mount
      editorInstance.focus();
    },
    [onExecute]
  );

  // Sync external value changes
  useEffect(() => {
    if (editorRef.current) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== value) {
        editorRef.current.setValue(value);
      }
    }
  }, [value]);

  return (
    <div
      className={cn(
        "relative rounded-lg overflow-hidden",
        "border border-neutral-700/80",
        "shadow-inner",
        readOnly && "opacity-80"
      )}
      style={{ height }}
    >
      {/* Editor header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-neutral-700/60"
        style={{ backgroundColor: "#16161f" }}
      >
        <div className="flex items-center gap-2">
          {/* macOS-style dots — purely decorative */}
          <span className="w-3 h-3 rounded-full bg-neutral-700" />
          <span className="w-3 h-3 rounded-full bg-neutral-700" />
          <span className="w-3 h-3 rounded-full bg-neutral-700" />
          <span
            className="ml-2 text-xs font-mono font-medium"
            style={{ color: "#6c7086" }}
          >
            query.sql
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!readOnly && (
            <span
              className="text-xs font-mono"
              style={{ color: "#6c7086" }}
            >
              <kbd className="px-1.5 py-0.5 rounded text-2xs border border-neutral-600"
                style={{ backgroundColor: "#2a2a3e", color: "#cba6f7" }}>
                ⌘
              </kbd>
              {" + "}
              <kbd className="px-1.5 py-0.5 rounded text-2xs border border-neutral-600"
                style={{ backgroundColor: "#2a2a3e", color: "#cba6f7" }}>
                Enter
              </kbd>
              {" para ejecutar"}
            </span>
          )}
          {readOnly && (
            <span className="text-xs" style={{ color: "#6c7086" }}>
              Solo lectura
            </span>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <Editor
        height={`calc(${height} - 40px)`}
        defaultLanguage="sql"
        defaultValue={value || placeholder}
        onMount={handleEditorMount}
        onChange={(val) => onChange(val ?? "")}
        options={{
          theme: "shopsphere-dark",
          readOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontLigatures: true,
          lineNumbers: "on",
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          minimap: { enabled: false },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          wordWrap: "on",
          wrappingIndent: "indent",
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          autoIndent: "full",
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: false,
            strings: false,
          },
          parameterHints: { enabled: true },
          // Performance
          renderWhitespace: "selection",
          renderControlCharacters: false,
          // Accessibility
          accessibilitySupport: "auto",
          // UX
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollBeyondLastLine: false,
        }}
        loading={
          <div
            className="flex items-center justify-center h-full"
            style={{ backgroundColor: "#1e1e2e" }}
          >
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin w-6 h-6"
                style={{ color: "#f97316" }}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span
                className="text-sm font-mono"
                style={{ color: "#6c7086" }}
              >
                Cargando editor...
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
