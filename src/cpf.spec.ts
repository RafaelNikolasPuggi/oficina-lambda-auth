import { isDocumentoValido, normalizarDocumento } from './cpf';

describe('cpf', () => {
  it('valida um CPF correto', () => {
    expect(isDocumentoValido('111.444.777-35')).toBe(true);
  });

  it('rejeita CPF com dígito verificador incorreto', () => {
    expect(isDocumentoValido('111.444.777-36')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(isDocumentoValido('111.111.111-11')).toBe(false);
  });

  it('valida um CNPJ correto', () => {
    expect(isDocumentoValido('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador incorreto', () => {
    expect(isDocumentoValido('11.222.333/0001-82')).toBe(false);
  });

  it('rejeita documento com tamanho inválido', () => {
    expect(isDocumentoValido('123')).toBe(false);
  });

  it('normalizarDocumento remove máscara', () => {
    expect(normalizarDocumento('111.444.777-35')).toBe('11144477735');
  });
});
