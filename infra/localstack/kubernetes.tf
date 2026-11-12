# Workloads LocalStack community cannot host (ECS, RDS, CloudFront are Pro-only)
# run in the local cluster instead.

resource "kubernetes_namespace_v1" "app" {
  metadata {
    name = var.namespace
  }
}

resource "kubernetes_secret_v1" "app" {
  metadata {
    name      = "product-manager"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  data = {
    APP_JWT_SECRET               = local.app_secrets.jwt_secret
    DB_PASSWORD                  = local.app_secrets.postgres_password
    APP_BOOTSTRAP_ADMIN_USERNAME = local.app_secrets.admin_username
    APP_BOOTSTRAP_ADMIN_PASSWORD = local.app_secrets.admin_password
  }
}

# --- Postgres ---------------------------------------------------------------

resource "kubernetes_service_v1" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    selector = { app = "postgres" }
    port {
      port        = 5432
      target_port = 5432
    }
  }
}

resource "kubernetes_stateful_set_v1" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    service_name = kubernetes_service_v1.postgres.metadata[0].name
    replicas     = 1

    selector {
      match_labels = { app = "postgres" }
    }

    template {
      metadata {
        labels = { app = "postgres" }
      }
      spec {
        container {
          name  = "postgres"
          image = "postgres:16-alpine"

          env {
            name  = "POSTGRES_DB"
            value = var.postgres_db
          }
          env {
            name  = "POSTGRES_USER"
            value = var.postgres_user
          }
          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.app.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }
          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          port {
            container_port = 5432
          }

          readiness_probe {
            exec {
              command = ["sh", "-c", "pg_isready --username=\"$POSTGRES_USER\" --dbname=\"$POSTGRES_DB\""]
            }
            period_seconds = 5
          }

          volume_mount {
            name       = "data"
            mount_path = "/var/lib/postgresql/data"
          }
        }
      }
    }

    volume_claim_template {
      metadata {
        name = "data"
      }
      spec {
        access_modes = ["ReadWriteOnce"]
        resources {
          requests = { storage = "1Gi" }
        }
      }
    }
  }
}

# --- Backend ----------------------------------------------------------------

resource "kubernetes_deployment_v1" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    replicas = 1

    selector {
      match_labels = { app = "backend" }
    }

    template {
      metadata {
        labels = { app = "backend" }
      }
      spec {
        container {
          name              = "backend"
          image             = var.backend_image
          image_pull_policy = "IfNotPresent"

          env_from {
            secret_ref {
              name = kubernetes_secret_v1.app.metadata[0].name
            }
          }
          env {
            name  = "SPRING_PROFILES_ACTIVE"
            value = "prod"
          }
          env {
            name  = "DB_URL"
            value = "jdbc:postgresql://${kubernetes_service_v1.postgres.metadata[0].name}:5432/${var.postgres_db}"
          }
          env {
            name  = "DB_USERNAME"
            value = var.postgres_user
          }
          env {
            name  = "APP_CORS_ALLOWED_ORIGINS"
            value = var.app_origin
          }
          env {
            name  = "APP_WEBAUTHN_RP_ID"
            value = var.webauthn_rp_id
          }
          env {
            name  = "APP_WEBAUTHN_ORIGINS"
            value = var.app_origin
          }

          port {
            container_port = 8080
          }

          startup_probe {
            http_get {
              path = "/actuator/health"
              port = 8080
            }
            period_seconds    = 5
            failure_threshold = 36
          }
          readiness_probe {
            http_get {
              path = "/actuator/health"
              port = 8080
            }
            period_seconds = 10
          }

          resources {
            requests = { cpu = "250m", memory = "512Mi" }
            limits   = { memory = "1Gi" }
          }
        }
      }
    }
  }

  depends_on = [kubernetes_stateful_set_v1.postgres]
}

resource "kubernetes_service_v1" "backend" {
  metadata {
    name      = "backend"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    selector = { app = "backend" }
    port {
      port        = 8080
      target_port = 8080
    }
  }
}

# --- Edge: same-origin entry point (stands in for CloudFront) -----------------

resource "kubernetes_config_map_v1" "edge" {
  metadata {
    name      = "edge"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  data = {
    "default.conf" = templatefile("${path.module}/templates/edge.conf.tftpl", {
      backend      = "http://${kubernetes_service_v1.backend.metadata[0].name}:8080"
      s3_upstream  = "http://${var.localstack_cluster_host}"
      website_host = local.website_host
    })
  }
}

resource "kubernetes_deployment_v1" "edge" {
  metadata {
    name      = "edge"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    replicas = 1

    selector {
      match_labels = { app = "edge" }
    }

    template {
      metadata {
        labels = { app = "edge" }
        annotations = {
          # Roll the pod when the nginx config changes.
          "checksum/config" = sha256(kubernetes_config_map_v1.edge.data["default.conf"])
        }
      }
      spec {
        container {
          name  = "nginx"
          image = "nginxinc/nginx-unprivileged:1.27-alpine"

          port {
            container_port = 8080
          }

          readiness_probe {
            http_get {
              path = "/"
              port = 8080
            }
            period_seconds = 10
          }

          volume_mount {
            name       = "config"
            mount_path = "/etc/nginx/conf.d"
          }
        }
        volume {
          name = "config"
          config_map {
            name = kubernetes_config_map_v1.edge.metadata[0].name
          }
        }
      }
    }
  }

  depends_on = [aws_s3_object.frontend, aws_s3_bucket_website_configuration.frontend]
}

resource "kubernetes_service_v1" "edge" {
  metadata {
    name      = "edge"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  spec {
    selector = { app = "edge" }
    port {
      port        = 80
      target_port = 8080
    }
  }
}
