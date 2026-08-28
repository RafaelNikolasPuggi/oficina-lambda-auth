# Lê o que os outros repositórios publicaram no SSM Parameter Store — é o
# único acoplamento entre os 4 repositórios Terraform (ver ADR 0006 no repo
# principal). Se algum desses parâmetros não existir ainda, aplique primeiro
# o oficina-infra-k8s e o oficina-infra-db.

data "aws_ssm_parameter" "vpc_id" {
  name = var.ssm_vpc_id_param
}

data "aws_ssm_parameter" "private_subnet_ids" {
  name = var.ssm_private_subnet_ids_param
}

data "aws_ssm_parameter" "db_endpoint" {
  name = var.ssm_db_endpoint_param
}

data "aws_ssm_parameter" "db_username" {
  name            = var.ssm_db_username_param
  with_decryption = true
}

data "aws_ssm_parameter" "db_password" {
  name            = var.ssm_db_password_param
  with_decryption = true
}

data "aws_ssm_parameter" "db_name" {
  name = var.ssm_db_name_param
}

locals {
  private_subnet_ids = split(",", data.aws_ssm_parameter.private_subnet_ids.value)
}

# Segredo do JWT compartilhado com o app principal — gerado aqui (é este repo
# que "faz login" do cliente) e publicado no SSM para o deploy do app ler.
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/oficina/jwt_secret"
  type  = "SecureString"
  value = random_password.jwt_secret.result
}

resource "aws_security_group" "lambda" {
  name_prefix = "${var.function_name}-"
  description = "Egress da Lambda de autenticacao para o RDS dentro da VPC"
  vpc_id      = data.aws_ssm_parameter.vpc_id.value

  egress {
    description = "Todo trafego de saida (necessario para alcancar o RDS e a internet via NAT, se houver)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "${var.function_name}-exec"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "vpc_access" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Empacotado por `npm run package` (gera ../function.zip com dist/ + node_modules
# de produção) — ver README.md e o workflow de CI/CD.
resource "aws_lambda_function" "auth" {
  function_name = var.function_name
  role          = aws_iam_role.lambda_exec.arn
  handler       = "handler.handler"
  runtime       = "nodejs20.x"
  timeout       = 10
  memory_size   = 256

  filename         = "${path.module}/../function.zip"
  source_code_hash = filebase64sha256("${path.module}/../function.zip")

  vpc_config {
    subnet_ids         = local.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      DB_HOST        = data.aws_ssm_parameter.db_endpoint.value
      DB_PORT        = "5432"
      DB_USERNAME    = data.aws_ssm_parameter.db_username.value
      DB_PASSWORD    = data.aws_ssm_parameter.db_password.value
      DB_DATABASE    = data.aws_ssm_parameter.db_name.value
      DB_SSL         = "true"
      JWT_SECRET     = random_password.jwt_secret.result
      JWT_EXPIRES_IN = var.jwt_expires_in
    }
  }
}

resource "aws_apigatewayv2_api" "auth" {
  name          = "${var.function_name}-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id                 = aws_apigatewayv2_api.auth.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "login" {
  api_id    = aws_apigatewayv2_api.auth.id
  route_key = "POST /auth/cliente"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.auth.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.auth.execution_arn}/*/*"
}
