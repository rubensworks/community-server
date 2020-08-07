import { Operation } from '../operations/Operation';
import { PermissionSet } from './PermissionSet';
import { PermissionsExtractor } from './PermissionsExtractor';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';

/**
 * Generates permissions for the base set of methods that always require the same permissions.
 * Specifically: GET, HEAD, POST, PUT and DELETE.
 */
export class BasePermissionsExtractor extends PermissionsExtractor {
  public async canHandle(input: Operation): Promise<void> {
    if (![ 'HEAD', 'GET', 'POST', 'PUT', 'DELETE' ].includes(input.method)) {
      throw new UnsupportedHttpError('Only HEAD, GET, POST, PUT and DELETE are supported.');
    }
  }

  public async handle(input: Operation): Promise<PermissionSet> {
    const result = {
      read: input.method === 'HEAD' || input.method === 'GET',
      append: false,
      write: input.method === 'POST' || input.method === 'PUT' || input.method === 'DELETE',
    };
    result.append = result.write;
    return result;
  }
}
