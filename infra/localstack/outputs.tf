output "app_url" {
  description = "Open after: kubectl -n product-manager port-forward svc/edge 4200:80"
  value       = var.app_origin
}

output "frontend_bucket" {
  value = aws_s3_bucket.frontend.bucket
}

output "frontend_website_host" {
  value = local.website_host
}

output "app_secret_arn" {
  value = aws_secretsmanager_secret.app.arn
}

output "admin_username" {
  value = var.admin_username
}

output "admin_password" {
  value     = random_password.admin.result
  sensitive = true
}
