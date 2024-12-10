import { Construct } from 'constructs';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { EnvValues } from '../env/env-values';
import { BaseSecurityGroup } from '../base/base-security-group';

export class AppSecurityGroupProps {
  readonly namePrefix: string;
  readonly envValues: EnvValues;
  readonly vpc: Vpc;
}

export class AppSecurityGroups extends Construct {
  public readonly ecsSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: AppSecurityGroupProps) {
    super(scope, id);

    const { namePrefix, vpc } = props;

    // セキュリティグループの作成
    this.ecsSecurityGroup = this.createEcsSecurityGroup(namePrefix, vpc);
  }

  private createEcsSecurityGroup(namePrefix: string, vpc: Vpc): SecurityGroup {
    return new BaseSecurityGroup(this, 'EcsSecurityGroup', {
      vpc,
      securityGroupName: `${namePrefix}-ecs-sg`,
    });
  }
}
