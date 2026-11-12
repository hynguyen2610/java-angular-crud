# Angular build hosted as an S3 static website in LocalStack.

locals {
  frontend_files = fileset(var.frontend_dist_dir, "**")

  content_types = {
    css         = "text/css"
    html        = "text/html"
    ico         = "image/x-icon"
    js          = "text/javascript"
    json        = "application/json"
    map         = "application/json"
    png         = "image/png"
    svg         = "image/svg+xml"
    txt         = "text/plain"
    webmanifest = "application/manifest+json"
    woff        = "font/woff"
    woff2       = "font/woff2"
  }

  website_host = "${aws_s3_bucket.frontend.bucket}.s3-website.localhost.localstack.cloud"
}

resource "aws_s3_bucket" "frontend" {
  bucket        = "product-manager-frontend"
  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  index_document {
    suffix = "index.html"
  }

  # Angular routes are client-side; unknown paths fall back to the app shell.
  error_document {
    key = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket                  = aws_s3_bucket.frontend.id
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

resource "aws_s3_bucket_policy" "frontend_public_read" {
  bucket     = aws_s3_bucket.frontend.id
  depends_on = [aws_s3_bucket_public_access_block.frontend]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "PublicReadForWebsite"
      Effect    = "Allow"
      Principal = "*"
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.frontend.arn}/*"
    }]
  })
}

resource "aws_s3_object" "frontend" {
  for_each = local.frontend_files

  bucket       = aws_s3_bucket.frontend.id
  key          = each.value
  source       = "${var.frontend_dist_dir}/${each.value}"
  etag         = filemd5("${var.frontend_dist_dir}/${each.value}")
  content_type = lookup(local.content_types, lower(element(split(".", each.value), length(split(".", each.value)) - 1)), "application/octet-stream")

  # The shell must always be re-fetched so new hashed bundles are picked up.
  cache_control = each.value == "index.html" ? "no-cache" : "public, max-age=31536000, immutable"
}
