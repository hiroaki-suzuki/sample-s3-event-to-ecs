import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { EventField, Rule } from 'aws-cdk-lib/aws-events';
import { EcsTask } from 'aws-cdk-lib/aws-events-targets';
import { SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { Cluster, TaskDefinition } from 'aws-cdk-lib/aws-ecs';
import {
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';

export interface EventBridgeProps {
  readonly namePrefix: string;
  readonly bucket: Bucket;
  readonly securityGroups: SecurityGroup[];
  readonly cluster: Cluster;
  readonly taskDefinition: TaskDefinition;
  readonly appEntryFilePath: string;
}

export class EventBridge extends Construct {
  constructor(scope: Construct, id: string, props: EventBridgeProps) {
    super(scope, id);

    const { namePrefix, bucket, securityGroups, cluster, taskDefinition, appEntryFilePath } = props;

    // ロールの作成
    const ruleRole = this.createRuleRole(namePrefix, cluster, taskDefinition);

    // ルールの作成
    this.createRule(
      namePrefix,
      bucket,
      securityGroups,
      cluster,
      taskDefinition,
      ruleRole,
      appEntryFilePath,
    );

    // デフォルトポリシーを削除
    ruleRole.node.tryRemoveChild('DefaultPolicy');
  }

  private createRuleRole(
    namePrefix: string,
    cluster: Cluster,
    taskDefinition: TaskDefinition,
  ): Role {
    const account = cdk.Stack.of(this).account;
    const region = cdk.Stack.of(this).region;
    return new Role(this, 'RuleRole', {
      roleName: `${namePrefix}-rule-role`,
      assumedBy: new ServicePrincipal('events.amazonaws.com'),
      inlinePolicies: {
        'allow-run-task': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['ecs:RunTask'],
              resources: [taskDefinition.taskDefinitionArn],
              conditions: {
                ArnEquals: {
                  'ecs:cluster': cluster.clusterArn,
                },
              },
            }),
          ],
        }),
        'allow-pass-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['iam:PassRole'],
              resources: [taskDefinition.executionRole!.roleArn, taskDefinition.taskRole!.roleArn],
            }),
          ],
        }),
        'allow-tag-resource': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['ecs:TagResource'],
              resources: [`arn:aws:ecs:${region}:${account}:task/${cluster.clusterName}/*`],
            }),
          ],
        }),
      },
    });
  }

  private createRule(
    namePrefix: string,
    bucket: Bucket,
    securityGroups: SecurityGroup[],
    cluster: Cluster,
    taskDefinition: TaskDefinition,
    ruleRole: Role,
    appEntryFilePath: string,
  ): Rule {
    return new Rule(this, 'Rule', {
      ruleName: `${namePrefix}-rule`,
      enabled: true,
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['Object Created'],
        detail: {
          bucket: {
            name: [bucket.bucketName],
          },
          object: {
            key: [{ prefix: 'input/' }],
            size: [{ numeric: ['>', 0] }],
          },
        },
      },
      targets: [
        new EcsTask({
          cluster: cluster,
          taskDefinition: taskDefinition,
          role: ruleRole,
          taskCount: 1,
          containerOverrides: [
            {
              containerName: taskDefinition.defaultContainer!.containerName,
              command: [appEntryFilePath, EventField.fromPath('$.detail.object.key')],
            },
          ],
          subnetSelection: { subnetType: SubnetType.PUBLIC },
          securityGroups: securityGroups,
          assignPublicIp: true,
        }),
      ],
    });
  }
}
