#!/bin/bash
asg_name="webapp_asg"

# Check if the autoscaling group exists
asg_exists=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg_name --query "length(AutoScalingGroups)")

if [ "$asg_exists" -eq 0 ]; then
  echo "Autoscaling group $asg_name not found. Exiting."
  exit 1
else

# Get the latest AMI ID
latest_ami=$(aws ec2 describe-images \
--owners self \
--filters "Name=state,Values=available" "Name=architecture,Values=x86_64" "Name=root-device-type,Values=ebs" \
--query "reverse(sort_by(Images, &CreationDate))[0].ImageId" \
)
echo "The latest AMI is: $latest_ami"

# Update the launch template with the latest AMI
aws ec2 create-launch-template-version \
--launch-template-name asg-launch-template \
--source-version 1 \
--launch-template-data '{"ImageId":'$latest_ami'}'

# Refresh instances in the autoscaling group
aws autoscaling start-instance-refresh \
--auto-scaling-group-name $asg_name

fi