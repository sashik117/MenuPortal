type DishPhotoProps = {
  alt: string
  className?: string
  src: string | null
}

export function DishPhoto({ alt, className = '', src }: DishPhotoProps) {
  return (
    <img
      src={src || '/favicon.svg'}
      alt={alt}
      className={`aspect-[4/5] w-full rounded-md bg-neutral-100 object-cover ${className}`}
    />
  )
}
