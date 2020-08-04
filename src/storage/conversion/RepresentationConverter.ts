import { AsyncHandler } from '../../util/AsyncHandler';
import { Representation } from '../../ldp/representation/Representation';
import { RepresentationPreferences } from '../../ldp/representation/RepresentationPreferences';

/**
 * Converts a {@link Representation} from one media type to another, based on the given preferences.
 */
export abstract class RepresentationConverter extends
  AsyncHandler<{ representation: Representation; preferences: RepresentationPreferences}, Representation> { }
