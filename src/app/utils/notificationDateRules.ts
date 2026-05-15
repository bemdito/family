import { Pessoa } from '../types';
import { parseCompleteFamilyDate } from './familyDates';
import { isPersonDeceased } from './personFields';

export type SpecialDateCandidateType = 'aniversario' | 'memoria_falecimento';

export interface SpecialDateCandidate {
  type: SpecialDateCandidateType;
  pessoa: Pessoa;
  sourceDate: Date;
  occurrenceDate: string;
  age?: number;
  yearsSinceDeath?: number;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameDayAndMonth(sourceDate: Date, referenceDate: Date) {
  return sourceDate.getDate() === referenceDate.getDate() && sourceDate.getMonth() === referenceDate.getMonth();
}

export function getSpecialDateCandidatesForPeople(
  pessoas: Pessoa[],
  referenceDate = new Date()
): SpecialDateCandidate[] {
  const occurrenceDate = toDateKey(referenceDate);
  const candidates: SpecialDateCandidate[] = [];

  for (const pessoa of pessoas) {
    const birthDate = parseCompleteFamilyDate(pessoa.data_nascimento);
    if (birthDate && !isPersonDeceased(pessoa) && isSameDayAndMonth(birthDate, referenceDate)) {
      candidates.push({
        type: 'aniversario',
        pessoa,
        sourceDate: birthDate,
        occurrenceDate,
        age: referenceDate.getFullYear() - birthDate.getFullYear(),
      });
    }

    const deathDate = parseCompleteFamilyDate(pessoa.data_falecimento);
    if (deathDate && isPersonDeceased(pessoa) && isSameDayAndMonth(deathDate, referenceDate)) {
      candidates.push({
        type: 'memoria_falecimento',
        pessoa,
        sourceDate: deathDate,
        occurrenceDate,
        yearsSinceDeath: referenceDate.getFullYear() - deathDate.getFullYear(),
      });
    }
  }

  return candidates;
}
