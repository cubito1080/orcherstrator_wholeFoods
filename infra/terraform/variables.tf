variable "name_prefix" {
  type    = string
  default = "auto-estimator"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "s3_bucket_name" {
  type = string
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "db_security_group_ids" {
  type    = list(string)
  default = []
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_username" {
  type    = string
  default = "auto_estimator"
}

variable "db_password" {
  type      = string
  sensitive = true
}
