import { matchingMediaType } from '../../util/Util';
import { PassThrough } from 'stream';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationConverter } from './RepresentationConverter';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';
import { UnsupportedHttpError } from '../../util/errors/UnsupportedHttpError';
import { CONTENT_TYPE_QUADS, DATA_TYPE_BINARY, DATA_TYPE_QUAD } from '../../util/ContentTypes';
import { StreamParser, StreamWriter } from 'n3';

/**
 * Converts `text/turtl`e to/from `internal/quads`.
 * Simple because this could easily support many other types (everything supported by N3.js).
 * Will error if the Representation has no contentType or none of the preferences matches one of the two types.
 */
export class SimpleTurtleQuadConverter extends RepresentationConverter {
  public async canHandle(input: { representation: Representation; preferences: RepresentationPreferences }):
  Promise<void> {
    const inType = input.representation.metadata.contentType;
    if (!inType) {
      throw new UnsupportedHttpError('Input type required for conversion.');
    }
    this.bestMatchingType(input.preferences);
    if (!matchingMediaType(inType, 'text/turtle') && !matchingMediaType(inType, CONTENT_TYPE_QUADS)) {
      throw new UnsupportedHttpError('Can only convert from turtle and quads.');
    }
  }

  public async handle(input: { representation: Representation; preferences: RepresentationPreferences }):
  Promise<Representation> {
    const inType = input.representation.metadata.contentType;
    const outType = this.bestMatchingType(input.preferences);

    if (!inType) {
      throw new UnsupportedHttpError('Input type required for conversion.');
    }
    if (matchingMediaType(inType, outType)) {
      return input.representation;
    }

    if (inType === 'text/turtle') {
      return this.turtleToQuads(input.representation);
    }
    return this.quadsToTurtle(input.representation);
  }

  private bestMatchingType(preferences: RepresentationPreferences): string {
    if (preferences.type) {
      for (const { value, weight } of preferences.type) {
        if (weight > 0) {
          if (matchingMediaType(value, 'text/turtle')) {
            return 'text/turtle';
          }
          if (matchingMediaType(value, CONTENT_TYPE_QUADS)) {
            return CONTENT_TYPE_QUADS;
          }
        }
      }
    } else {
      throw new UnsupportedHttpError('Output type required for conversion.');
    }

    throw new UnsupportedHttpError('Can only convert to turtle and quads.');
  }

  private turtleToQuads(turtle: Representation): Representation {
    const metadata: RepresentationMetadata = { ...turtle.metadata, contentType: CONTENT_TYPE_QUADS };

    // Catch parsing errors and emit correct error
    // Node 10 requires both writableObjectMode and readableObjectMode
    const errorStream = new PassThrough({ writableObjectMode: true, readableObjectMode: true });
    const data = turtle.data.pipe(new StreamParser());
    data.pipe(errorStream);
    data.on('error', (error): boolean => errorStream.emit('error', new UnsupportedHttpError(error.message)));

    return {
      dataType: DATA_TYPE_QUAD,
      data: errorStream,
      metadata,
    };
  }

  private quadsToTurtle(quads: Representation): Representation {
    const metadata: RepresentationMetadata = { ...quads.metadata, contentType: 'text/turtle' };
    return {
      dataType: DATA_TYPE_BINARY,
      data: quads.data.pipe(new StreamWriter({ format: 'text/turtle' })),
      metadata,
    };
  }
}
