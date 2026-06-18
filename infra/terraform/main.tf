terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "drawings" {
  bucket = var.s3_bucket_name
}

resource "aws_sqs_queue" "jobs_dlq" {
  name = "${var.name_prefix}-jobs-dlq"
}

resource "aws_sqs_queue" "jobs" {
  name                       = "${var.name_prefix}-jobs"
  visibility_timeout_seconds = 900
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.jobs_dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.private_subnet_ids
}

resource "aws_db_instance" "postgres" {
  identifier             = "${var.name_prefix}-postgres"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = var.db_instance_class
  db_name                = "auto_estimator"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  skip_final_snapshot    = true
  publicly_accessible    = false
  vpc_security_group_ids = var.db_security_group_ids
}

resource "aws_ecr_repository" "orchestrator" {
  name = "${var.name_prefix}/orchestrator"
}

resource "aws_ecr_repository" "detector" {
  name = "${var.name_prefix}/detector"
}

resource "aws_secretsmanager_secret" "worker_webhook_secret" {
  name = "${var.name_prefix}/worker-webhook-secret"
}

output "s3_bucket" {
  value = aws_s3_bucket.drawings.bucket
}

output "sqs_queue_url" {
  value = aws_sqs_queue.jobs.url
}

output "orchestrator_repository_url" {
  value = aws_ecr_repository.orchestrator.repository_url
}
