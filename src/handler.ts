import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { isDocumentoValido, normalizarDocumento } from './cpf';
import { buscarClientePorDocumento } from './db';

interface LoginClienteBody {
  documento?: string;
}

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/**
 * Function Serverless de autenticação de clientes por CPF/CNPJ (Fase 3):
 * valida o documento, consulta a existência do cliente na base e devolve um
 * JWT de curta duração para consumo das APIs protegidas do app principal.
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyStructuredResultV2> {
  let body: LoginClienteBody;
  try {
    body = event.body ? (JSON.parse(event.body) as LoginClienteBody) : {};
  } catch {
    return jsonResponse(400, { message: 'JSON inválido no corpo da requisição' });
  }

  const documentoInformado = body.documento;
  if (!documentoInformado || !isDocumentoValido(documentoInformado)) {
    return jsonResponse(400, { message: 'CPF/CNPJ inválido' });
  }

  const documento = normalizarDocumento(documentoInformado);

  const cliente = await buscarClientePorDocumento(documento);
  if (!cliente) {
    return jsonResponse(404, { message: 'Cliente não encontrado' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Falha de configuração do ambiente, não do cliente — não deve vazar detalhe.
     
    console.error('JWT_SECRET não configurado');
    return jsonResponse(500, { message: 'Erro interno' });
  }

  const expiresIn = process.env.JWT_EXPIRES_IN ?? '30m';
  const accessToken = jwt.sign({ sub: cliente.id, documento: cliente.documento, tipo: 'cliente' }, secret, {
    expiresIn,
  } as jwt.SignOptions);

  return jsonResponse(200, { accessToken, expiresIn });
}
