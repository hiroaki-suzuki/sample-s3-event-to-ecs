import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EnvValues } from './modules/env/env-values';
import { Network } from './modules/network/network';
import { setRemovalPolicy } from './modules/aspect/removal-policy-setter';
import { addCommonTags } from './modules/aspect/common-tag-setter';
import { S3 } from './modules/batch/s3';
import { EventBridge } from './modules/batch/event-bridge';
import { AppSecurityGroups } from './modules/network/app-security-group';
import { Ecs } from './modules/batch/ecs';

export interface CdkStackProps extends cdk.StackProps {
  readonly namePrefix: string;
  readonly envValues: EnvValues;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CdkStackProps) {
    super(scope, id, props);

    const { namePrefix, envValues } = props;

    // ネットワークの作成
    const network = new Network(this, 'Network', {
      namePrefix,
      envValues,
    });

    // セキュリティグループの作成
    const securityGroup = new AppSecurityGroups(this, 'AppSecurityGroups', {
      namePrefix,
      envValues,
      vpc: network.vpc,
    });

    // S3バケットの作成
    const s3 = new S3(this, 'S3', {
      namePrefix,
    });

    // ECSの作成
    const appEntryFilePath = '/usr/src/app/lib/index.js';
    const ecs = new Ecs(this, 'Ecs', {
      namePrefix,
      vpc: network.vpc,
      bucket: s3.bucket,
      appEntryFilePath,
    });

    // EventBridgeの作成
    new EventBridge(this, 'EventBridge', {
      namePrefix,
      bucket: s3.bucket,
      securityGroups: [securityGroup.ecsSecurityGroup],
      cluster: ecs.cluster,
      taskDefinition: ecs.taskDefinition,
      appEntryFilePath,
    });

    setRemovalPolicy(this, RemovalPolicy.DESTROY);
    addCommonTags(this, { project: namePrefix, env: envValues.env });
  }
}
