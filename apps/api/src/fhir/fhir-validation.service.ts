import { Injectable } from '@nestjs/common';

export interface FhirValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class FhirValidationService {
  validate(resource: any): FhirValidationResult {
    const errors: string[] = [];

    // ── Required base fields ──────────────────────────────────

    if (!resource || typeof resource !== 'object') {
      return { valid: false, errors: ['Resource must be a non-null object'] };
    }

    if (!resource.resourceType || typeof resource.resourceType !== 'string') {
      errors.push('Missing or invalid required field: resourceType (must be a string)');
    }

    if (!resource.id) {
      errors.push('Missing required field: id');
    }

    // ── meta.profile check ────────────────────────────────────

    if (resource.meta !== undefined) {
      if (typeof resource.meta !== 'object' || Array.isArray(resource.meta)) {
        errors.push('Field meta must be an object');
      } else if (
        resource.meta.profile !== undefined &&
        !Array.isArray(resource.meta.profile)
      ) {
        errors.push('Field meta.profile must be an array when present');
      }
    }

    // ── Resource-type-specific validation ─────────────────────

    const rt: string = resource.resourceType ?? '';

    switch (rt) {
      case 'Composition':
        this.validateComposition(resource, errors);
        break;
      case 'PlanDefinition':
        this.validatePlanDefinition(resource, errors);
        break;
      case 'Evidence':
        this.validateEvidence(resource, errors);
        break;
      case 'Citation':
        this.validateCitation(resource, errors);
        break;
      case 'Bundle':
        this.validateBundle(resource, errors);
        break;
      default:
        // Unknown resource type — base checks already applied above
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Per-resource validators ───────────────────────────────

  private validateComposition(resource: any, errors: string[]): void {
    if (!resource.status || typeof resource.status !== 'string') {
      errors.push('Composition: missing or invalid required field: status');
    }

    if (!resource.type || typeof resource.type !== 'object') {
      errors.push('Composition: missing or invalid required field: type');
    } else {
      if (!Array.isArray(resource.type.coding) || resource.type.coding.length === 0) {
        errors.push('Composition: type.coding must be a non-empty array');
      }
    }

    if (!Array.isArray(resource.section)) {
      errors.push('Composition: missing or invalid required field: section (must be an array)');
    }
  }

  private validatePlanDefinition(resource: any, errors: string[]): void {
    if (!resource.status || typeof resource.status !== 'string') {
      errors.push('PlanDefinition: missing or invalid required field: status');
    }

    if (!Array.isArray(resource.action)) {
      errors.push('PlanDefinition: missing or invalid required field: action (must be an array)');
    }
  }

  private validateEvidence(resource: any, errors: string[]): void {
    if (!resource.status || typeof resource.status !== 'string') {
      errors.push('Evidence: missing or invalid required field: status');
    }
  }

  private validateCitation(resource: any, errors: string[]): void {
    if (!resource.status || typeof resource.status !== 'string') {
      errors.push('Citation: missing or invalid required field: status');
    }
  }

  private validateBundle(resource: any, errors: string[]): void {
    if (!resource.type || typeof resource.type !== 'string') {
      errors.push('Bundle: missing or invalid required field: type');
    }

    if (!Array.isArray(resource.entry)) {
      errors.push('Bundle: missing or invalid required field: entry (must be an array)');
    } else {
      const firstEntry = resource.entry[0];
      if (!firstEntry) {
        errors.push('Bundle: entry array must not be empty');
      } else {
        const firstResource = firstEntry.resource;
        if (!firstResource || firstResource.resourceType !== 'Composition') {
          errors.push(
            'Bundle: first entry.resource should be a Composition (document bundle convention)',
          );
        }
      }
    }
  }
}
