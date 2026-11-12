variable "localstack_endpoint" {
  description = "LocalStack edge URL as seen from the machine running Terraform (port-forwarded)."
  type        = string
  default     = "http://localhost:4566"
}

variable "localstack_cluster_host" {
  description = "LocalStack service host and port as seen from inside the cluster."
  type        = string
  default     = "localstack.localstack.svc.cluster.local:4566"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "kubeconfig_path" {
  type    = string
  default = "~/.kube/config"
}

variable "kube_context" {
  description = "Guards against applying to a non-local cluster."
  type        = string
  default     = "docker-desktop"
}

variable "namespace" {
  type    = string
  default = "product-manager"
}

variable "backend_image" {
  description = "Backend image built on the host; Docker Desktop's cluster pulls it from the host image store. Use a new tag per build so pods roll."
  type        = string
  default     = "product-manager-backend:local"
}

variable "frontend_dist_dir" {
  description = "Angular production build output uploaded to S3."
  type        = string
  default     = "../../frontend/dist/product-manager/browser"
}

variable "app_origin" {
  description = "Browser origin used to reach the edge (kubectl port-forward svc/edge 4200:80)."
  type        = string
  default     = "http://localhost:4200"
}

variable "webauthn_rp_id" {
  type    = string
  default = "localhost"
}

variable "admin_username" {
  type    = string
  default = "admin"
}

variable "postgres_db" {
  type    = string
  default = "product_manager"
}

variable "postgres_user" {
  type    = string
  default = "product_manager"
}
