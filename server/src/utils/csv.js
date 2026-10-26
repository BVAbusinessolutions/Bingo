// CSV para Excel: UTF-8 con BOM, separador coma y celdas siempre entre comillas.
// Protege contra "inyección de fórmulas": una celda que empieza con = + - @ (o tab/CR) se antepone con '
// para que Excel la trate como texto y no ejecute nada al abrir el archivo.
const FORMULA_START = /^[=+\-@\t\r]/;
const BOM = String.fromCharCode(0xfeff); // Excel lo necesita para leer bien tildes y ñ

const cell = (value) => {
  const text = value == null ? '' : String(value);
  const safe = FORMULA_START.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (headers, rows) => `${BOM}${[headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')}\r\n`;
