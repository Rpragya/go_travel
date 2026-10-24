import { useState, type ImgHTMLAttributes } from 'react'
import { placeholderImage } from '@/lib/utils'

/** Image that falls back to a seeded placeholder if the source is missing or fails to load. */
export function Img({ src, seed, alt, ...rest }: ImgHTMLAttributes<HTMLImageElement> & { seed: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={!src || failed ? placeholderImage(seed) : src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
