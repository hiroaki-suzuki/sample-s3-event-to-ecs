import { Construct } from 'constructs';
import {
  CfnInternetGateway,
  CfnRouteTable,
  IpAddresses,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Tags } from 'aws-cdk-lib';
import { EnvValues } from '../env/env-values';

export interface NetworkProps {
  readonly namePrefix: string;
  readonly envValues: EnvValues;
}

export class Network extends Construct {
  public readonly vpc: Vpc;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);

    const { namePrefix, envValues } = props;

    // VPCの作成
    const vpc = this.createVpc(namePrefix, envValues);

    // サブネットの名称変更
    this.renameSubnet(namePrefix, vpc);

    // IGWの名称変更
    this.renameIGW(namePrefix, vpc);

    this.vpc = vpc;
  }

  private createVpc(namePrefix: string, envValues: EnvValues): Vpc {
    return new Vpc(this, 'Vpc', {
      vpcName: `${namePrefix}-vpc`,
      ipAddresses: IpAddresses.cidr(envValues.vpcCidr),
      maxAzs: 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });
  }

  private renameSubnet(namePrefix: string, vpc: Vpc) {
    vpc.publicSubnets.forEach((subnet, index) => {
      const no = index + 1;
      Tags.of(subnet).add('Name', `${namePrefix}-public-subnet-${no}`);

      const rtb = subnet.node.findChild('RouteTable') as CfnRouteTable;
      Tags.of(rtb).add('Name', `${namePrefix}-public-rtb-${no}-rtb`);
    });
  }

  private renameIGW(namePrefix: string, vpc: Vpc) {
    const igw = vpc.node.findChild('IGW') as CfnInternetGateway;
    Tags.of(igw).add('Name', `${namePrefix}-igw`);
  }
}
