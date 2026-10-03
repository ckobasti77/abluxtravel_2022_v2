import Image, { type ImageProps } from "next/image";

type CmsImageProps = Omit<ImageProps, "src"> & {
  src: string;
};

export default function CmsImage({
  src,
  alt,
  width = 1600,
  height = 900,
  sizes = "100vw",
  unoptimized = true,
  ...props
}: CmsImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      unoptimized={unoptimized}
      {...props}
    />
  );
}
