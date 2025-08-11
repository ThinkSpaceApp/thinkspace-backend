export interface NivelXp {
  nivel: number;
  nome: string;
  minXp: number;
  maxXp: number | null; 
}

export const NIVEIS_XP: NivelXp[] = [
  { nivel: 1, nome: "Iniciante", minXp: 0, maxXp: 99 },
  { nivel: 2, nome: "Aprendiz", minXp: 100, maxXp: 249 },
  { nivel: 3, nome: "Júnior", minXp: 250, maxXp: 499 },
  { nivel: 4, nome: "Avançado", minXp: 500, maxXp: 899 },
  { nivel: 5, nome: "Especialista", minXp: 900, maxXp: 1499 },
  { nivel: 6, nome: "Mentor", minXp: 1500, maxXp: 2499 },
  { nivel: 7, nome: "Elite", minXp: 2500, maxXp: null },
];

export function getNivelInfo(xp: number): NivelXp {
  for (const nivel of NIVEIS_XP) {
    if (nivel.maxXp === null || xp <= nivel.maxXp) {
      if (xp >= nivel.minXp) return nivel;
    }
  }
  return NIVEIS_XP[0];
}

export function getProgressoNivel(xp: number): { nivel: NivelXp; progresso: number } {
  const nivel = getNivelInfo(xp);
  let progresso = 100;
  if (nivel.maxXp !== null) {
    progresso = ((xp - nivel.minXp) / (nivel.maxXp - nivel.minXp)) * 100;
    if (progresso < 0) progresso = 0;
    if (progresso > 100) progresso = 100;
  }
  return { nivel, progresso };
}
