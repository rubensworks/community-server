import arrayifyStream from 'arrayify-stream';
import { Readable } from 'stream';
import { Representation } from '../../../../src/ldp/representation/Representation';
import { RepresentationPreferences } from '../../../../src/ldp/representation/RepresentationPreferences';
import { SimpleTurtleQuadConverter } from '../../../../src/storage/conversion/SimpleTurtleQuadConverter';
import streamifyArray from 'streamify-array';
import { UnsupportedHttpError } from '../../../../src/util/errors/UnsupportedHttpError';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../../../src/util/ContentTypes';
import { namedNode, triple } from '@rdfjs/data-model';

describe('A SimpleTurtleQuadConverter', (): void => {
  const converter = new SimpleTurtleQuadConverter();

  it('fails on missing types.', async(): Promise<void> => {
    const representation = { metadata: {}} as Representation;
    const preferences: RepresentationPreferences = {};
    await expect(converter.canHandle({ representation, preferences }))
      .rejects.toThrow('Input type required for conversion.');

    representation.metadata.contentType = 'text/turtle';
    await expect(converter.canHandle({ representation, preferences }))
      .rejects.toThrow('Output type required for conversion.');
  });

  it('can handle turtle and quad data.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/turtle' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    await expect(converter.canHandle({ representation, preferences })).resolves.toBeUndefined();

    representation.metadata.contentType = CONTENT_TYPE_QUADS;
    preferences.type = [{ value: 'text/turtle', weight: 0.5 }];
    await expect(converter.canHandle({ representation, preferences })).resolves.toBeUndefined();
  });

  it('can not handle other types.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/plain' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    await expect(converter.canHandle({ representation, preferences }))
      .rejects.toThrow('Can only convert from turtle and quads.');

    representation.metadata.contentType = CONTENT_TYPE_QUADS;
    preferences.type = [{ value: 'text/plan', weight: 0.5 }];
    await expect(converter.canHandle({ representation, preferences }))
      .rejects.toThrow('Can only convert to turtle and quads.');
  });

  it('ignores preferences with weight 0.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/turtle' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 0 }]};
    await expect(converter.canHandle({ representation, preferences }))
      .rejects.toThrow('Can only convert to turtle and quads.');
  });

  it('errors when handling data without content-type.', async(): Promise<void> => {
    const representation = { metadata: { }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    await expect(converter.handle({ representation, preferences }))
      .rejects.toThrow('Input type required for conversion.');
  });

  it('returns the input if the requested type is the same.', async(): Promise<void> => {
    const representation = { metadata: { contentType: 'text/turtle' }} as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/*', weight: 1 }]};
    await expect(converter.handle({ representation, preferences })).resolves.toBe(representation);
  });

  it('can convert quads to text/turtle.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ triple(
        namedNode('http://test.com/s'),
        namedNode('http://test.com/p'),
        namedNode('http://test.com/o'),
      ) ]),
      metadata: { contentType: CONTENT_TYPE_QUADS },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: 'text/turtle', weight: 1 }]};
    const result = await converter.handle({ representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_BINARY,
      metadata: {
        contentType: 'text/turtle',
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toContain(
      '<http://test.com/s> <http://test.com/p> <http://test.com/o>',
    );
  });

  it('can convert text/turtle to quads.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.com/o>.' ]),
      metadata: { contentType: 'text/turtle' },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    const result = await converter.handle({ representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_QUAD,
      metadata: {
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).resolves.toEqualRdfQuadArray([ triple(
      namedNode('http://test.com/s'),
      namedNode('http://test.com/p'),
      namedNode('http://test.com/o'),
    ) ]);
  });

  it('throws an UnsupportedHttpError on invalid triple data.', async(): Promise<void> => {
    const representation = {
      data: streamifyArray([ '<http://test.com/s> <http://test.com/p> <http://test.co' ]),
      metadata: { contentType: 'text/turtle' },
    } as Representation;
    const preferences: RepresentationPreferences = { type: [{ value: CONTENT_TYPE_QUADS, weight: 1 }]};
    const result = await converter.handle({ representation, preferences });
    expect(result).toEqual({
      data: expect.any(Readable),
      dataType: DATA_TYPE_QUAD,
      metadata: {
        contentType: CONTENT_TYPE_QUADS,
      },
    });
    await expect(arrayifyStream(result.data)).rejects.toThrow(UnsupportedHttpError);
  });
});
