import { SetMetadata } from '@nestjs/common';

export const ENTITY_TYPE_KEY = 'entityType';

export type RbacEntityType =
  | 'guideline'
  | 'recommendation'
  | 'pico'
  | 'section'
  | 'outcome'
  | 'poll'
  | 'milestone'
  | 'coi'
  | 'checklistItem';

export const EntityType = (type: RbacEntityType) =>
  SetMetadata(ENTITY_TYPE_KEY, type);
