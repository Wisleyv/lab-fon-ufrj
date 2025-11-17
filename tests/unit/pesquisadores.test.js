/**
 * Unit Tests for PesquisadoresSection
 * Tests alphabetical sorting and rendering logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PesquisadoresSection } from '../../src/js/sections/pesquisadores.js';

describe('PesquisadoresSection', () => {
  let section;
  let container;

  beforeEach(() => {
    // Create a container element for testing
    container = document.createElement('div');
    container.id = 'test-container';
    document.body.appendChild(container);

    section = new PesquisadoresSection('test-container');
  });

  describe('Alphabetical Sorting', () => {
    it('should sort members alphabetically within each category', async () => {
      const testData = [
        { nome: 'Zé Silva', categoria: 'docentes', instituicao: 'UFRJ' },
        { nome: 'Ana Costa', categoria: 'docentes', instituicao: 'UFRJ' },
        { nome: 'Maria Santos', categoria: 'docentes', instituicao: 'UFRJ' }
      ];

      await section.render(testData);

      const cards = container.querySelectorAll('.membro-nome');
      const names = Array.from(cards).map(card => card.textContent);

      expect(names).toEqual(['Ana Costa', 'Maria Santos', 'Zé Silva']);
    });

    it('should handle Portuguese special characters correctly', async () => {
      const testData = [
        { nome: 'Ângela Ferreira', categoria: 'egressos', instituicao: 'UFPB' },
        { nome: 'Andrea Silva', categoria: 'egressos', instituicao: 'UFPB' },
        { nome: 'Álvaro Costa', categoria: 'egressos', instituicao: 'UFPB' },
        { nome: 'Ana Maria', categoria: 'egressos', instituicao: 'UFPB' }
      ];

      await section.render(testData);

      const cards = container.querySelectorAll('.membro-nome');
      const names = Array.from(cards).map(card => card.textContent);

      // localeCompare with sensitivity: 'base' treats á/a/â as equal base
      expect(names).toEqual(['Álvaro Costa', 'Ana Maria', 'Andrea Silva', 'Ângela Ferreira']);
    });

    it('should sort case-insensitively', async () => {
      const testData = [
        { nome: 'joão PEREIRA', categoria: 'graduacao', instituicao: 'UFRJ' },
        { nome: 'José Santos', categoria: 'graduacao', instituicao: 'UFRJ' },
        { nome: 'JULIA Costa', categoria: 'graduacao', instituicao: 'UFRJ' }
      ];

      await section.render(testData);

      const cards = container.querySelectorAll('.membro-nome');
      const names = Array.from(cards).map(card => card.textContent);

      expect(names).toEqual(['joão PEREIRA', 'José Santos', 'JULIA Costa']);
    });

    it('should maintain separate alphabetical order per category', async () => {
      const testData = [
        { nome: 'Zé Silva', categoria: 'docentes', instituicao: 'UFRJ' },
        { nome: 'Ana Costa', categoria: 'docentes', instituicao: 'UFRJ' },
        { nome: 'Pedro Lima', categoria: 'pos_graduacao', instituicao: 'UFPB' },
        { nome: 'Bruno Alves', categoria: 'pos_graduacao', instituicao: 'UFPB' }
      ];

      await section.render(testData);

      const docentesSection = container.querySelector('[aria-labelledby="categoria-docentes"]');
      const docentesNames = Array.from(docentesSection.querySelectorAll('.membro-nome'))
        .map(card => card.textContent);

      const posGradSection = container.querySelector('[aria-labelledby="categoria-pos_graduacao"]');
      const posGradNames = Array.from(posGradSection.querySelectorAll('.membro-nome'))
        .map(card => card.textContent);

      expect(docentesNames).toEqual(['Ana Costa', 'Zé Silva']);
      expect(posGradNames).toEqual(['Bruno Alves', 'Pedro Lima']);
    });

    it('should handle members with missing names gracefully', async () => {
      const testData = [
        { nome: 'Maria Silva', categoria: 'egressos', instituicao: 'UFRJ' },
        { nome: '', categoria: 'egressos', instituicao: 'UFRJ' },
        { nome: 'Ana Costa', categoria: 'egressos', instituicao: 'UFRJ' }
      ];

      await section.render(testData);

      const cards = container.querySelectorAll('.membro-nome');
      expect(cards.length).toBe(3); // All cards should render
    });
  });

  describe('Data Integrity', () => {
    it('should not mutate the original data array', async () => {
      const testData = [
        { nome: 'Zé Silva', categoria: 'docentes', instituicao: 'UFRJ' },
        { nome: 'Ana Costa', categoria: 'docentes', instituicao: 'UFRJ' }
      ];

      const originalOrder = testData.map(m => m.nome);
      
      await section.render(testData);

      const currentOrder = testData.map(m => m.nome);
      expect(currentOrder).toEqual(originalOrder);
    });
  });
});
