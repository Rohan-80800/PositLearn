import { useState } from "react";
import { Avatar } from "antd";
import { Colors } from "../config/color";

const AvatarWithFallback = ({
  src,
  alt,
  fallbackText,
  className = "",
  size,
  shape,
}) => {
  const [hasError, setHasError] = useState(false);
  const colors = Colors();

  return (
    <Avatar
      src={!hasError ? src : null}
      alt={alt}
      onError={() => setHasError(true)}
      size={size}
      shape={shape}
       className={`font-bold !text-sm ${className}`}
      style={
        !hasError && src
          ? {}
          : { backgroundColor: colors.secondcolor, color: colors.initialtext}
      }
    >
      {fallbackText}
    </Avatar>
  );
};


export default AvatarWithFallback;
