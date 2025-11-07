import React from 'react';

type OptimizedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  fallbackSrc,
  onError,
  src,
  ...rest
}) => {
  const handleError = React.useCallback<React.ReactEventHandler<HTMLImageElement>>(
    (event) => {
      if (onError) {
        onError(event);
        return;
      }

      if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
        event.currentTarget.src = fallbackSrc;
      }
    },
    [fallbackSrc, onError]
  );

  return (
    <img
      src={src || fallbackSrc}
      onError={handleError}
      {...rest}
    />
  );
};
