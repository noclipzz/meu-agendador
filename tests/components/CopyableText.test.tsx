import { expect, test, describe, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopyableText } from '../../components/ui/CopyableText';

describe('CopyableText Component', () => {

    test('renderiza o texto corretamente', () => {
        render(<CopyableText text="12345678" />);
        expect(screen.getByText('12345678')).toBeDefined();
        expect(screen.getByTestId('copy-icon')).toBeDefined();
    });

    test('copia o texto e mostra o ícone de check', async () => {
        // mockar a API nativa do navegador para os testes não crasharem no terminal NodeJS
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });

        render(<CopyableText text="MEU-TOKEN" />);

        const button = screen.getByTestId('copy-button');
        fireEvent.click(button);

        // O Mock de writeText deve ter sido chamado com "MEU-TOKEN"
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('MEU-TOKEN');

        // O icone deve ter mudado para CHECK
        expect(screen.getByTestId('check-icon')).toBeDefined();
    });

});
