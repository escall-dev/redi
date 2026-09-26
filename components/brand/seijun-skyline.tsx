import * as React from "react"
import { SeijunMeadow, SeijunMeadowProps } from "./seijun-meadow"

export type SeijunSkylineProps = SeijunMeadowProps

/**
 * @deprecated Replaced by SeijunMeadow to align with the tulip brand identity.
 */
export function SeijunSkyline(props: SeijunSkylineProps) {
  return <SeijunMeadow {...props} />
}

