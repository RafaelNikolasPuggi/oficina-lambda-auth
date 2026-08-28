import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import * as db from './db';
import { handler } from './handler';

jest.mock('./db');

const buscarClientePorDocumentoMock = db.buscarClientePorDocumento as jest.MockedFunction<
  typeof db.buscarClientePorDocumento
>;

function criarEvento(body: unknown): APIGatewayProxyEventV2 {
  return { body: JSON.stringify(body) } as APIGatewayProxyEventV2;
}

describe('handler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '30m' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('retorna 400 quando o documento é inválido', async () => {
    const resultado = await handler(criarEvento({ documento: '123' }));
    expect(resultado.statusCode).toBe(400);
    expect(buscarClientePorDocumentoMock).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o corpo não é um JSON válido', async () => {
    const evento = { body: '{invalido' } as APIGatewayProxyEventV2;
    const resultado = await handler(evento);
    expect(resultado.statusCode).toBe(400);
  });

  it('retorna 404 quando o cliente não é encontrado', async () => {
    buscarClientePorDocumentoMock.mockResolvedValueOnce(null);

    const resultado = await handler(criarEvento({ documento: '111.444.777-35' }));

    expect(resultado.statusCode).toBe(404);
    expect(buscarClientePorDocumentoMock).toHaveBeenCalledWith('11144477735');
  });

  it('retorna 200 com um JWT válido quando o cliente existe', async () => {
    buscarClientePorDocumentoMock.mockResolvedValueOnce({
      id: 'cliente-1',
      nome: 'Maria da Silva',
      documento: '11144477735',
      email: 'maria@email.com',
    });

    const resultado = await handler(criarEvento({ documento: '111.444.777-35' }));

    expect(resultado.statusCode).toBe(200);
    const corpo = JSON.parse(resultado.body as string) as { accessToken: string };
    const payload = jwt.verify(corpo.accessToken, 'test-secret') as jwt.JwtPayload;
    expect(payload.sub).toBe('cliente-1');
    expect(payload.tipo).toBe('cliente');
  });

  it('retorna 500 quando JWT_SECRET não está configurado', async () => {
    delete process.env.JWT_SECRET;
    buscarClientePorDocumentoMock.mockResolvedValueOnce({
      id: 'cliente-1',
      nome: 'Maria da Silva',
      documento: '11144477735',
      email: 'maria@email.com',
    });

    const resultado = await handler(criarEvento({ documento: '111.444.777-35' }));

    expect(resultado.statusCode).toBe(500);
  });
});
