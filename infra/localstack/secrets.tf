# Generated credentials stored in LocalStack Secrets Manager. Terraform state holds
# them too: keep it local.
#
# - product-manager/postgres: the database password (plain SecretString). The backend
#   reads it directly from Secrets Manager; Postgres itself gets it through a
#   Kubernetes secret, since the server can only take it from an env var.
# - product-manager/app: the other backend secrets, mirrored into a Kubernetes secret.

resource "random_password" "jwt" {
  length  = 64
  special = false
}

resource "random_password" "postgres" {
  length  = 32
  special = false
}

resource "random_password" "admin" {
  length  = 24
  special = false
}

resource "aws_secretsmanager_secret" "postgres" {
  name                    = "product-manager/postgres"
  description             = "Password of the product manager Postgres user."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "postgres" {
  secret_id     = aws_secretsmanager_secret.postgres.id
  secret_string = random_password.postgres.result
}

data "aws_secretsmanager_secret_version" "postgres" {
  secret_id  = aws_secretsmanager_secret.postgres.id
  version_id = aws_secretsmanager_secret_version.postgres.version_id
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "product-manager/app"
  description             = "Runtime secrets for the product manager backend."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    jwt_secret     = random_password.jwt.result
    admin_username = var.admin_username
    admin_password = random_password.admin.result
  })
}

data "aws_secretsmanager_secret_version" "app" {
  secret_id  = aws_secretsmanager_secret.app.id
  version_id = aws_secretsmanager_secret_version.app.version_id
}

locals {
  app_secrets       = jsondecode(data.aws_secretsmanager_secret_version.app.secret_string)
  postgres_password = data.aws_secretsmanager_secret_version.postgres.secret_string
}
