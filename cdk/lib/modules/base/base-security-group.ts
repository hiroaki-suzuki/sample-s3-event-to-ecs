import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { SecurityGroupProps } from 'aws-cdk-lib/aws-ec2/lib/security-group';
import { Tags } from 'aws-cdk-lib';

export interface BaseSecurityGroupProps extends SecurityGroupProps {
  readonly securityGroupName: string;
}

export class BaseSecurityGroup extends SecurityGroup {
  constructor(scope: Construct, id: string, props: BaseSecurityGroupProps) {
    super(scope, id, props);

    Tags.of(this).add('Name', props.securityGroupName);
  }
}
