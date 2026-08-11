/**
 * Base type for a client-side rule condition, selected from the camelCase `type` discriminator when
 * deserialising a v4 evaluation response. These types model the wire shape only; client-side
 * evaluation is not implemented yet.
 *
 * A discriminator this version of the provider does not recognise — or an absent one — deserialises
 * to {@link UnknownCondition} rather than failing, so a condition type introduced by a newer server
 * degrades safely on an older client.
 *
 * @internal
 */
export abstract class ClientSideCondition {}
