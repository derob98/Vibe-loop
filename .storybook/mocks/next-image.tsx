import React from "react";

interface ImageProps {
  src: string | { src: string };
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
}

const Image = ({ src, alt, fill, width, height, className, style }: ImageProps) => {
  const resolvedSrc = typeof src === "string" ? src : src?.src ?? "";
  const imgStyle: React.CSSProperties = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }
    : style ?? {};
  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={imgStyle}
    />
  );
};

export default Image;
