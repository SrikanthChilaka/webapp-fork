locals {
    timestamp = regex_replace(timestamp(), "[- TZ:]", "")
}

source "amazon-ebs" "amazon-linux-2" {
    ami_name      = "${var.ami_name}-${local.timestamp}"
    instance_type = var.instance_type
    region        = var.region
    profile       = var.profile
    source_ami_filter {
        filters = {
            name                = var.ami_filter_name
            root-device-type    = var.device_type
            virtualization-type = var.virtual_type
        }
        most_recent = true
        owners      = [var.owner]
    }
    ami_users = [var.ami_user]
    ssh_username = var.ssh_username
    ssh_timeout  = var.ssh_timeout
    associate_public_ip_address = true
}

build {
    sources = ["source.amazon-ebs.amazon-linux-2"]
    provisioner "file" {
        source = "./webapp.zip"
        destination = "/home/ec2-user/webapp.zip"
    }

    provisioner "file" {
    source      = "./config.json"
    destination = "/tmp/config.json"
  }

    # provisioner "file" {
    #     source = "./webapp.service"
    #     destination = "/tmp/webapp.service"
    # }

    provisioner "shell" {
        script = "webshell.sh"
    }
}