import { ImgHTMLAttributes, useEffect, useState } from 'react';
import { fetchPrivateExerciseImage, privateExerciseImageFilename } from '@/lib/exerciseMediaClient';

interface ExerciseImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  imageUrl: string;
  fallbackUrl?: string;
}

const ExerciseImage = ({ imageUrl, fallbackUrl = '/placeholder.svg', ...props }: ExerciseImageProps) => {
  const privateFilename = privateExerciseImageFilename(imageUrl);
  const [src, setSrc] = useState(
    privateFilename ? fallbackUrl : imageUrl,
  );

  useEffect(() => {
    if (!privateFilename) {
      setSrc(imageUrl);
      return;
    }

    const controller = new AbortController();
    let objectUrl: string | undefined;
    setSrc(fallbackUrl);
    fetchPrivateExerciseImage(privateFilename, controller.signal)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(error => {
        if (error instanceof Error && error.name === 'AbortError') return;
        setSrc(fallbackUrl);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fallbackUrl, imageUrl, privateFilename]);

  return <img {...props} src={src} onError={event => {
    if (event.currentTarget.src !== fallbackUrl) event.currentTarget.src = fallbackUrl;
    props.onError?.(event);
  }} />;
};

export default ExerciseImage;
