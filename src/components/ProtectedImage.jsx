import { useEffect, useState } from "react";
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

  useEffect(() => {
    let active = true;
    let localObjectUrl = "";

    const load = async () => {
      if (!src) {
        setObjectUrl("");
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
          onAuthError?.(error);
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
  }, [onAuthError, src]);

  if (!objectUrl || failed) {
    return <div aria-hidden="true" className={placeholderClassName || className} />;
  }

  return <img src={objectUrl} alt={alt} className={className} onLoad={onLoad} />;
};
