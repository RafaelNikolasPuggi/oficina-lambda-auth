variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "function_name" {
  type    = string
  default = "oficina-auth-cliente"
}

variable "jwt_expires_in" {
  description = "Duração do token emitido para o cliente (formato aceito pela lib jsonwebtoken)."
  type        = string
  default     = "30m"
}

# --- Parâmetros publicados por OUTROS repositórios via SSM Parameter Store ---
# Ver docs/adr/0006-ssm-para-integracao-entre-repos.md no repo principal.

variable "ssm_vpc_id_param" {
  type    = string
  default = "/oficina/vpc_id"
}

variable "ssm_private_subnet_ids_param" {
  description = "SSM StringList com os ids das subnets privadas, publicado pelo oficina-infra-k8s."
  type        = string
  default     = "/oficina/private_subnet_ids"
}

variable "ssm_db_endpoint_param" {
  type    = string
  default = "/oficina/db_endpoint"
}

variable "ssm_db_username_param" {
  type    = string
  default = "/oficina/db_username"
}

variable "ssm_db_password_param" {
  type    = string
  default = "/oficina/db_password"
}

variable "ssm_db_name_param" {
  type    = string
  default = "/oficina/db_name"
}
