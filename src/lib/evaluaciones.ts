// Reparto ORIENTATIVO de los temas (RA) de cada módulo con test por evaluación, para
// los atajos del diagnóstico («1.ª evaluación», «2.ª evaluación»…). Cada centro puede
// repartirlo distinto: el alumno siempre puede ajustar tema a tema. Módulos de 1.º:
// tres evaluaciones; de 2.º (curso más corto por las prácticas en empresa): dos.
export const EVALUACIONES: Record<string, string[][]> = {
  "0485": [["RA1", "RA2", "RA3"], ["RA4", "RA5"], ["RA6", "RA7"]],
  "0484": [["RA1", "RA2", "RA3"], ["RA4", "RA5"], ["RA6", "RA7"]],
  "0373": [["RA1", "RA2"], ["RA3", "RA4", "RA5"], ["RA6", "RA7"]],
  "0225": [["RA1", "RA2"], ["RA3", "RA4"], ["RA5", "RA6"]],
  "0370": [["RA1", "RA2", "RA3"], ["RA4", "RA5"], ["RA6", "RA7"]],
  "0613": [["RA1", "RA2", "RA3", "RA4", "RA5"], ["RA6", "RA7", "RA8", "RA9"]],
  "0486": [["RA1", "RA2", "RA3"], ["RA4", "RA5", "RA6"]],
};
