/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-workbench`.
 * @module @deepseek-ai/dsh-client-ui-workbench/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-workbench'

/** Cordis companion plugin name. */
export const name = 'client-ui-workbench-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package owns one presentation-only slot entry and
 * locale registration whose reversible lifecycles are covered by the client
 * assembly tests. It emits no events and owns no mutable cross-plugin state.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
