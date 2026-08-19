import { useId } from 'react'
import { sanitizeAvatar, isHuman } from '../lib/avatar/config'
import type { Json } from '../types/database.types'
import {
  BrowsLayer,
  EarsLayer,
  EyesLayer,
  EyewearLayer,
  FaceLayer,
  HairBack,
  HairFront,
  HeadwearLayer,
  MouthLayer,
  Neck,
  NeckwearLayer,
  TopLayer,
} from '../lib/avatar/parts'
import { CreatureCharacter } from '../lib/avatar/creatures'

export function Avatar({
  config,
  size = 40,
  ring,
  title,
  className,
}: {
  config: Json | null | undefined
  size?: number
  ring?: string | null
  title?: string
  className?: string
}) {
  const cfg = sanitizeAvatar(config)
  const clipId = useId().replace(/:/g, '')

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={title || 'Avatar'}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={`clip-${clipId}`}>
          <circle cx="50" cy="50" r="47" />
        </clipPath>
      </defs>

      {/* Bakgrund (ljus, med tonad personlig färg om angiven) */}
      <circle cx="50" cy="50" r="49" fill="#ffffff" />
      {ring && <circle cx="50" cy="50" r="49" fill={ring} opacity="0.14" />}

      <g clipPath={`url(#clip-${clipId})`}>
        {isHuman(cfg.kind) ? (
          <>
            <HairBack style={cfg.hair} color={cfg.hairColor} />
            <TopLayer style={cfg.top} color={cfg.topColor} />
            <Neck skin={cfg.skin} />
            <NeckwearLayer style={cfg.neckwear} color={cfg.neckwearColor} />
            <FaceLayer shape={cfg.face} skin={cfg.skin} />
            <EarsLayer skin={cfg.skin} />
            <BrowsLayer style={cfg.brows} />
            <EyesLayer style={cfg.eyes} />
            <MouthLayer style={cfg.mouth} />
            <EyewearLayer style={cfg.eyewear} />
            <HairFront style={cfg.hair} color={cfg.hairColor} />
            <HeadwearLayer style={cfg.headwear} color={cfg.headwearColor} />
          </>
        ) : (
          <CreatureCharacter kind={cfg.kind} bodyColor={cfg.bodyColor} eyes={cfg.eyes} />
        )}
      </g>

      {/* Ring i personlig färg (identitet i kalendern) */}
      <circle
        cx="50"
        cy="50"
        r="48"
        fill="none"
        stroke={ring || '#d3dae2'}
        strokeWidth={ring ? 3 : 1.5}
      />
    </svg>
  )
}
