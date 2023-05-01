import { Config, Output } from '@pulumi/pulumi';
import { subDays } from 'date-fns';

export interface GetTokenOptions {
  /**
   * Config name to use
   *
   * @example
   * ```typescript
   * const npmToken = getToken({ name: 'npm-token' });
   * const npmToken = getToken({ name: 'github-token' });
   * ```
   */
  name: string;

  /**
   * Config namespace
   *
   * This function uses `pulumi.Config` under the hood,
   * so you can use this option to specify the namespace
   * to use.
   *
   * @example
   * ```typescript
   * const npmToken = getToken({ name: 'npm-token', namespace: 'my-namespace' });
   * ```
   *
   * The example above will resolve to `my-namespace:npm-token`.
   */
  namespace?: string;

  /**
   * How many days before the token expires
   * we fail to promote renewing
   * @default 10
   **/
  expiryDays?: number;
}

/**
 * Get a token from pulumi config
 * and fail if it expires in less than 10 days
 *
 * @example
 * ```typescript
 * import { getToken } from 'get-pulumi-token';
 *
 * const token = getToken('github-token');
 * ```
 *
 * @example
 * ```typescript
 * import { getToken } from 'get-pulumi-token';
 *
 * const token = getToken({ name: 'github-token', namespace: 'my-namespace' });
 * ```
 *
 * @param opts GetTokenOptions or string
 * @returns pulumi.Output<string>
 */
export function getToken(opts: GetTokenOptions | string): Output<string> {
  const options = typeof opts === 'string' ? { name: opts } : opts;
  const { name, namespace, expiryDays = 10 } = options;

  const config = new Config(namespace);

  const expirtyDateRaw = config.requireSecret(`${name}-expires-at`);

  return expirtyDateRaw.apply(expiry => {
    const expiryDate = new Date(expiry);
    const minus10Days = subDays(new Date(), expiryDays);

    if (expiryDate < minus10Days) {
      throw new Error(
        `Token for ${name} expires on ${expiryDate}. Failing to promote renewing!`,
      );
    }

    return config.requireSecret(name);
  });
}
