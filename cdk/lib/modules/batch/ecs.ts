import { Construct } from 'constructs';
import {
  Cluster,
  ContainerDefinition,
  ContainerImage,
  CpuArchitecture,
  FargateTaskDefinition,
  LogDriver,
  OperatingSystemFamily,
  TaskDefinition,
} from 'aws-cdk-lib/aws-ecs';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { RemovalPolicy } from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { BaseLogGroup } from '../base/base-log-group';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import {
  Effect,
  ManagedPolicy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as path from 'node:path';
import { DockerImageName, ECRDeployment } from 'cdk-ecr-deployment';

export interface EcsProps {
  readonly namePrefix: string;
  readonly vpc: IVpc;
  readonly bucket: Bucket;
  readonly appEntryFilePath: string;
}

export class Ecs extends Construct {
  public readonly cluster: Cluster;
  public readonly taskDefinition: TaskDefinition;

  constructor(scope: Construct, id: string, props: EcsProps) {
    super(scope, id);

    const { namePrefix, vpc, bucket, appEntryFilePath } = props;

    // リポジトリの作成
    const repository = this.createRepository(namePrefix);

    // イメージのデプロイ
    this.deployImage(namePrefix, repository);

    // クラスターの作成
    this.cluster = this.createCluster(namePrefix, vpc);

    // ロググループの作成
    const logGroup = this.createLogGroup(namePrefix);

    // タスクロールの作成
    const taskRole = this.createTaskRole(namePrefix, bucket, logGroup);

    // タスク実行ロールの作成
    const executionRole = this.createExecutionTole(namePrefix);

    // タスク定義の作成
    this.taskDefinition = this.createFargateTaskDefinition(namePrefix, taskRole, executionRole);

    // コンテナ定義の作成
    this.createContainerDefinition(
      namePrefix,
      this.taskDefinition,
      repository,
      logGroup,
      bucket,
      appEntryFilePath,
    );
  }

  private createRepository(namePrefix: string): Repository {
    return new Repository(this, 'Repository', {
      repositoryName: `${namePrefix}-repository`,
      removalPolicy: RemovalPolicy.DESTROY,
      emptyOnDelete: true,
      imageScanOnPush: true,
    });
  }

  private deployImage(namePrefix: string, repository: Repository): void {
    const image = new DockerImageAsset(this, 'BatchImage', {
      assetName: `${namePrefix}-batch-image`,
      directory: path.join(__dirname, '..', '..', '..', '..', 'app'),
      platform: Platform.LINUX_AMD64,
    });

    new ECRDeployment(this, `${namePrefix}-batch-ecr-deploy`, {
      src: new DockerImageName(image.imageUri),
      dest: new DockerImageName(`${repository.repositoryUri}:latest`),
    });
  }

  private createCluster(namePrefix: string, vpc: IVpc): Cluster {
    return new Cluster(this, 'Cluster', {
      clusterName: `${namePrefix}-cluster`,
      enableFargateCapacityProviders: true,
      containerInsights: true,
      vpc,
    });
  }

  private createLogGroup(namePrefix: string): LogGroup {
    return new BaseLogGroup(this, 'ContainerLogGroup', {
      logGroupName: `/ecs/${namePrefix}-task-log`,
    });
  }

  private createTaskRole(namePrefix: string, bucket: Bucket, logGroup: LogGroup): Role {
    return new Role(this, 'EcsTaskRole', {
      roleName: `${namePrefix}-ecs-task-role`,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        'allow-s3': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetObject*', 's3:PutObject*'],
              resources: [`${bucket.bucketArn}/*`],
            }),
          ],
        }),
        'allow-logs': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['logs:PutLogEvents', 'logs:CreateLogGroup', 'logs:CreateLogStream'],
              resources: [`${logGroup.logGroupArn}`, `${logGroup.logGroupArn}:*`],
            }),
          ],
        }),
      },
    });
  }

  private createExecutionTole(namePrefix: string): Role {
    return new Role(this, 'EcsExecutionRole', {
      roleName: `${namePrefix}-ecs-execution-role`,
      assumedBy: new ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });
  }

  private createFargateTaskDefinition(
    namePrefix: string,
    taskRole: Role,
    executionRole: Role,
  ): FargateTaskDefinition {
    return new FargateTaskDefinition(this, 'TaskDefinition', {
      family: `${namePrefix}-task-def`,
      runtimePlatform: {
        operatingSystemFamily: OperatingSystemFamily.LINUX,
        cpuArchitecture: CpuArchitecture.X86_64,
      },
      cpu: 1024,
      memoryLimitMiB: 2048,
      taskRole: taskRole,
      executionRole: executionRole,
    });
  }

  private createContainerDefinition(
    namePrefix: string,
    taskDefinition: TaskDefinition,
    repository: Repository,
    logGroup: LogGroup,
    bucket: Bucket,
    appEntryFilePath: string,
  ): ContainerDefinition {
    // バッチ
    return new ContainerDefinition(this, 'BatchContainerDefinition', {
      taskDefinition,
      containerName: `${namePrefix}-container`,
      image: ContainerImage.fromEcrRepository(repository, 'latest'),
      cpu: 1024,
      memoryReservationMiB: 2048,
      memoryLimitMiB: 2048,
      environment: {
        APP_S3_BUCKET_NAME: bucket.bucketName,
      },
      logging: LogDriver.awsLogs({
        logGroup,
        streamPrefix: 'ecs',
      }),
      command: [appEntryFilePath],
    });
  }
}
