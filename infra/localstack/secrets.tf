# Generated credentials stored in LocalStack Secrets Manager, which is the source
# the Kubernetes secret is read from. Terraform state holds them too: keep it local.

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

resource "aws_secretsmanager_secret" "app" {
  name                    = "product-manager/app"
  description             = "Runtime secrets for the product manager backend."
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    jwt_secret        = random_password.jwt.result
    postgres_password = random_password.postgres.result
    admin_username    = var.admin_username
    admin_password    = random_password.admin.result
  })
}

data "aws_secretsmanager_secret_version" "app" {
  secret_id  = aws_secretsmanager_secret.app.id
  version_id = aws_secretsmanager_secret_version.app.version_id
}

locals {
  app_secrets = jsondecode(data.aws_secretsmanager_secret_version.app.secret_string)
}
