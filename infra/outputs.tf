output "api_endpoint" {
  description = "URL pública da rota de autenticação (POST {api_endpoint}/auth/cliente)."
  value       = aws_apigatewayv2_api.auth.api_endpoint
}

output "function_name" {
  value = aws_lambda_function.auth.function_name
}
