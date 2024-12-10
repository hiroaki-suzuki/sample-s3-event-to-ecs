import { LogGroupProps } from 'aws-cdk-lib/aws-logs/lib/log-group';
import { Construct } from 'constructs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class BaseLogGroup extends LogGroup {
  constructor(scope: Construct, id: string, props: LogGroupProps) {
    super(scope, id, {
      retention: RetentionDays.FIVE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
      ...props,
    });
  }
}
