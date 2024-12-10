import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export interface S3Props {
  readonly namePrefix: string;
}

export class S3 extends Construct {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props: S3Props) {
    super(scope, id);

    const { namePrefix } = props;

    // S3バケットを作成
    this.bucket = this.createBucket(namePrefix);
  }

  private createBucket(namePrefix: string): Bucket {
    return new Bucket(this, 'Bucket', {
      bucketName: `${namePrefix}-bucket`,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      eventBridgeEnabled: true,
      lifecycleRules: [
        {
          id: 'DeleteObjects',
          enabled: true,
          expiration: Duration.days(1),
          noncurrentVersionExpiration: Duration.days(2),
          abortIncompleteMultipartUploadAfter: Duration.days(3),
        },
      ],
      autoDeleteObjects: true,
    });
  }
}
