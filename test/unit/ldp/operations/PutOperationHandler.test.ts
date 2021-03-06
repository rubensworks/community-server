import type { Operation } from '../../../../src/ldp/operations/Operation';
import { PutOperationHandler } from '../../../../src/ldp/operations/PutOperationHandler';
import type { ResourceStore } from '../../../../src/storage/ResourceStore';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';

describe('A PutOperationHandler', (): void => {
  const store = {} as unknown as ResourceStore;
  const handler = new PutOperationHandler(store);
  beforeEach(async(): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    store.setRepresentation = jest.fn(async(): Promise<void> => {});
  });

  it('only supports PUT operations.', async(): Promise<void> => {
    await expect(handler.canHandle({ method: 'GET' } as Operation)).rejects.toThrow(UnsupportedHttpError);
    await expect(handler.canHandle({ method: 'PUT' } as Operation)).resolves.toBeUndefined();
  });

  it('sets the representation in the store and returns its identifier.', async(): Promise<void> => {
    await expect(handler.handle({ target: { path: 'url' }, body: {}} as Operation))
      .resolves.toEqual({ identifier: { path: 'url' }});
    expect(store.setRepresentation).toHaveBeenCalledTimes(1);
    expect(store.setRepresentation).toHaveBeenLastCalledWith({ path: 'url' }, {});
  });

  it('errors when there is no body.', async(): Promise<void> => {
    await expect(handler.handle({ method: 'PUT' } as Operation)).rejects.toThrow(UnsupportedHttpError);
  });
});
