provider "neon" {
  api_key = var.neon_api_key
}

provider "aws" {
  region = var.aws_region
}
