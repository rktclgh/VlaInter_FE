import { useEffect, useRef, useState } from "react";
import { fetchProtectedResource, isAuthenticationError } from "../lib/apiClient";

export const ProtectedImage = ({
  src,
  alt,
  className = "",
  placeholderClassName = "",
  onAuthError,
  onLoad,
}) => {
  const [objectUrl, setObjectUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const onAuthErrorRef = useRef(onAuthError);

  useEffect(() => {
    onAuthErrorRef.current = onAuthError;
  }, [onAuthError]);

  useEffect(() => {
    let active = true;
    let localObjectUrl = "";

    const load = async () => {
      setObjectUrl("");
      if (!src) {
        setFailed(true);
        return;
      }
      try {
        setFailed(false);
        const blob = await fetchProtectedResource(src);
        if (!active) return;
        localObjectUrl = URL.createObjectURL(blob);
        setObjectUrl(localObjectUrl);
      } catch (error) {
        if (!active) return;
        setObjectUrl("");
        setFailed(true);
        if (isAuthenticationError(error)) {
          onAuthErrorRef.current?.(error);
        }
      }
    };

    void load();
    return () => {
      active = false;
      if (localObjectUrl) {
        URL.revokeObjectURL(localObjectUrl);
      }
    };
  }, [src]);

  if (failed) {
    return <div aria-hidden="true" className={placeholderClassName || className} />;
  }

  if (!objectUrl) {
    return (
      <div
        aria-busy="true"
        className={`${placeholderClassName || className} animate-pulse bg-[#f3f4f6]`}
      />
    );
  }

  return <img src={objectUrl} alt={alt} className={className} onLoad={onLoad} />;
};
