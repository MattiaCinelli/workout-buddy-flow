import { ImgHTMLAttributes, useEffect, useState } from 'react';
import {
  fetchPrivateExerciseImage,
  privateExerciseImageFilename,
  subscribePrivateExerciseImageAvailable,
} from '@/lib/exerciseMediaClient';

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
    const load = () => {
      fetchPrivateExerciseImage(privateFilename, controller.signal)
        .then(blob => {
          const nextObjectUrl = URL.createObjectURL(blob);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          objectUrl = nextObjectUrl;
          setSrc(nextObjectUrl);
        })
        .catch(error => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setSrc(fallbackUrl);
        });
    };
    setSrc(fallbackUrl);
    load();
    const unsubscribe = subscribePrivateExerciseImageAvailable(filename => {
      if (filename === privateFilename) load();
    });

    return () => {
      unsubscribe();
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
