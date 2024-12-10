import * as cdk from 'aws-cdk-lib';
import { Aspects, IAspect, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';

class RemovalPolicySetter implements IAspect {
  constructor(private readonly policy: RemovalPolicy) {}

  visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(this.policy);
    }
  }
}

export function setRemovalPolicy(stack: Stack, removalPolicy: RemovalPolicy): void {
  Aspects.of(stack).add(new RemovalPolicySetter(removalPolicy));
}
