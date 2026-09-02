/**
 * One app screen.
 *
 * The screenshots carry the page now that the 3D backdrop is gone, so they
 * ship as WebP at two widths and let the browser pick. `sizes` describes how
 * wide the image is actually drawn — without it the browser assumes full
 * viewport width and fetches the 2x file every time.
 *
 * They are exported with their own rounded corners on transparency, so there
 * is no device frame here: a drop shadow is what lifts them off the page.
 */
export default function Shot({ img, alt, sizes = '(max-width: 720px) 60vw, 380px', className = '', priority = false }) {
  return (
    <img
      className={`cn-shot ${className}`}
      src={`${img}.webp`}
      srcSet={`${img}.webp 560w, ${img}@2x.webp 1120w`}
      sizes={sizes}
      alt={alt}
      width="560"
      height="1212"
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}
