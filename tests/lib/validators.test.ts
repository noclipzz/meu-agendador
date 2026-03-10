import { expect, test, describe } from 'vitest';
import { formatarMoeda, desformatarMoeda } from '../../lib/validators';

describe('Validators e Formatadores', () => {

    test('deve formatar 1500 corretamente para R$ 1.500,00', () => {
        const output = formatarMoeda('150000');
        // toLocaleString with currency BRL actually produces non-breaking spaces (char 160)
        expect(output.replace(/\s/g, ' ')).toBe('R$ 1.500,00');
    });

    test('deve desformatar de volta de R$ 1.500,00 para 1500 (número raw do banco)', () => {
        const raw = desformatarMoeda('R$ 1.500,00');
        expect(raw).toBe(1500);
    });

    test('deve lidar com entradas nulas ou vazias sem quebrar (zero behavior)', () => {
        const output = formatarMoeda('');
        expect(output).toBe('');

        const raw = desformatarMoeda('');
        expect(raw).toBe(0);
    });
});
