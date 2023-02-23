variable "instance_type" {
    type        = string
    description = "Type of the AWS instance"
}

variable "region" {
    type        = string
    description = "AWS region which is closest"
}

variable "profile" {
    type        = string
    description = "AWS working profile"
}

variable "ami_filter_name" {
    type        = string
    description = "Name of the AMI filter"
}

variable "device_type" {
    type        = string
    description = "Device type"
}

variable "virtual_type" {
    type        = string
    description = "Virtual Machine"
}

variable "ami_name" {
    type        = string
    description = "Name of the AMI"
}

variable "ssh_username" {
    type        = string
    description = "Name of the SSH user"
}

variable "ssh_timeout" {
    type        = string
    description = "SSH timeout"
}

variable "ami_user" {
    type        = string
    description = "User of the AMI"
}

variable "owner" {
    type        = string
    description = "Owner"
}