import { Stack, Tags } from 'aws-cdk-lib';

export interface CommonTag {
  readonly project: string;
  readonly env: string;
}

export function addCommonTags(stack: Stack, commonTag: CommonTag): void {
  Tags.of(stack).add('Project', commonTag.project);
  Tags.of(stack).add('Env', commonTag.env);
}
