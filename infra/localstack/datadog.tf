# Datadog Agent + Cluster Agent for the local cluster, and the wiring that
# connects the app to it. Data is sent to Datadog SaaS (var.datadog_site).
# The API key secret is created by hand so it never lands in Terraform state.

locals {
  backend_version = element(split(":", var.backend_image), length(split(":", var.backend_image)) - 1)
  dd_pg_secret    = "datadog-postgres"
}

resource "helm_release" "datadog" {
  name       = "datadog"
  namespace  = var.datadog_namespace
  repository = "https://helm.datadoghq.com"
  chart      = "datadog"
  version    = "3.270.1"

  # First install pulls several agent images; the default 5 minutes is not enough.
  timeout = 900

  values = [yamlencode({
    datadog = {
      site                 = var.datadog_site
      apiKeyExistingSecret = var.datadog_api_key_secret
      clusterName          = var.kube_context
      tags                 = ["env:${var.environment}"]

      # Docker Desktop's kubelet serves a self-signed certificate.
      kubelet = { tlsVerify = false }

      # Collect logs only from pods that opt in with ad.datadoghq.com/<container>.logs.
      logs = { enabled = true, containerCollectAll = false }
      apm  = { socketEnabled = true }

      # Lets check configs use ENC[k8s_secret@ns/name/key], scoped to one secret.
      secretBackend = {
        command                 = "/readsecret_multiple_providers.sh"
        enableGlobalPermissions = false
        roles = [{
          namespace = var.namespace
          secrets   = [local.dd_pg_secret]
        }]
      }
    }

    clusterAgent = {
      enabled = true
      admissionController = {
        enabled          = true
        mutateUnlabelled = false
      }
    }
  })]
}

# --- Postgres monitoring user ----------------------------------------------

resource "random_password" "datadog_postgres" {
  length  = 32
  special = false
}

resource "kubernetes_secret_v1" "datadog_postgres" {
  metadata {
    name      = local.dd_pg_secret
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }
  data = {
    password = random_password.datadog_postgres.result
  }
}

# Idempotently creates the read-only `datadog` role with pg_monitor.
resource "kubernetes_job_v1" "datadog_postgres_user" {
  metadata {
    name      = "datadog-postgres-user-${substr(sha256(random_password.datadog_postgres.result), 0, 8)}"
    namespace = kubernetes_namespace_v1.app.metadata[0].name
  }

  spec {
    backoff_limit = 6
    template {
      metadata {}
      spec {
        restart_policy = "OnFailure"
        container {
          name  = "psql"
          image = "postgres:16-alpine"
          command = ["sh", "-c", <<-EOT
            psql -v ON_ERROR_STOP=1 -v ddpw="$DD_PASSWORD" <<'SQL'
            SELECT 'CREATE ROLE datadog LOGIN'
            WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'datadog') \gexec
            ALTER ROLE datadog WITH LOGIN PASSWORD :'ddpw';
            GRANT pg_monitor TO datadog;
            SQL
          EOT
          ]

          env {
            name  = "PGHOST"
            value = kubernetes_service_v1.postgres.metadata[0].name
          }
          env {
            name  = "PGDATABASE"
            value = var.postgres_db
          }
          env {
            name  = "PGUSER"
            value = var.postgres_user
          }
          env {
            name = "PGPASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.app.metadata[0].name
                key  = "DB_PASSWORD"
              }
            }
          }
          env {
            name = "DD_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret_v1.datadog_postgres.metadata[0].name
                key  = "password"
              }
            }
          }
        }
      }
    }
  }

  wait_for_completion = true
  timeouts {
    create = "5m"
  }

  depends_on = [kubernetes_stateful_set_v1.postgres]
}
