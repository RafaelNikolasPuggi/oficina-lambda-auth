/**
 * Validação de CPF/CNPJ (dígito verificador). Duplicada deliberadamente do
 * `CpfCnpj` value object do repositório principal (`oficina-tech-challenge`):
 * este é um repositório independente, sem publicação de pacote npm
 * compartilhado nesta fase do desafio.
 */

function apenasDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

function isCpfValido(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf[i], 10) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(cpf[9], 10)) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf[i], 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === parseInt(cpf[10], 10);
}

function isCnpjValido(cnpj: string): boolean {
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base: string): number => {
    let soma = 0;
    let peso = base.length - 7;
    for (let i = 0; i < base.length; i++) {
      soma += parseInt(base[i], 10) * peso;
      peso = peso === 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base12 = cnpj.substring(0, 12);
  const digito1 = calcularDigito(base12);
  if (digito1 !== parseInt(cnpj[12], 10)) return false;

  const digito2 = calcularDigito(base12 + digito1);
  return digito2 === parseInt(cnpj[13], 10);
}

export function normalizarDocumento(valor: string): string {
  return apenasDigitos(valor);
}

export function isDocumentoValido(valor: string): boolean {
  const documento = normalizarDocumento(valor);
  if (documento.length === 11) return isCpfValido(documento);
  if (documento.length === 14) return isCnpjValido(documento);
  return false;
}
